import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, Building, Briefcase, GraduationCap, User, Info, HelpCircle } from 'lucide-react';
import { FichaInfo } from '../types';
import { useFichaInfo } from '../hooks/useFichaInfo';
import { leerArchivoExcel, detectarFases, normalizarAprendices, combinarDatos } from '../utils/excelParser';
import { CALIFICACIONES_MOCK_RAW, PARTICIPANTES_MOCK_RAW, GENERATED_FASES_MOCK } from '../data/mockData';

interface UploadSectionProps {
  onDataLoaded: (aprendices: any[], fases: any[], info: FichaInfo) => void;
}

export default function UploadSection({ onDataLoaded }: UploadSectionProps) {
  const { fichaInfo, saveFichaInfo } = useFichaInfo();

  // Excel Files state
  const [qualificationsFile, setQualificationsFile] = useState<File | null>(null);
  const [participantsFile, setParticipantsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Drag and drop states
  const [dragQuals, setDragQuals] = useState(false);
  const [dragParts, setDragParts] = useState(false);

  const qualsInputRef = useRef<HTMLInputElement>(null);
  const partsInputRef = useRef<HTMLInputElement>(null);

  // Handle Qualifications uploaded
  const handleQualsFile = (file: File) => {
    setQualificationsFile(file);
    
    // Auto-detect number of ficha with regex /(\d{5,})/
    const match = file.name.match(/(\d{5,})/);
    if (match && match[1]) {
      const detectedFicha = match[1];
      saveFichaInfo({ numeroFicha: detectedFicha });
    }
  };

  const handleDragOverQuals = (e: React.DragEvent) => {
    e.preventDefault();
    setDragQuals(true);
  };
  const handleDragLeaveQuals = () => setDragQuals(false);
  
  const handleDropQuals = (e: React.DragEvent) => {
    e.preventDefault();
    setDragQuals(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleQualsFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Participants uploaded
  const handlePartsFile = (file: File) => {
    setParticipantsFile(file);
  };

  const handleDragOverParts = (e: React.DragEvent) => {
    e.preventDefault();
    setDragParts(true);
  };
  const handleDragLeaveParts = () => setDragParts(false);

  const handleDropParts = (e: React.DragEvent) => {
    e.preventDefault();
    setDragParts(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePartsFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger spreadsheet compilation
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualificationsFile) return;

    if (!fichaInfo.programaFormacion || !fichaInfo.numeroFicha || !fichaInfo.instructor) {
      alert("Por favor completa todos los campos obligatorios del formulario institucional.");
      return;
    }

    setLoading(true);
    try {
      // 1. Process Qualifications Excel (obligatorio)
      const parsedQuals = await leerArchivoExcel(qualificationsFile);
      const phases = detectarFases(parsedQuals.headers);
      let list = normalizarAprendices(parsedQuals.rows, phases);

      // 2. Process Participants Excel (opcional)
      if (participantsFile) {
        const parsedParts = await leerArchivoExcel(participantsFile);
        list = combinarDatos(list, parsedParts.rows);
      }

      onDataLoaded(list, phases, fichaInfo);
    } catch (err) {
      console.error(err);
      alert("Error al parsear los archivos de calificaciones. Valida que el archivo excel corresponda a un reporte exportado oficial del LMS.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Seeding Mock Data
  const handleLoadMockData = () => {
    setLoading(true);
    setTimeout(() => {
      // Create copy of pre-defined mock data
      const infoMock: FichaInfo = {
        regional: 'Antioquia',
        centroFormacion: 'Centro de Servicios y Gestión Empresarial',
        programaFormacion: 'Análisis y Desarrollo de Software (ADSO)',
        nivel: 'Tecnólogo',
        numeroFicha: '2281902',
        instructor: 'Dra. María Cleofé Restrepo'
      };

      saveFichaInfo(infoMock);
      
      const mockedPhases = JSON.parse(JSON.stringify(GENERATED_FASES_MOCK));
      let mockedStudents = normalizarAprendices(CALIFICACIONES_MOCK_RAW, mockedPhases);
      mockedStudents = combinarDatos(mockedStudents, PARTICIPANTES_MOCK_RAW);

      onDataLoaded(mockedStudents, mockedPhases, infoMock);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" id="upload-landing-container">
      
      {/* Institutional Top Title and Banner */}
      <div className="bg-gradient-to-r from-sena-700 via-sena-650 to-sena-600 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-xs">
            Servicio Nacional de Aprendizaje • SENA
          </div>
          <h1 className="text-2xl md:text-3.5xl font-extrabold tracking-tight">
            Sistema de Alertas Tempranas - Retención
          </h1>
          <p className="text-sm text-sena-50 md:max-w-xl font-medium">
            Plataforma institucional para instructores de Antioquia. Analiza calificaciones y registros de ingreso para proponer planes oportunos de acompañamiento.
          </p>
        </div>
        
        {/* Draw Vector SENA Emblem */}
        <div className="w-24 h-24 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center p-2.5 border border-white/20 shadow-inner z-10 hover:scale-105 transition-transform">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* outer ring */}
            <div className="w-14 h-14 rounded-full border-[5px] border-white flex items-center justify-center">
              <span className="text-white text-3xl font-black select-none tracking-tighter">S</span>
            </div>
            <span className="text-[10px] font-bold tracking-widest text-[#FFF] mt-1">SENA</span>
          </div>
        </div>

        {/* Ambient subtle decorative circle */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-sena-400/20 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-sena-600" />
            <h2 className="text-base font-bold text-slate-800">Información General de la Ficha</h2>
          </div>

          <div className="space-y-3 text-xs" >
            
            {/* Regional field (fixed/disabled) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Regional (Fijo)</label>
              <div className="px-3 py-2 bg-slate-100 text-slate-600 font-medium rounded-md border border-slate-200 select-none">
                Antioquia
              </div>
            </div>

            {/* Centro field (fixed/disabled) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Centro de Formación (Fijo)</label>
              <div className="px-3 py-2 bg-slate-100 text-slate-600 font-medium rounded-md border border-slate-200 select-none truncate" title="Centro de Servicios y Gestión Empresarial">
                Centro de Servicios y Gestión Empresarial
              </div>
            </div>

            {/* Programa de Formación */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <span>Programa de Formación</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Análisis y Desarrollo de Software o ADSO"
                  value={fichaInfo.programaFormacion}
                  onChange={e => saveFichaInfo({ programaFormacion: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-sena-500 focus:border-sena-500 bg-white"
                />
                <Briefcase className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Nivel de Formación */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <span>Nivel de Formación</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  value={fichaInfo.nivel}
                  onChange={e => saveFichaInfo({ nivel: e.target.value as any })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-sena-500 focus:border-sena-500 bg-white"
                >
                  <option value="Técnico">Técnico</option>
                  <option value="Tecnólogo">Tecnólogo</option>
                </select>
                <GraduationCap className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Número de ficha */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <span>Número de Ficha</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Autodetectable o digita numérico"
                  value={fichaInfo.numeroFicha}
                  onChange={e => saveFichaInfo({ numeroFicha: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-sena-500 focus:border-sena-500 bg-white"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 italic font-bold">#</span>
              </div>
              <p className="text-[10px] text-slate-450">
                Se intentará recuperar automáticamente al cargar tu Excel de calificaciones.
              </p>
            </div>

            {/* Nombre del instructor */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <span>Nombre del Instructor Responsable</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  value={fichaInfo.instructor}
                  onChange={e => saveFichaInfo({ instructor: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-sena-500 focus:border-sena-500 bg-white"
                />
                <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

          </div>
        </div>

        {/* Right Upload Drag Zone Box */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex-1 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-sena-600" />
              <h2 className="text-base font-bold text-slate-800">Cargar Archivos de Reporte LMS</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Qualifications (OBLIGATORIO) */}
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  1. Archivo de Calificaciones
                  <span className="text-red-500 font-bold">*</span>
                </span>
                
                <div
                  onDragOver={handleDragOverQuals}
                  onDragLeave={handleDragLeaveQuals}
                  onDrop={handleDropQuals}
                  onClick={() => qualsInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] hover:border-sena-400 hover:bg-sena-50/15 ${
                    dragQuals ? 'border-sena-500 bg-sena-100/10' : 'border-slate-250'
                  }`}
                  id="qualifications-excel-dropzone"
                >
                  <input
                    type="file"
                    ref={qualsInputRef}
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleQualsFile(e.target.files[0]);
                      }
                    }}
                  />
                  <FileSpreadsheet className={`w-8 h-8 mb-2 ${qualificationsFile ? 'text-sena-500 animate-bounce' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-700 break-all px-2 block">
                    {qualificationsFile ? qualificationsFile.name : 'Subir excel Calificaciones'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {qualificationsFile ? 'Archivo seleccionado' : 'Arrastra y suelta aquí o interactúa'}
                  </span>
                </div>
              </div>

              {/* Box 2: Participants list (OPCIONAL) */}
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                  2. Archivo de Participantes (Opcional)
                </span>
                
                <div
                  onDragOver={handleDragOverParts}
                  onDragLeave={handleDragLeaveParts}
                  onDrop={handleDropParts}
                  onClick={() => partsInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] hover:border-blue-400 hover:bg-blue-50/10 ${
                    dragParts ? 'border-blue-500 bg-blue-100/10' : 'border-slate-250'
                  }`}
                  id="participants-excel-dropzone"
                >
                  <input
                    type="file"
                    ref={partsInputRef}
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handlePartsFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className={`w-8 h-8 mb-2 ${participantsFile ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-700 break-all px-2 block">
                    {participantsFile ? participantsFile.name : 'Subir excel Participantes'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {participantsFile ? 'Archivo seleccionado' : 'Arrastra para registrar últimos accesos'}
                  </span>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-md bg-stone-50 border border-slate-100 text-[10.5px] text-slate-500">
              <Info className="w-4 h-4 text-sena-500 shrink-0" />
              <span>Para un diagnóstico preciso, el excel de calificaciones debe contener las columnas de documento e identificadores.</span>
            </div>
          </div>

          {/* Action trigger buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Primary Analysis trigger */}
            <button
              onClick={handleAnalyze}
              disabled={!qualificationsFile || loading}
              className="w-full sm:flex-1 bg-sena-500 hover:bg-sena-600 active:bg-sena-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-sm py-3 px-6 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              id="analyze-excel-data-btn"
            >
              {loading ? (
                <span>Cargando y ordenando...</span>
              ) : (
                <span>Analizar Aprendices</span>
              )}
            </button>

            {/* Seed Mock Example trigger */}
            <button
              type="button"
              onClick={handleLoadMockData}
              disabled={loading}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 px-5 rounded-xl border border-slate-200/80 shadow-3xs transition-all flex items-center justify-center gap-1.5"
              title="Cargar simulación institucional prefabricada"
              id="mock-load-demo-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Usar datos de ejemplo
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
