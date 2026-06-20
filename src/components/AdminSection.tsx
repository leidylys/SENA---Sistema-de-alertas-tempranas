import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Download, 
  Loader2, 
  UserPlus, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  Mail,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leerArchivoExcel, leerArchivoExcel2D, parseFichaExcel, ProgramacionItem } from '../utils/excelParser';
import { uploadProgrammingGrid } from '../lib/api';

interface AdminSectionProps {
  authToken: string;
  onSuccessSync: () => void;
}

export default function AdminSection({ authToken, onSuccessSync }: AdminSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ProgramacionItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<{ successCount: number; errorCount: number; details: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual line additions state
  const [manualRows, setManualRows] = useState<ProgramacionItem[]>([
    {
      codigoFicha: '',
      correoInstructor: '',
      nombreInstructor: '',
      nombrePrograma: '',
      nivel: 'Tecnólogo',
      fechaInicio: '',
      fechaFin: '',
      rolInstructor: 'Instructor Técnico'
    }
  ]);

  const handleSpreadsheetFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    try {
      // Load raw 2D structure to support multiple formats
      const rows2D = await leerArchivoExcel2D(selectedFile);
      const mapped = parseFichaExcel(rows2D);

      if (mapped.length === 0) {
        alert('No se detectaron filas válidas. Asegúrate de cargar un formato de programación o un Reporte de Instructores por Ficha como el provisto por la coordinación.');
      } else {
        setParsedRows(mapped);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error leyendo el archivo Excel: ' + (err.message || 'Valida la estructura e intenta nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSpreadsheetFile(e.dataTransfer.files[0]);
    }
  };

  // Sample Excel creator
  const downloadSampleTemplate = () => {
    const dump = [
      {
        'Codigo Ficha': '2281902',
        'Programa Formacion': 'Análisis y Desarrollo de Software',
        'Nivel': 'Tecnólogo',
        'Fecha Inicio': '2026-01-15',
        'Fecha Fin': '2027-12-15',
        'Correo Instructor': 'pedro.perez@sena.edu.co',
        'Nombre Instructor': 'Pedro Pérez',
        'Rol Instructor': 'Instructor Técnico'
      },
      {
        'Codigo Ficha': '2321456',
        'Programa Formacion': 'Gestión de Talento Humano',
        'Nivel': 'Tecnólogo',
        'Fecha Inicio': '2026-03-10',
        'Fecha Fin': '2027-11-20',
        'Correo Instructor': 'martha.gomez@sena.edu.co',
        'Nombre Instructor': 'Martha Gómez',
        'Rol Instructor': 'Vocero de Ficha'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dump);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programación Fichas');
    
    // Write out download
    XLSX.writeFile(workbook, 'Sena_Plantilla_Programacion_Fichas.xlsx');
  };

  // Manual row management
  const handleManualRowChange = (index: number, field: keyof ProgramacionItem, val: string) => {
    const updated = [...manualRows];
    updated[index][field] = val;
    setManualRows(updated);
  };

  const addManualRow = () => {
    setManualRows([
      ...manualRows,
      {
        codigoFicha: '',
        correoInstructor: '',
        nombreInstructor: '',
        nombrePrograma: '',
        nivel: 'Tecnólogo',
        fechaInicio: '',
        fechaFin: '',
        rolInstructor: 'Instructor Técnico'
      }
    ]);
  };

  const removeManualRow = (index: number) => {
    const updated = manualRows.filter((_, idx) => idx !== index);
    setManualRows(updated.length > 0 ? updated : [
      {
        codigoFicha: '',
        correoInstructor: '',
        nombreInstructor: '',
        nombrePrograma: '',
        nivel: 'Tecnólogo',
        fechaInicio: '',
        fechaFin: '',
        rolInstructor: 'Instructor Técnico'
      }
    ]);
  };

  const useManualRowsForSync = () => {
    const valid = manualRows.filter(r => r.codigoFicha.trim() && r.correoInstructor.trim());
    if (valid.length === 0) {
      alert('Ingresa por lo menos una fila con código de Ficha y Correo de Instructor válidos.');
      return;
    }
    setParsedRows(valid);
  };

  // Handler to edit the parsed rows inline prior to DB synchronization
  const handleParsedRowChange = (index: number, field: keyof ProgramacionItem, val: string) => {
    const updated = [...parsedRows];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setParsedRows(updated);
  };

  // Send to Postgres SQL Database
  const triggerDatabaseSincronizacion = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setSyncStatus(null);
    try {
      const res = await uploadProgrammingGrid(authToken, parsedRows);
      if (res && res.success) {
        let successCount = 0;
        let errorCount = 0;
        if (Array.isArray(res.details)) {
          res.details.forEach((d: any) => {
            if (d.status === 'Sincronizado') successCount++;
            else errorCount++;
          });
        } else {
          successCount = res.processed || parsedRows.length;
        }

        setSyncStatus({
          successCount,
          errorCount,
          details: res.details || []
        });

        setParsedRows([]);
        setFile(null);
        onSuccessSync(); // Reload core App's ficha listings!
      }
    } catch (err: any) {
      alert('Fallo al cargar la programación en el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-3xs" id="admin-centre-panel">
      
      {/* Title & badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#007832] bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Coordinación Académica • Servicio Administrativo</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Cargar Programación de Fichas e Instructores
          </h2>
          <p className="text-xs text-slate-450 leading-relaxed max-w-2xl">
            Sincronice la asignación oficial. Al cargar un archivo Excel o el Reporte de Instructores por Ficha, el sistema creará automáticamente la Ficha y la asociará a cada Instructor. Al iniciar sesión, su Ficha ya estará lista y pre-cargada.
          </p>
        </div>

        <button
          onClick={useManualRowsForSync}
          className="hidden"
        />
      </div>

      {syncStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <CheckCircle className="w-4 h-4 text-[#39A900]" />
            <span>¡Sincronización de programación realizada con éxito!</span>
          </div>
          <div className="text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>Fichas registradas: <strong className="text-emerald-800 font-extrabold">{syncStatus.successCount}</strong></div>
            {syncStatus.errorCount > 0 && (
              <div className="text-red-700">Errores u omisiones: <strong className="font-extrabold">{syncStatus.errorCount}</strong></div>
            )}
          </div>
          <button 
            onClick={() => setSyncStatus(null)}
            className="text-[10px] text-emerald-700 hover:underline font-bold mt-1 block"
          >
            Quitar aviso
          </button>
        </div>
      )}

      {/* Tabs / upload controls */}
      {parsedRows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Option A: Excel drag drop */}
          <div className="lg:col-span-12 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-slate-455 uppercase tracking-wide">
                Carga por Archivo Excel (.xlsx) / Reporte de Coordinación
              </h3>
              <p className="text-[11px] text-slate-400">
                Soporta formato directo o "Reporte de Instructores por Ficha" de Excel.
              </p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-[#39A900] bg-[#39A900]/5 scale-[1.01]' 
                  : 'border-slate-200 hover:border-slate-350 bg-slate-50/50'
              }`}
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                onChange={e => e.target.files?.[0] && handleSpreadsheetFile(e.target.files[0])} 
                accept=".xlsx,.xls" 
                className="hidden" 
              />
              <div className="max-w-md mx-auto space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-[#39A900] shadow-2xs">
                  <UploadCloud className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Arrastra tu Reporte Excel aquí o busca en tu equipo</p>
                  <p className="text-[10px] text-slate-400">Soporta "Reporte de Instructores por Ficha" y saca los Códigos y Nombres al vuelo de forma inteligente.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        
        // Show Parsed items verification grid with full interactive inputs
        <div className="space-y-4 animate-fade-in">
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold">Verificación Interactiva de Datos (Edite directamente si lo requiere):</span>
              <p className="text-slate-655 font-normal">
                Hemos extraído <strong className="text-amber-950 font-black">{parsedRows.length} fila(s) de asignación</strong>. Para garantizar la máxima precisión y corregir cualquier email ausente, puede hacer clic y corregir cualquier campo en la grilla antes de sincronizar con la base de datos Cloud SQL.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl custom-scrollbar max-h-96">
            <table className="w-full text-xs text-left text-slate-600 bg-white">
              <thead className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-50 border-b border-slate-150 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 w-[15%]">Código Ficha</th>
                  <th className="px-3 py-3 w-[25%]">Programa de Formación</th>
                  <th className="px-3 py-3 w-[25%]">Correo Instructor (Sena)</th>
                  <th className="px-3 py-3 w-[20%]">Nombre Completo Instructor</th>
                  <th className="px-3 py-3 w-[15%]">Rol del Instructor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-1.5 align-middle">
                      <input 
                        type="text" 
                        value={item.codigoFicha || ''} 
                        onChange={e => handleParsedRowChange(index, 'codigoFicha', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-50/75 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input 
                        type="text" 
                        value={item.nombrePrograma || ''} 
                        onChange={e => handleParsedRowChange(index, 'nombrePrograma', e.target.value)}
                        className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50/75 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input 
                        type="email" 
                        value={item.correoInstructor || ''} 
                        onChange={e => handleParsedRowChange(index, 'correoInstructor', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono text-emerald-800 bg-emerald-50/20 border border-emerald-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none placeholder:italic placeholder:text-slate-300"
                        placeholder="generado@sena.edu.co"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input 
                        type="text" 
                        value={item.nombreInstructor || ''} 
                        onChange={e => handleParsedRowChange(index, 'nombreInstructor', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50/75 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <select
                        value={item.rolInstructor || 'Instructor Técnico'}
                        onChange={e => handleParsedRowChange(index, 'rolInstructor', e.target.value)}
                        className="w-full px-2 py-1 text-xs text-slate-700 bg-slate-50/75 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="Instructor Técnico">Instructor Técnico</option>
                        <option value="Vocero de Ficha">Vocero de Ficha</option>
                        <option value="Apoyo de Coordinación">Apoyo de Coordinación</option>
                        <option value="Administrativo">Administrativo</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              onClick={() => setParsedRows([])}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Cancelar carga
            </button>
            <button
              onClick={triggerDatabaseSincronizacion}
              disabled={loading}
              className="bg-[#39A900] hover:bg-[#2e8a00] text-white font-extrabold px-6 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sincronizando con Cloud SQL...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Sincronizar {parsedRows.length} Ficha(s) en Base de Datos</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
