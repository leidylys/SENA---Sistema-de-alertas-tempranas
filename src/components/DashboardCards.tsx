import React from 'react';
import { Users, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DashboardCardsProps {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  selectedFilter: 'Todos' | 'Alto' | 'Medio' | 'Bajo';
  onFilterSelect: (filter: 'Todos' | 'Alto' | 'Medio' | 'Bajo') => void;
}

export default function DashboardCards({
  total,
  alto,
  medio,
  bajo,
  selectedFilter,
  onFilterSelect
}: DashboardCardsProps) {
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metric-cards-row">
      
      {/* 1. Total Card - Dark Green */}
      <button
        type="button"
        onClick={() => onFilterSelect('Todos')}
        className={`p-4 rounded-xl text-left transition-all relative overflow-hidden group shadow-xs border-b-4 border-l border-t border-r ${
          selectedFilter === 'Todos'
            ? 'bg-[#007832] text-white border-[#007832] border-b-[#39A900]'
            : 'bg-white text-slate-800 border-slate-200 border-b-slate-350 hover:border-sena-300 hover:shadow-sm'
        }`}
        title="Filtrar por todos los aprendices"
        id="metric-card-total"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'Todos' ? 'text-sena-100' : 'text-slate-400'}`}>
              Total Aprendices
            </span>
            <span className="block text-3xl font-black leading-none tracking-tight">
              {total}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${selectedFilter === 'Todos' ? 'bg-[#39A900] text-white' : 'bg-slate-50 text-[#007832]'}`}>
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className={`mt-2 text-[10.5px] font-medium leading-normal ${selectedFilter === 'Todos' ? 'text-sena-100/90' : 'text-slate-500'}`}>
          Vista general de matriculados en la ficha.
        </div>
      </button>

      {/* 2. Riesgo Alto - Red */}
      <button
        type="button"
        onClick={() => onFilterSelect('Alto')}
        className={`p-4 rounded-xl text-left transition-all relative overflow-hidden group shadow-xs border-b-4 border-l border-t border-r ${
          selectedFilter === 'Alto'
            ? 'bg-red-650 text-white border-red-650 border-b-red-800'
            : 'bg-white text-slate-800 border-slate-200 border-b-slate-350 hover:border-red-350 hover:shadow-sm'
        }`}
        title="Filtrar por aprendices en riesgo ALTO (Rojo)"
        id="metric-card-alto"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'Alto' ? 'text-red-100' : 'text-slate-400'}`}>
              Riesgo Alto (≥6)
            </span>
            <span className="block text-3xl font-black leading-none tracking-tight">
              {alto}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${selectedFilter === 'Alto' ? 'bg-red-800 text-white' : 'bg-red-50 text-red-600'}`}>
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className={`mt-2 text-[10.5px] font-medium leading-normal ${selectedFilter === 'Alto' ? 'text-red-100/90' : 'text-slate-500'}`}>
          Puntaje de alerta alto o inactivos.
        </div>
      </button>

      {/* 3. Riesgo Medio - Amber */}
      <button
        type="button"
        onClick={() => onFilterSelect('Medio')}
        className={`p-4 rounded-xl text-left transition-all relative overflow-hidden group shadow-xs border-b-4 border-l border-t border-r ${
          selectedFilter === 'Medio'
            ? 'bg-amber-500 text-white border-amber-500 border-b-amber-700'
            : 'bg-white text-slate-800 border-slate-200 border-b-slate-350 hover:border-amber-350 hover:shadow-sm'
        }`}
        title="Filtrar por aprendices en riesgo MEDIO (Naranja)"
        id="metric-card-medio"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'Medio' ? 'text-amber-100' : 'text-slate-400'}`}>
              Riesgo Medio (3UI-5)
            </span>
            <span className="block text-3xl font-black leading-none tracking-tight">
              {medio}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${selectedFilter === 'Medio' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className={`mt-2 text-[10.5px] font-medium leading-normal ${selectedFilter === 'Medio' ? 'text-amber-100/90' : 'text-slate-500'}`}>
          Puntaje intermedio. En observación activa.
        </div>
      </button>

      {/* 4. Riesgo Bajo - Green */}
      <button
        type="button"
        onClick={() => onFilterSelect('Bajo')}
        className={`p-4 rounded-xl text-left transition-all relative overflow-hidden group shadow-xs border-b-4 border-l border-t border-r ${
          selectedFilter === 'Bajo'
            ? 'bg-emerald-600 text-white border-emerald-600 border-b-emerald-800'
            : 'bg-white text-slate-800 border-slate-200 border-b-slate-350 hover:border-emerald-300 hover:shadow-sm'
        }`}
        title="Filtrar por aprendices en riesgo BAJO (Verde)"
        id="metric-card-bajo"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'Bajo' ? 'text-emerald-100' : 'text-slate-400'}`}>
              Riesgo Bajo (0-2)
            </span>
            <span className="block text-3xl font-black leading-none tracking-tight">
              {bajo}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${selectedFilter === 'Bajo' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className={`mt-2 text-[10.5px] font-medium leading-normal ${selectedFilter === 'Bajo' ? 'text-emerald-100/90' : 'text-slate-500'}`}>
          Al día en entregas o puntajes mínimos.
        </div>
      </button>

    </div>
  );
}
