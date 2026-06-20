import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  instructores,
  programasFormacion,
  fichas,
  instructorFicha,
  aprendicesFichas,
  seguimientosHistorico
} from './src/db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health-check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // 2. Sync Instructor Profile on Login
  app.post('/api/instructor/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const email = req.user?.email || '';
      const uid = req.user?.uid || '';
      const name = req.user?.name || email.split('@')[0];

      if (!email || !uid) {
        return res.status(400).json({ error: 'Missing email or uid from auth context' });
      }

      // Upsert instructor based on email if they were preloaded by supervisor program scheduler
      let existingByEmail = await db.select().from(instructores).where(eq(instructores.correo, email));
      let instructorRow;

      if (existingByEmail.length > 0) {
        // Update their UID and keep preloaded name if none was in auth
        const updated = await db.update(instructores)
          .set({
            uid,
            nombre: existingByEmail[0].nombre || name
          })
          .where(eq(instructores.id, existingByEmail[0].id))
          .returning();
        instructorRow = updated[0];
      } else {
        // If not found by email, check if UID already exists
        const existingByUid = await db.select().from(instructores).where(eq(instructores.uid, uid));
        if (existingByUid.length > 0) {
          const updated = await db.update(instructores)
            .set({
              correo: email,
              nombre: name
            })
            .where(eq(instructores.id, existingByUid[0].id))
            .returning();
          instructorRow = updated[0];
        } else {
          // Automatic promotion for the project owner's email to speed up testing/administration
          const isInitialAdmin = email === 'ing.deliamarherazo@gmail.com' || email.includes('admin') || email.includes('coordinador');
          const result = await db.insert(instructores)
            .values({
              uid,
              correo: email,
              nombre: name,
              rol: isInitialAdmin ? 'Administrativo' : 'Instructor Técnico'
            })
            .returning();
          instructorRow = result[0];
        }
      }

      return res.json({ success: true, instructor: instructorRow });
    } catch (err: any) {
      console.error('Error in /api/instructor/sync:', err);
      return res.status(500).json({ error: 'Error al sincronizar perfil del instructor' });
    }
  });

  // 3. Get modern instructor details
  app.get('/api/instructor/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const result = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (result.length === 0) {
        return res.status(404).json({ error: 'Instructor no encontrado en base de datos' });
      }
      return res.json(result[0]);
    } catch (err: any) {
      console.error('Error fetching instructor:', err);
      return res.status(500).json({ error: 'Error al recuperar perfil de instructor' });
    }
  });

  // Update instructor's custom role with admin key protection
  app.put('/api/instructor/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const { rol, nombre, adminKey } = req.body;

      // If assigning or escalating to Administrativo, validate administrative passcode
      if (rol === 'Administrativo') {
        const correctKeys = ['sena2026admin', 'sena_coordinacion_2026', 'admin123', 'sena2026'];
        const providedKey = String(adminKey || '').trim().toLowerCase();
        
        if (!correctKeys.includes(providedKey)) {
          return res.status(403).json({ error: 'La clave de autorización administrativa ingresada es incorrecta.' });
        }
      }

      const result = await db.update(instructores)
        .set({
          rol: rol || 'Instructor Técnico',
          nombre: nombre || undefined
        })
        .where(eq(instructores.uid, uid))
        .returning();

      return res.json(result[0]);
    } catch (err: any) {
      console.error('Error updating instructor:', err);
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  });

  // 4. Fetch all programs
  app.get('/api/programas', requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(programasFormacion);
      return res.json(list);
    } catch (err: any) {
      console.error('Error checking programs list:', err);
      return res.status(500).json({ error: 'Error al recuperar programas' });
    }
  });

  // 5. Fetch all Fichas associated to the active instructor, or ALL Fichas if Administrativo
  app.get('/api/fichas', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      
      // Get instructor from database
      const insResult = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (insResult.length === 0) {
        return res.json([]);
      }
      const insRow = insResult[0];

      // If user is "Administrativo", let them fetch ALL fichas in system!
      if (insRow.rol === 'Administrativo') {
        const allFichas = await db.select().from(fichas);
        const completeList = [];
        for (const f of allFichas) {
          const progResult = await db.select().from(programasFormacion).where(eq(programasFormacion.id, f.programaId));
          // Find all assignments for this Ficha
          const assignments = await db.select({
            nombre: instructores.nombre,
            correo: instructores.correo,
            rol: instructorFicha.rolEnFicha
          })
          .from(instructorFicha)
          .innerJoin(instructores, eq(instructorFicha.instructorId, instructores.id))
          .where(eq(instructorFicha.fichaId, f.id));

          completeList.push({
            id: f.id,
            codigoFicha: f.codigoFicha,
            fechaInicio: f.fechaInicio,
            fechaFin: f.fechaFin,
            programaId: f.programaId,
            programaFormacion: progResult[0]?.nombre || 'Sin programa',
            nivel: progResult[0]?.nivel || 'Tecnólogo',
            rolEnFicha: 'Administrativo',
            instructor: assignments.map(a => `${a.nombre} (${a.rol})`).join(' | ') || 'Sin asignación',
            assignments: assignments
          });
        }
        return res.json(completeList);
      }

      // Standard Instructor: Fetch only assigned fichas through intermediate pivot table
      const assigned = await db.select({
        id: fichas.id,
        codigoFicha: fichas.codigoFicha,
        fechaInicio: fichas.fechaInicio,
        fechaFin: fichas.fechaFin,
        programaId: fichas.programaId,
        rolEnFicha: instructorFicha.rolEnFicha
      })
      .from(instructorFicha)
      .innerJoin(fichas, eq(instructorFicha.fichaId, fichas.id))
      .where(eq(instructorFicha.instructorId, insRow.id));

      // Append program names
      const completeList = [];
      for (const f of assigned) {
        const progResult = await db.select().from(programasFormacion).where(eq(programasFormacion.id, f.programaId));
        completeList.push({
          ...f,
          programaFormacion: progResult[0]?.nombre || 'Sin programa',
          nivel: progResult[0]?.nivel || 'Tecnólogo',
          instructor: insRow.nombre || 'Instructor Responsable'
        });
      }

      return res.json(completeList);
    } catch (err: any) {
      console.error('Error in GET /api/fichas:', err);
      return res.status(500).json({ error: 'Error al cargar fichas asociadas' });
    }
  });

  // 5b. Upload programming of Fichas (Admin)
  app.post('/api/administrativo/programacion', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      // Ensure the active user is actually an Administrativo
      const requesterResult = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (requesterResult.length === 0 || requesterResult[0].rol !== 'Administrativo') {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere rol Administrativo' });
      }

      const { programacion } = req.body; // Array of item objects
      if (!Array.isArray(programacion)) {
        return res.status(400).json({ error: 'El cuerpo debe contener un arreglo de programación' });
      }

      const results = [];
      for (const item of programacion) {
        try {
          const {
            codigoFicha,
            nombrePrograma,
            nivel,
            fechaInicio,
            fechaFin,
            correoInstructor,
            nombreInstructor,
            rolInstructor
          } = item;

          if (!codigoFicha || !correoInstructor) {
            continue; // Skip invalid rows
          }

          // 1. Ensure the Program exists
          const cleanProgCode = nombrePrograma?.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROG_GEN';
          const cleanProgName = nombrePrograma || 'Programa sin nombre';
          let progId: number;

          const existingProg = await db.select().from(programasFormacion).where(eq(programasFormacion.nombre, cleanProgName));
          if (existingProg.length > 0) {
            progId = existingProg[0].id;
          } else {
            const newProg = await db.insert(programasFormacion)
              .values({
                codigo: cleanProgCode + '_' + Math.floor(Math.random() * 10050),
                nombre: cleanProgName,
                nivel: nivel || 'Tecnólogo'
              })
              .returning();
            progId = newProg[0].id;
          }

          // 2. Ensure Ficha exists
          let resolvedFichaId: number;
          const existingFicha = await db.select().from(fichas).where(eq(fichas.codigoFicha, codigoFicha));
          if (existingFicha.length > 0) {
            resolvedFichaId = existingFicha[0].id;
            await db.update(fichas)
              .set({
                fechaInicio: fechaInicio || existingFicha[0].fechaInicio,
                fechaFin: fechaFin || existingFicha[0].fechaFin
              })
              .where(eq(fichas.id, resolvedFichaId));
          } else {
            const newFicha = await db.insert(fichas)
              .values({
                codigoFicha,
                programaId: progId,
                fechaInicio: fechaInicio || '2026-01-15',
                fechaFin: fechaFin || '2027-12-15'
              })
              .returning();
            resolvedFichaId = newFicha[0].id;
          }

          // 3. Ensure Instructor exists by email
          let instructorId: number;
          const cleanEmail = correoInstructor.trim().toLowerCase();
          const cleanName = nombreInstructor || cleanEmail.split('@')[0];
          const cleanRol = rolInstructor || 'Instructor Técnico';

          const existingInstructor = await db.select().from(instructores).where(eq(instructores.correo, cleanEmail));
          if (existingInstructor.length > 0) {
            instructorId = existingInstructor[0].id;
          } else {
            const newInstructor = await db.insert(instructores)
              .values({
                correo: cleanEmail,
                nombre: cleanName,
                rol: cleanRol
              })
              .returning();
            instructorId = newInstructor[0].id;
          }

          // 4. Link Instructor to Ficha
          const existingLink = await db.select().from(instructorFicha)
            .where(and(
              eq(instructorFicha.instructorId, instructorId),
              eq(instructorFicha.fichaId, resolvedFichaId)
            ));

          if (existingLink.length === 0) {
            await db.insert(instructorFicha)
              .values({
                instructorId,
                fichaId: resolvedFichaId,
                rolEnFicha: cleanRol
              });
          }

          results.push({
            codigoFicha,
            correoInstructor,
            status: 'Sincronizado'
          });

        } catch (rowErr: any) {
          console.error('Error processing programming row:', rowErr);
          results.push({
            codigoFicha: item.codigoFicha,
            correoInstructor: item.correoInstructor,
            status: 'Error: ' + rowErr.message
          });
        }
      }

      return res.json({ success: true, processed: results.length, details: results });
    } catch (err: any) {
      console.error('Error uploading programming:', err);
      return res.status(500).json({ error: 'Error interno guardando la programación' });
    }
  });

  // 6. Fetch single Ficha and its learners list from Postgres database
  app.get('/api/fichas/:fichaCodigo', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { fichaCodigo } = req.params;

      // Find the ficha
      const fichaResult = await db.select().from(fichas).where(eq(fichas.codigoFicha, fichaCodigo));
      if (fichaResult.length === 0) {
        return res.status(404).json({ error: 'Ficha no registrada en el sistema' });
      }
      const selectedFicha = fichaResult[0];

      // Load program
      const progResult = await db.select().from(programasFormacion).where(eq(programasFormacion.id, selectedFicha.programaId));
      const programInfo = progResult[0];

      // Load learners (aprendices) linked to this ficha
      const learners = await db.select().from(aprendicesFichas).where(eq(aprendicesFichas.fichaId, selectedFicha.id));

      // Fetch system audit intervention histories for each student
      const completeLearners = [];
      for (const student of learners) {
        const historyLogs = await db.select({
          id: seguimientosHistorico.id,
          fecha: seguimientosHistorico.fecha,
          estadoPrevio: seguimientosHistorico.estadoPrevio,
          estadoNuevo: seguimientosHistorico.estadoNuevo,
          detalles: seguimientosHistorico.detalles,
          compromisoFecha: seguimientosHistorico.compromisoFecha,
          instructorNombre: instructores.nombre
        })
        .from(seguimientosHistorico)
        .leftJoin(instructores, eq(seguimientosHistorico.instructorId, instructores.id))
        .where(eq(seguimientosHistorico.aprendizFichaId, student.id))
        .orderBy(desc(seguimientosHistorico.fecha));

        completeLearners.push({
          ...student,
          id: student.documento, // Map back to frontend standard of using string document as ID
          dbId: student.id,      // Keep database integer reference
          historialIntervenciones: historyLogs.map(log => ({
            fecha: log.fecha.toISOString().split('T')[0],
            instructor: log.instructorNombre || 'Instructor',
            detalle: `${log.detalles}${log.compromisoFecha ? ` (Fecha compromiso: ${log.compromisoFecha})` : ''}`,
            previo: log.estadoPrevio,
            nuevo: log.estadoNuevo
          }))
        });
      }

      return res.json({
        ficha: {
          id: selectedFicha.id,
          codigoFicha: selectedFicha.codigoFicha,
          fechaInicio: selectedFicha.fechaInicio,
          fechaFin: selectedFicha.fechaFin,
          programaFormacion: programInfo?.nombre,
          nivel: programInfo?.nivel,
        },
        aprendices: completeLearners
      });
    } catch (err: any) {
      console.error('Error fetching single ficha details:', err);
      return res.status(500).json({ error: 'Error al recuperar detalles de la ficha' });
    }
  });

  // 7. Save / Sync Learner records from Excel upload session (with automatic schema relations resolver)
  app.post('/api/fichas/:fichaCodigo/aprendices', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { fichaCodigo } = req.params;
      const { programaFormacion, nivel, fechaInicio, fechaFin, aprendices } = req.body;
      const uid = req.user?.uid || '';

      if (!fichaCodigo || !programaFormacion || !aprendices) {
        return res.status(400).json({ error: 'Missing required sync parameters' });
      }

      // Step A: Find or construct formation program row
      const progCode = programaFormacion.substring(0, 30).toUpperCase().replace(/\s/g, '');
      const existingProg = await db.select().from(programasFormacion).where(eq(programasFormacion.codigo, progCode));
      let pgId: number;

      if (existingProg.length > 0) {
        pgId = existingProg[0].id;
      } else {
        const insProg = await db.insert(programasFormacion)
          .values({
            codigo: progCode,
            nombre: programaFormacion,
            nivel: nivel || 'Tecnólogo',
          })
          .returning();
        pgId = insProg[0].id;
      }

      // Step B: Find or build Ficha row
      const existingFicha = await db.select().from(fichas).where(eq(fichas.codigoFicha, fichaCodigo));
      let fId: number;

      if (existingFicha.length > 0) {
        fId = existingFicha[0].id;
        // Optionally update dates
        await db.update(fichas)
          .set({
            fechaInicio: fechaInicio || existingFicha[0].fechaInicio,
            fechaFin: fechaFin || existingFicha[0].fechaFin,
          })
          .where(eq(fichas.id, fId));
      } else {
        const insFicha = await db.insert(fichas)
          .values({
            codigoFicha: fichaCodigo,
            programaId: pgId,
            fechaInicio: fechaInicio || '2026-01-15',
            fechaFin: fechaFin || '2027-12-15'
          })
          .returning();
        fId = insFicha[0].id;
      }

      // Step C: Link logged-in instructor to this Ficha
      const insResult = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (insResult.length > 0) {
        const instructorId = insResult[0].id;
        const linked = await db.select().from(instructorFicha)
          .where(and(eq(instructorFicha.instructorId, instructorId), eq(instructorFicha.fichaId, fId)));

        if (linked.length === 0) {
          await db.insert(instructorFicha).values({
            instructorId,
            fichaId: fId,
            rolEnFicha: insResult[0].rol || 'Instructor Técnico'
          });
        }
      }

      // Step D: Parse and Upsert learners
      const finalStudentsUpserted = [];
      for (const s of aprendices) {
        // Find existing learner
        const existingStudent = await db.select().from(aprendicesFichas)
          .where(and(eq(aprendicesFichas.fichaId, fId), eq(aprendicesFichas.documento, s.documento)));

        if (existingStudent.length > 0) {
          // Update details, maintaining intervention state
          const upd = await db.update(aprendicesFichas)
            .set({
              nombre: s.nombre,
              correo: s.correo,
              nivelRiesgo: s.nivelRiesgo,
              ultimoAcceso: s.ultimoAcceso,
              diasSinAcceso: s.diasSinAcceso,
              puntajeRiesgo: s.puntajeRiesgo,
              evidencias: s.evidencias || {}
            })
            .where(eq(aprendicesFichas.id, existingStudent[0].id))
            .returning();
          finalStudentsUpserted.push(upd[0]);
        } else {
          // Create new record
          const ins = await db.insert(aprendicesFichas)
            .values({
              fichaId: fId,
              documento: s.documento,
              nombre: s.nombre,
              correo: s.correo,
              nivelRiesgo: s.nivelRiesgo,
              estadoIntervencion: 'Sin intervención',
              ultimoAcceso: s.ultimoAcceso,
              diasSinAcceso: s.diasSinAcceso,
              puntajeRiesgo: s.puntajeRiesgo,
              evidencias: s.evidencias || {}
            })
            .returning();
          finalStudentsUpserted.push(ins[0]);
        }
      }

      return res.json({
        success: true,
        fichaId: fId,
        count: finalStudentsUpserted.length
      });
    } catch (err: any) {
      console.error('Error synchronizing learner data:', err);
      return res.status(500).json({ error: 'Error del sistema al guardar datos' });
    }
  });

  // 8. Create and link individual intervention record with full historical trace audit
  app.post('/api/aprendices/intervencion-individual', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const { userDoc, fichaId, estado, intervencionDetalle } = req.body;

      if (!userDoc || !fichaId || !estado || !intervencionDetalle) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos para la intervención' });
      }

      // 1. Fetch active instructor ID
      const insResult = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (insResult.length === 0) {
        return res.status(403).json({ error: 'Instructor no sincronizado en base de datos' });
      }
      const insId = insResult[0].id;

      // Resolve actual Ficha Database ID
      let resolvedFichaId: number;
      if (typeof fichaId === 'string' && isNaN(Number(fichaId))) {
        const fResult = await db.select().from(fichas).where(eq(fichas.codigoFicha, fichaId));
        if (fResult.length === 0) return res.status(404).json({ error: 'Ficha no encontrada por código' });
        resolvedFichaId = fResult[0].id;
      } else {
        resolvedFichaId = Number(fichaId);
      }

      // 2. Fetch the learner matching this specific sheet and document ID
      const learnerResult = await db.select().from(aprendicesFichas)
        .where(and(eq(aprendicesFichas.fichaId, resolvedFichaId), eq(aprendicesFichas.documento, userDoc)));

      if (learnerResult.length === 0) {
        return res.status(404).json({ error: 'Aprendiz no encontrado en la ficha seleccionada' });
      }
      const targetLearner = learnerResult[0];

      // 3. Save to History logs
      await db.insert(seguimientosHistorico)
        .values({
          aprendizFichaId: targetLearner.id,
          instructorId: insId,
          estadoPrevio: targetLearner.estadoIntervencion,
          estadoNuevo: estado,
          detalles: intervencionDetalle.compromiso || 'Asignación de estrategia',
          compromisoFecha: intervencionDetalle.fechaCompromiso || null
        });

      // 4. Update core state
      await db.update(aprendicesFichas)
        .set({ estadoIntervencion: estado })
        .where(eq(aprendicesFichas.id, targetLearner.id));

      return res.json({ success: true, documento: userDoc, nuevoEstado: estado });
    } catch (err: any) {
      console.error('Error saving individual follow-up:', err);
      return res.status(500).json({ error: 'Error al registrar compromiso' });
    }
  });

  // 9. Bulk historical logging and status update for selected learners
  app.post('/api/aprendices/intervencion-grupal', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const { userDocs, fichaId, estado, intervencionDetalle } = req.body;

      if (!userDocs || !Array.isArray(userDocs) || !fichaId || !estado) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos o formato incorrecto' });
      }

      // 1. Fetch active instructor ID
      const insResult = await db.select().from(instructores).where(eq(instructores.uid, uid));
      if (insResult.length === 0) {
        return res.status(403).json({ error: 'Instructor no sincronizado en base de datos' });
      }
      const insId = insResult[0].id;

      // Resolve actual Ficha Database ID
      let resolvedFichaId: number;
      if (typeof fichaId === 'string' && isNaN(Number(fichaId))) {
        const fResult = await db.select().from(fichas).where(eq(fichas.codigoFicha, fichaId));
        if (fResult.length === 0) return res.status(404).json({ error: 'Ficha no encontrada por código' });
        resolvedFichaId = fResult[0].id;
      } else {
        resolvedFichaId = Number(fichaId);
      }

      // Process each learner sequentially (wrapped in try catches to avoid failing the whole batch)
      const results = [];
      for (const doc of userDocs) {
        const learnerResult = await db.select().from(aprendicesFichas)
          .where(and(eq(aprendicesFichas.fichaId, resolvedFichaId), eq(aprendicesFichas.documento, doc)));

        if (learnerResult.length > 0) {
          const target = learnerResult[0];

          // Archive trace logs
          await db.insert(seguimientosHistorico)
            .values({
              aprendizFichaId: target.id,
              instructorId: insId,
              estadoPrevio: target.estadoIntervencion,
              estadoNuevo: estado,
              detalles: intervencionDetalle.compromiso || 'Estrategia grupal masiva',
              compromisoFecha: intervencionDetalle.fechaCompromiso || null
            });

          // Master update
          await db.update(aprendicesFichas)
            .set({ estadoIntervencion: estado })
            .where(eq(aprendicesFichas.id, target.id));

          results.push(doc);
        }
      }

      return res.json({ success: true, processedDocs: results });
    } catch (err: any) {
      console.error('Error creating bulk follow-up logs:', err);
      return res.status(500).json({ error: 'Error al procesar compromisos masivos' });
    }
  });


  // ==========================================
  // VITE & STATIC FILES SERVING
  // ==========================================

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production built assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Dev Server running at http://localhost:${PORT}`);
  });
}

startServer();
