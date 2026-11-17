import React from 'react';
import {
  Compass,
  Timer,
  BookOpen,
  BarChart3,
  RotateCcw,
  Settings,
  Sparkles,
  Award,
  Layers,
  Crown,
} from 'lucide-react';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export const NAV_ITEMS = [
  { id: 'plano', label: 'Plano', icon: Compass, description: 'Ciclos e Agenda' },
  { id: 'cronometro', label: 'Cronômetro', icon: Timer, description: 'Foco e Sessões' },
  { id: 'materias', label: 'Matérias', icon: BookOpen, description: 'Disciplinas e Tópicos' },
  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3, description: 'Desempenho' },
  { id: 'revisoes', label: 'Revisões', icon: RotateCcw, description: 'Espaçadas' },
];

export function Sidebar({ currentTab, onChangeTab, onOpenSettings, onOpenAssinatura }) {
  const { state, dispatch, provaAtiva } = useStudyStore();

  const pendentesRevisoes = state.revisoes.filter((r) => r.status === 'pendente').length;
  const totalDisciplinas = state.disciplinas.length;

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-[#0d1527] border-r border-[#1d2c4c] p-4 shrink-0 sticky top-0 h-screen overflow-y-auto no-scrollbar justify-between gap-6 select-none">
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white tracking-tight">
              Conquiste
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v0.1
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Gestão de Estudos</p>
        </div>

        {/* Prova Card / Active Target */}
        <div className="p-3.5 rounded-2xl bg-[#121c33] border border-[#1d2c4c] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Concurso Alvo
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              Ativo
            </span>
          </div>
          <h4 className="text-xs font-bold text-white truncate">
            {provaAtiva ? provaAtiva.nome : 'Nenhum concurso configurado'}
          </h4>
          <div className="mt-2 pt-2 border-t border-[#1d2c4c]/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{totalDisciplinas} disciplinas</span>
            <span>{state.sessoes.length} sessões</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1.5">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Menu Principal
          </span>
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            let badge = null;

            if (item.id === 'revisoes' && pendentesRevisoes > 0) {
              badge = pendentesRevisoes;
            } else if (item.id === 'materias' && totalDisciplinas > 0) {
              badge = totalDisciplinas;
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-semibold text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30 translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-[#142038] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#182542] text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">{item.label}</p>
                    <p className={`text-[11px] font-normal ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>

                {badge !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/30 text-white'
                        : item.id === 'revisoes'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Settings in Sidebar */}
      <div className="space-y-3 pt-4 border-t border-[#1d2c4c]">
        {totalDisciplinas === 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: ACTION_TYPES.LOAD_SAMPLE_DATA })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-emerald-600/20 hover:from-blue-600/30 hover:to-emerald-600/30 border border-blue-500/30 text-xs font-semibold text-blue-300 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Carregar Dados de Exemplo</span>
          </button>
        )}

        {/* Card / Botão de Assinatura (14 dias de teste) */}
        <button
          type="button"
          onClick={onOpenAssinatura}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-amber-200 transition-all text-xs font-semibold cursor-pointer shadow-sm text-left group"
        >
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-xs truncate">Conquiste Premium</p>
              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-bold rounded">
                14d grátis
              </span>
            </div>
            <p className="text-[10px] text-amber-300/80 mt-0.5 truncate">
              Mensal, Trimestral ou Anual
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#121c33] hover:bg-[#182542] border border-[#1d2c4c] text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <div className="text-left flex-1">
            <p>Configurações & Backup</p>
            <p className="text-[10px] text-slate-500 font-normal">Chave Gemini, Import/Export</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
