import React, { useState } from 'react';
import { 
  Home, RefreshCw, Download, FileText, AlertTriangle, LogOut,
  Building, User, Calendar, Sparkles, FolderSync, Info
} from 'lucide-react';
import { Aprendiz, Fase, FichaInfo } from '../types';
import DashboardCards from '../components/DashboardCards';
import PhaseSelector from '../components/PhaseSelector';
import AlertTable from '../components/AlertTable';
import StrategyModal from '../components/StrategyModal';
import ReportModal from '../components/ReportModal';
import { useAlertasStore } from '../hooks/useAlertasStore';
import { saveIndividualIntervention, saveBulkIntervention } from '../lib/api.ts';

interface DashboardPageProps {
  aprendices: Aprendiz[];
  fases: Fase[];
  fichaInfo: FichaInfo;
  store: ReturnType<typeof useAlertasStore>;
  onReiniciar: () => void;
  authToken: string;
}

export default function DashboardPage({
  aprendices,
  fases,
  fichaInfo,
  store,
  onReiniciar,
  authToken
}: DashboardPageProps) {
  
  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [isSavingIntervention, setIsSavingIntervention] = useState(false);
  
  // Strategy targets (either singular learner or mass block)
  const [strategySingleTarget, setStrategySingleTarget] = useState<Aprendiz | null>(null);
  const [strategyMassTarget, setStrategyMassTarget] = useState<Aprendiz[] | null>(null);

  // Computed live general stats
  const countUnIntervened = store.aprendices.filter(
    a => a.estadoIntervencion === 'Sin intervención'
  ).length;

  const countAlto = store.aprendices.filter(a => a.nivelRiesgo === 'Alto').length;
  const countMedio = store.aprendices.filter(a => a.nivelRiesgo === 'Medio').length;
  const countBajo = store.aprendices.filter(a => a.nivelRiesgo === 'Bajo').length;

  // Modals Triggers
  const triggerIndividualIntervention = (ap: Aprendiz) => {
    setStrategyMassTarget(null);
    setStrategySingleTarget(ap);
    setIsStrategyOpen(true);
  };

  const triggerBulkIntervention = (aps: Aprendiz[]) => {
    setStrategySingleTarget(null);
    setStrategyMassTarget(aps);
    setIsStrategyOpen(true);
  };

  const handleGuardarIntervencion = async (
    documentos: string[],
    estado: 'Sin intervención' | 'En seguimiento' | 'Intervenido',
    intervencionDetalle: any
  ) => {
    setIsSavingIntervention(true);
    try {
      // Pack full structured fields cleanly for PostgreSQL Detalles string
      const compromiseText = [
        intervencionDetalle.estrategias?.length > 0 ? `Estrategias: ${intervencionDetalle.estrategias.join(', ')}` : '',
        intervencionDetalle.causas?.length > 0 ? `Causas: ${intervencionDetalle.causas.join(', ')}` : '',
        intervencionDetalle.observaciones ? `Observaciones: ${intervencionDetalle.observaciones}` : ''
      ].filter(Boolean).join(' | ') || 'Asignación de estrategia pedagógica';

      if (strategyMassTarget) {
        // Bulk save
        await saveBulkIntervention(
          authToken,
          documentos,
          fichaInfo.numeroFicha,
          estado,
          compromiseText,
          intervencionDetalle.fecha
        );
        store.aplicarIntervencionMasiva(documentos, estado, intervencionDetalle);
      } else {
        // Individual save
        await saveIndividualIntervention(
          authToken,
          documentos[0],
          fichaInfo.numeroFicha,
          estado,
          compromiseText,
          intervencionDetalle.fecha
        );
        store.aplicarIntervencionIndividual(documentos[0], estado, intervencionDetalle);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error guardando en base de datos: ' + err.message);
    } finally {
      setIsSavingIntervention(false);
    }
  };

  return (
    <div className="space-y-6" id="dashboard-page-view">
      
      {/* Navbar Institucional Dark Green #007832 */}
      <header className="bg-[#007832] text-white rounded-xl shadow-lg p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left SENA Info / Logo */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Logo container circle */}
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 border border-white/20 shadow-inner shrink-0">
            <span className="text-[#39A900] text-xl font-black">S</span>
          </div>
          <div className="border-l border-white/30 pl-4 text-left leading-tight">
            <h1 className="text-base font-bold leading-none uppercase tracking-wide">SENA Alertas Tempranas</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-widest mt-1">
              Centro de Servicios y Gestión Empresarial
            </p>
          </div>
        </div>

        {/* Dynamic Ficha Badge from Sleek Interface theme */}
        <div className="flex items-center gap-4 font-semibold text-xs py-2">
          <div className="bg-[#39A900] px-3 py-1 rounded text-xs font-bold shrink-0 shadow-sm">
            FICHA: {fichaInfo.numeroFicha || 'No especificada'}
          </div>
          <span className="text-xs text-white/90 truncate max-w-[200px] hidden sm:inline" title={fichaInfo.programaFormacion}>
            {fichaInfo.programaFormacion}
          </span>
        </div>

        {/* Action button triggers Excel/PDF, and Back Home */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
          
          {/* Open Export Modal */}
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5 border border-white/20"
            id="open-report-options-btn"
          >
            <FileText className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>

          {/* Return button */}
          <button
            type="button"
            onClick={onReiniciar}
            className="flex-1 sm:flex-initial bg-red-650 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-3.5 rounded transition-colors flex items-center justify-center gap-1.5"
            title="Sube una nueva ficha excel para re-analizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>

        </div>
      </header>

      {/* Overview statistical count cards (Clicking applies risk filter) */}
      <DashboardCards
        total={store.aprendices.length}
        alto={countAlto}
        medio={countMedio}
        bajo={countBajo}
        selectedFilter={store.filterRiesgo}
        onFilterSelect={(item) => store.setFilterRiesgo(item)}
      />

      {/* Main bento layout: Side selectors (3/12) + Main table (9/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Evidence check selectors & Legend */}
        <div className="lg:col-span-3 h-fit">
          <PhaseSelector
            fases={store.fases}
            hasPendingChanges={store.hasPendingChanges}
            onToggleFase={store.toggleFaseCheckbox}
            onToggleEvidencia={store.toggleEvidenciaCheckbox}
            onAplicarSeguimiento={store.aplicarSeguimiento}
          />
        </div>

        {/* Right Column: Complete Student Grid Table */}
        <div className="lg:col-span-9 h-full">
          <AlertTable
            aprendices={store.aprendices}
            fichaInfo={fichaInfo}
            selectedIds={store.selectedAprendicesIds}
            filterSearch={store.filterSearch}
            onFilterSearchChange={store.setFilterSearch}
            filterRiesgo={store.filterRiesgo}
            onFilterRiesgoChange={store.setFilterRiesgo}
            filterEstado={store.filterEstado}
            onFilterEstadoChange={store.setFilterEstado}
            sortColumn={store.sortColumn}
            onSortColumnChange={store.setSortColumn}
            sortDirection={store.sortDirection}
            onSortDirectionChange={store.setSortDirection}
            onToggleSelect={store.toggleSeleccionAprendiz}
            onToggleSelectAll={store.toggleSeleccionarTodos}
            onIntervenirIndividual={triggerIndividualIntervention}
            onIntervenirMasivo={triggerBulkIntervention}
          />
        </div>

      </div>

      {/* Modals Containers */}
      
      {/* 1. Strategy Assignment Modal */}
      <StrategyModal
        isOpen={isStrategyOpen}
        onClose={() => setIsStrategyOpen(false)}
        aprendiz={strategySingleTarget}
        aprendicesMasivos={strategyMassTarget}
        instructorNombreActual={fichaInfo.instructor}
        onGuardar={handleGuardarIntervencion}
      />

      {/* 2. Download formal PDF/Excel Options Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        aprendices={store.aprendices}
        fichaInfo={fichaInfo}
      />

    </div>
  );
}
