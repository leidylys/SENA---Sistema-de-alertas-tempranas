import React, { useState, useEffect } from 'react';
import { useAlertasStore } from './hooks/useAlertasStore';
import { FichaInfo, Aprendiz, Fase } from './types';
import UploadSection from './components/UploadSection';
import AdminSection from './components/AdminSection';
import DashboardPage from './pages/DashboardPage';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { 
  syncInstructor, 
  fetchFichas, 
  fetchFichaDetails, 
  syncLearnersToDb,
  updateInstructorRole
} from './lib/api.ts';
import { 
  LogOut, 
  User, 
  Plus, 
  Database, 
  BookOpen, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Building,
  RefreshCw,
  HelpCircle,
  Clock,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const store = useAlertasStore();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [instructorProfile, setInstructorProfile] = useState<{ id: number; nombre: string; correo: string; rol: string } | null>(null);
  const [savedFichas, setSavedFichas] = useState<any[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  
  // UI views: 'fichas_list' | 'upload_new' | 'active_dashboard'
  const [currentView, setCurrentView] = useState<'fichas_list' | 'upload_new' | 'active_dashboard'>('fichas_list');
  const [fichaInfo, setFichaInfo] = useState<FichaInfo | null>(null);
  const [isSavingNewFicha, setIsSavingNewFicha] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempRol, setTempRol] = useState('');
  const [tempNombre, setTempNombre] = useState('');
  const [adminKey, setAdminKey] = useState('');

  // 1. Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          
          // Verify instructor profile in Cloud SQL
          setIsSyncingDb(true);
          const syncRes = await syncInstructor(token);
          if (syncRes && syncRes.instructor) {
            setInstructorProfile(syncRes.instructor);
            setTempRol(syncRes.instructor.rol);
            setTempNombre(syncRes.instructor.nombre);
          }
          
          // Load Fichas that this instructor participates in
          const fichasData = await fetchFichas(token);
          setSavedFichas(fichasData);
          setCurrentView('fichas_list');
        } catch (err) {
          console.error('Error synchronizing database session:', err);
        } finally {
          setIsSyncingDb(false);
          setIsLoadingAuth(false);
        }
      } else {
        setCurrentUser(null);
        setAuthToken(null);
        setInstructorProfile(null);
        setSavedFichas([]);
        setFichaInfo(null);
        store.reiniciarDashboard();
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Refresh saved fichas list helper
  const reloadFichas = async () => {
    if (!authToken) return;
    try {
      const data = await fetchFichas(authToken);
      setSavedFichas(data);
    } catch (err) {
      console.error('Error reloading saved cohort list:', err);
    }
  };

  // Login handler
  const handleLogin = async () => {
    setIsLoadingAuth(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Popup auth failed:', err);
      alert('Error de autenticación. Verifica que tu navegador permita ventanas emergentes (popups) para completar el inicio de sesión.');
      setIsLoadingAuth(false);
    }
  };

  // Demo Admin direct login handler
  const handleDemoAdminLogin = async () => {
    setIsLoadingAuth(true);
    try {
      const mockUser = {
        uid: 'demo-admin-uid-123',
        email: 'ing.deliamarherazo@gmail.com',
        displayName: 'Delia Amar Herazo',
        photoURL: ''
      } as any;
      const mockToken = 'demo-admin';
      
      setCurrentUser(mockUser);
      setAuthToken(mockToken);
      
      // Sync instructor profile in Cloud SQL
      setIsSyncingDb(true);
      const syncRes = await syncInstructor(mockToken);
      if (syncRes && syncRes.instructor) {
        setInstructorProfile(syncRes.instructor);
        setTempRol(syncRes.instructor.rol);
        setTempNombre(syncRes.instructor.nombre);
      }
      
      // Load Fichas that this instructor participates in (as they are Admin, it will load ALL)
      const fichasData = await fetchFichas(mockToken);
      setSavedFichas(fichasData);
      setCurrentView('fichas_list');
    } catch (err) {
      console.error('Error in demo-admin login bypass:', err);
      alert('Fallo al iniciar sesión en modo demostración.');
    } finally {
      setIsSyncingDb(false);
      setIsLoadingAuth(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Modify active profile role with admin password check
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    try {
      const updated = await updateInstructorRole(authToken, tempRol, tempNombre, adminKey);
      setInstructorProfile(updated);
      setIsEditingProfile(false);
      setAdminKey(''); // Reset passcode
      // Reload fichas catalogue instantly to adjust scoping (e.g. admins see all, instructors see assigned)
      const data = await fetchFichas(authToken);
      setSavedFichas(data);
    } catch (err: any) {
      alert(err.message || 'No se pudo guardar la información del rol.');
    }
  };

  // Select/activate a previously saved Ficha from general catalog
  const handleSelectSavedFicha = async (codigoFicha: string) => {
    if (!authToken) return;
    setIsSyncingDb(true);
    try {
      const data = await fetchFichaDetails(authToken, codigoFicha);
      if (data && data.ficha) {
        // Construct the Ficha metadata block
        const loadedFichaInfo: FichaInfo = {
          regional: 'Antioquia',
          centroFormacion: 'Centro de Servicios y Gestión Empresarial',
          programaFormacion: data.ficha.programaFormacion,
          nivel: data.ficha.nivel,
          numeroFicha: data.ficha.codigoFicha,
          instructor: instructorProfile?.nombre || 'Instructor Responsable'
        };
        
        // Rebuild standard phases for checking risk
        // A standard full-track course usually has standard phases
        const mockPhases: Fase[] = [
          {
            id: 'fase-analisis',
            nombre: 'Fase 1: Análisis',
            selected: true,
            evidencias: [
              { nombre: 'Evidencia 1: Mapa conceptual del software', ponderacion: 25, selected: true },
              { nombre: 'Evidencia 2: Especificación de requerimientos', ponderacion: 25, selected: true },
              { nombre: 'Evidencia 3: Caso de estudio y modelado', ponderacion: 50, selected: true },
            ]
          },
          {
            id: 'fase-diseno',
            nombre: 'Fase 2: Diseño',
            selected: false,
            evidencias: [
              { nombre: 'Evidencia 1: Diseño de base de datos relacional', ponderacion: 30, selected: false },
              { nombre: 'Evidencia 2: Prototipado y arquitectura de interfaz', ponderacion: 30, selected: false },
              { nombre: 'Evidencia 3: Manual de diseño de software', ponderacion: 40, selected: false },
            ]
          },
          {
            id: 'fase-desarrollo',
            nombre: 'Fase 3: Desarrollo',
            selected: false,
            evidencias: [
              { nombre: 'Evidencia 1: Codificación de módulos API Express', ponderacion: 40, selected: false },
              { nombre: 'Evidencia 2: Pruebas unitarias de software', ponderacion: 30, selected: false },
              { nombre: 'Evidencia 3: Despliegue en servidores en la nube', ponderacion: 30, selected: false },
            ]
          },
          {
            id: 'fase-evaluacion',
            nombre: 'Fase 4: Evaluación',
            selected: false,
            evidencias: [
              { nombre: 'Evidencia 1: Manual técnico y documentación', ponderacion: 50, selected: false },
              { nombre: 'Evidencia 2: Informe de pruebas de aceptación', ponderacion: 50, selected: false },
            ]
          }
        ];

        // Synchronize our React store state
        store.setDatosCargados(data.aprendices, mockPhases);
        setFichaInfo(loadedFichaInfo);
        setCurrentView('active_dashboard');
      }
    } catch (err) {
      console.error(err);
      alert('Error recuperando la ficha seleccionada.');
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Intercept data loaded callback from Excel parser and persist in Cloud SQL first
  const handleDataLoadedSync = async (
    aprendices: Aprendiz[],
    phases: Fase[],
    info: FichaInfo
  ) => {
    if (!authToken) {
      alert('Debe iniciar sesión para guardar datos');
      return;
    }

    setIsSavingNewFicha(true);
    try {
      // 1. Sync structures to secure institutional database backend
      await syncLearnersToDb(
        authToken,
        info.numeroFicha,
        info.programaFormacion,
        info.nivel,
        '2026-01-15', // Fecha inicio estimación
        '2027-12-15', // Fecha fin estimación
        aprendices
      );

      // 2. Refreshsaved fichas catalogue in memory
      await reloadFichas();

      // 3. Load standard React State
      store.setDatosCargados(aprendices, phases);
      setFichaInfo(info);
      setCurrentView('active_dashboard');
    } catch (err: any) {
      console.error(err);
      alert('No se pudo guardar la ficha en el servidor de base de datos institucional: ' + err.message);
    } finally {
      setIsSavingNewFicha(false);
    }
  };

  // Back to home
  const handleReset = () => {
    store.reiniciarDashboard();
    setFichaInfo(null);
    reloadFichas();
    setCurrentView('fichas_list');
  };

  // ==========================================
  // RENDER LEVEL A: loading auth spinner
  // ==========================================
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F4FBF7] flex flex-col items-center justify-center p-6" id="sena-loader-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white border border-[#39A900]/25 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Loader2 className="w-8 h-8 text-[#39A900] animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Sincronizando sesión segura con SENA Alertas Tempranas...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER LEVEL B: unauthenticated login portal
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 md:p-8" id="sena-login-screen">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8 relative overflow-hidden space-y-6">
          
          {/* Top subtle visual banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#007832]"></div>

          {/* Logo container circle */}
          <div className="mx-auto w-16 h-16 bg-white border-2 border-[#39A900] rounded-full flex items-center justify-center p-1.5 shadow-md">
            <span className="text-[#39A900] text-3xl font-black select-none">S</span>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-800 tracking-tight">
              SENA Alertas Tempranas
            </h1>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
              Centro de Servicios y Gestión Empresarial
            </p>
            <div className="border-t border-slate-100 w-16 mx-auto my-3"></div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Plataforma institucional de retención pedagógica. Inicie sesión de forma segura utilizando su correo institucional MiSena o Google.
            </p>
          </div>

          {/* Action button */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full bg-[#39A900] hover:bg-[#2f8800] active:scale-[0.99] text-white font-extrabold text-sm py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 border border-transparent cursor-pointer"
              id="google-oauth-login-btn"
            >
              {/* Simple vector Google Icon */}
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Acceder con mi Correo Institucional</span>
            </button>

            <div className="flex items-center my-2 text-slate-300">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-2 text-[10px] uppercase font-bold text-slate-400">O Alternativa Rápida</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleDemoAdminLogin}
              className="w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              id="demo-admin-bypass-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Acceso de Prueba (Modo Administrativo)</span>
            </button>
          </div>

          {/* Secure lock note */}
          <div className="flex flex-col items-center justify-center gap-1 text-[10.5px] text-slate-400 font-medium text-center">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#39A900]" />
              <span>Servidor de Base de Datos Institucional Seguro</span>
            </div>
            <p className="text-[9px] text-slate-355 max-w-xs leading-normal mt-0.5">
              Utilice el Acceso de Prueba si no desea autenticar con correo institucional o si el navegador bloquea las ventanas emergentes.
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER LEVEL C: authenticated experiences
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8" id="sena-authenticated-app">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Section for authenticated Instructors */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#007832] to-[#39A900] text-white rounded-full flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            
            <div className="text-left">
              <div className="text-[10px] text-slate-450 font-bold uppercase tracking-widest">Instructor Activo</div>
              
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="flex flex-wrap items-center gap-2 mt-1">
                  <input 
                    type="text" 
                    value={tempNombre} 
                    onChange={e => setTempNombre(e.target.value)} 
                    placeholder="Nombre Completo"
                    className="text-xs px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    value={tempRol}
                    onChange={e => setTempRol(e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded text-slate-700 bg-white"
                  >
                    <option value="Instructor Técnico">Instructor Técnico</option>
                    <option value="Vocero de Ficha">Vocero de Ficha</option>
                    <option value="Instructor Transversal">Instructor Transversal</option>
                    <option value="Apoyo de Coordinación">Apoyo de Coordinación</option>
                    <option value="Administrativo">Administrativo (Planeador / Coordinador)</option>
                  </select>
                  {tempRol === 'Administrativo' && (
                    <input 
                      type="password" 
                      value={adminKey} 
                      onChange={e => setAdminKey(e.target.value)} 
                      placeholder="Ingrese Clave (ej: sena2026)" 
                      className="text-xs px-2 py-1 border border-amber-300 bg-amber-50/70 rounded text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:font-normal"
                      required
                    />
                  )}
                  <button type="submit" className="text-[10px] bg-[#39A900] hover:bg-[#319200] text-white font-bold py-1 px-2.5 rounded-sm">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="text-[10px] text-slate-400 hover:text-slate-600 py-1 px-1.5">
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-800">
                    {instructorProfile?.nombre || currentUser.displayName || currentUser.email} 
                    <span className="ml-2 font-mono text-[10.5px] text-emerald-700 bg-[#39A900]/10 px-2 py-0.5 rounded-full font-bold">
                      {instructorProfile?.rol || 'Instructor'}
                    </span>
                  </h3>
                  <button 
                    onClick={() => {
                      setIsEditingProfile(true);
                      setTempNombre(instructorProfile?.nombre || '');
                      setTempRol(instructorProfile?.rol || 'Instructor Técnico');
                    }}
                    className="text-[10px] text-[#39A900] hover:underline font-semibold"
                  >
                    (Editar rol)
                  </button>
                </div>
              )}
              
              <div className="text-[11px] text-slate-400">{currentUser.email}</div>
            </div>
          </div>

          {/* Quick Stats or Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#39A900]/5 border border-[#39A900]/15 text-xs text-slate-600">
              <Database className="w-3.5 h-3.5 text-[#39A900]" />
              <span>Base de datos institucional activa • <strong className="text-slate-800">{savedFichas.length}</strong> fichas</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-2 px-3 rounded-lg border border-red-200/50 transition-colors flex items-center justify-center gap-1.5"
              id="user-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>

        </div>

        {/* ==========================================
            VIEW 1: saved fichas catalog landing
            ========================================== */}
        {currentView === 'fichas_list' && (
          <div className="space-y-6" id="fichas-catalog-view">
            
            {/* Welcome banner card */}
            <div className="bg-gradient-to-r from-[#007832] to-[#39A900] rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-xs">
                  Servicio Nacional de Aprendizaje • SENA
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Sistema de Alertas Tempranas - Retención
                </h1>
                <p className="text-sm text-white/90 md:max-w-xl font-medium">
                  Portal de seguimiento pedagógico. Acceda y refresque el análisis de sus grupos o suba nuevos reportes excel para iniciar el diagnóstico.
                </p>
              </div>

              {/* Upload cohort button trigger */}
              <button
                onClick={() => setCurrentView('upload_new')}
                className="z-10 shrink-0 bg-white hover:bg-emerald-50 text-neutral-850 font-extrabold text-xs py-3 px-5 rounded-xl border border-white/30 transition-all flex items-center justify-center gap-2 shadow-md"
                id="create-new-ficha-trigger-btn"
              >
                <Plus className="w-4 h-4 text-[#39A900]" />
                <span>Subir nueva ficha</span>
              </button>
            </div>

            {instructorProfile?.rol === 'Administrativo' && (
              <AdminSection
                authToken={authToken || ''}
                onSuccessSync={reloadFichas}
              />
            )}

            {/* Fichas title layout */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#39A900]" />
                  <span>Mis Fichas de Formación</span>
                </h2>
                <button 
                  onClick={reloadFichas}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refrescar</span>
                </button>
              </div>

              {isSyncingDb ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 space-y-3">
                  <Loader2 className="w-8 h-8 text-[#39A900] animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">Cargando fichas del servidor de base de datos institucional...</p>
                </div>
              ) : savedFichas.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 max-w-xl mx-auto space-y-4 shadow-3xs">
                  <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-sm font-bold text-slate-800">No se encontraron fichas guardadas</h3>
                     <p className="text-xs text-slate-400 leading-relaxed">
                       Aún no tiene grupos asignados o registros en el servidor de base de datos institucional. Suba un archivo Excel para iniciar el mapa de alertas tempranas.
                     </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('upload_new')}
                    className="bg-[#39A900] hover:bg-[#2f8800] text-white text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center gap-1"
                    id="upload-first-ficha-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Iniciar primera carga</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="fichas-grid-container">
                  {savedFichas.map(ficha => (
                    <div 
                      key={ficha.id}
                      onClick={() => handleSelectSavedFicha(ficha.codigoFicha)}
                      className="bg-white rounded-xl border border-slate-250 hover:border-[#39A900]/55 shadow-3xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative group"
                    >
                      {/* Left accent strip */}
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#39A900] group-hover:bg-[#007832] transition-colors"></div>

                      <div className="p-5 pl-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            COD: {ficha.codigoFicha}
                          </span>
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded font-semibold capitalize">
                            {ficha.rolEnFicha || 'Participante'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-800 select-none group-hover:text-[#39A900] transition-colors line-clamp-1" title={ficha.programaFormacion}>
                            {ficha.programaFormacion}
                          </h3>
                          <p className="text-[10.5px] text-slate-400 font-semibold">{ficha.nivel || 'Tecnólogo'}</p>
                        </div>

                        <div className="border-t border-slate-100 my-2"></div>

                        <div className="flex items-center justify-between text-[11px] text-slate-450">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Vigencia</span>
                          </span>
                          <span className="font-bold text-slate-600 text-[10px]">
                            {ficha.fechaInicio?.substring(0, 10)} / {ficha.fechaFin?.substring(0, 10)}
                          </span>
                        </div>
                      </div>

                      {/* Footer entry button */}
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-105 flex items-center justify-between text-xs font-bold text-[#39A900] group-hover:bg-slate-100/70 transition-colors">
                        <span>Ver Cuadro de Alertas</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

        {/* ==========================================
            VIEW 2: upload new Cohort section
            ========================================== */}
        {currentView === 'upload_new' && (
          <div className="space-y-4" id="upload-new-excel-wrapper">
            
            <button 
              onClick={() => setCurrentView('fichas_list')}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold inline-flex items-center gap-1 bg-slate-200/50 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300/30"
              id="back-to-fichas-catalog-btn"
            >
              <span>← Volver a mis fichas</span>
            </button>

            {isSavingNewFicha ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-md flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-[#39A900] animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">Guardando Ficha en Google Cloud SQL</h3>
                  <p className="text-xs text-slate-400">Insertando registros de instructores, programa, alumnos y cálculo de riesgos iniciales...</p>
                </div>
              </div>
            ) : (
              <UploadSection onDataLoaded={handleDataLoadedSync} />
            )}
          </div>
        )}

        {/* ==========================================
            VIEW 3: active Ficha dashboard
            ========================================== */}
        {currentView === 'active_dashboard' && fichaInfo && (
          <div id="active-ficha-dashboard-container">
            <DashboardPage
              aprendices={store.aprendices}
              fases={store.fases}
              fichaInfo={fichaInfo}
              store={store}
              onReiniciar={handleReset}
              authToken={authToken || ''} // Pass raw token so inner operations like saving can coordinate directly with backend database as well!
            />
          </div>
        )}

      </div>
    </main>
  );
}
