import React from 'react';
import {
  Compass,
  Timer,
  BookOpen,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { useStudyStore } from '../../store/StudyContext.jsx';

export function BottomNav({ currentTab, onChangeTab }) {
  const { state } = useStudyStore();
  const pendentesRevisoes = state.revisoes.filter((r) => r.status === 'pendente').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1527]/95 backdrop-blur-xl border-t border-[#1d2c4c] pb-safe">
      <div className="flex items-center justify-between px-2 h-16 max-w-md mx-auto relative">
        {/* 1. Plano */}
        <button
          type="button"
          onClick={() => onChangeTab('plano')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'plano' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform ${currentTab === 'plano' ? 'scale-110' : ''}`} />
          </div>
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${currentTab === 'plano' ? 'font-bold text-white' : ''}`}>
            Plano
          </span>
        </button>

        {/* 2. Estatísticas */}
        <button
          type="button"
          onClick={() => onChangeTab('estatisticas')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'estatisticas' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <BarChart3 className={`w-5 h-5 transition-transform ${currentTab === 'estatisticas' ? 'scale-110' : ''}`} />
          </div>
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${currentTab === 'estatisticas' ? 'font-bold text-white' : ''}`}>
            Estatísticas
          </span>
        </button>

        {/* 3. Cronômetro (Center Elevated Button) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={() => onChangeTab('cronometro')}
            className={`relative w-13 h-13 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
              currentTab === 'cronometro'
                ? 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-blue-500/50 scale-105 ring-4 ring-blue-500/30'
                : 'bg-gradient-to-tr from-blue-700 to-indigo-600 text-slate-100 shadow-blue-900/60 ring-2 ring-[#1d2c4c] hover:scale-105'
            }`}
            aria-label="Abrir Cronômetro de Estudos"
          >
            <Timer className="w-6 h-6 animate-pulse" />
            <span className="text-[9px] font-bold tracking-tight text-white mt-0.5">Foco</span>
          </button>
        </div>

        {/* 4. Matérias */}
        <button
          type="button"
          onClick={() => onChangeTab('materias')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'materias' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <BookOpen className={`w-5 h-5 transition-transform ${currentTab === 'materias' ? 'scale-110' : ''}`} />
          </div>
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${currentTab === 'materias' ? 'font-bold text-white' : ''}`}>
            Matérias
          </span>
        </button>

        {/* 5. Revisões */}
        <button
          type="button"
          onClick={() => onChangeTab('revisoes')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'revisoes' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <RotateCcw className={`w-5 h-5 transition-transform ${currentTab === 'revisoes' ? 'scale-110' : ''}`} />
            {pendentesRevisoes > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {pendentesRevisoes}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${currentTab === 'revisoes' ? 'font-bold text-white' : ''}`}>
            Revisões
          </span>
        </button>
      </div>
    </nav>
  );
}
