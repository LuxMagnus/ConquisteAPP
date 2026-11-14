import React, { useState, useMemo } from 'react';
import {
  Award,
  ArrowUpDown,
  Sliders,
  Sparkles,
  Info,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { Button } from '../common/Button.jsx';
import { calcularPrioridade } from '../../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function RankingPrioridade({ onSelectDisciplina }) {
  const { disciplinasDaProva, dispatch } = useStudyStore();
  const [criterioOrdenacao, setCriterioOrdenacao] = useState('prioridade_desc');

  // Calcula prioridades e enriquece lista de disciplinas
  const disciplinasComPrioridade = useMemo(() => {
    return disciplinasDaProva.map((d) => {
      const prioridade = calcularPrioridade(d.peso, d.dificuldade, d.dominio);
      const deficit = Math.round((1 - (d.dominio / 100)) * 100);
      return {
        ...d,
        prioridade,
        deficit,
      };
    });
  }, [disciplinasDaProva]);

  // Ordenação de acordo com a seleção do usuário
  const rankingOrdenado = useMemo(() => {
    const lista = [...disciplinasComPrioridade];

    switch (criterioOrdenacao) {
      case 'prioridade_desc':
        return lista.sort((a, b) => b.prioridade - a.prioridade);
      case 'prioridade_asc':
        return lista.sort((a, b) => a.prioridade - b.prioridade);
      case 'dominio_asc':
        return lista.sort((a, b) => a.dominio - b.dominio);
      case 'dominio_desc':
        return lista.sort((a, b) => b.dominio - a.dominio);
      case 'peso_desc':
        return lista.sort((a, b) => b.peso - a.peso);
      case 'dificuldade_desc':
        return lista.sort((a, b) => b.dificuldade - a.dificuldade);
      case 'nome_asc':
        return lista.sort((a, b) => a.nome.localeCompare(b.nome));
      default:
        return lista.sort((a, b) => b.prioridade - a.prioridade);
    }
  }, [disciplinasComPrioridade, criterioOrdenacao]);

  // Altera domínio em tempo real via slider
  // CRITÉRIO DE ACEITE: o ranking muda ao alterar domínio
  function handleDominioChange(disc, novoDominio) {
    const val = Math.max(0, Math.min(100, Number(novoDominio) || 0));
    dispatch({
      type: ACTION_TYPES.UPDATE_DISCIPLINA,
      payload: {
        ...disc,
        dominio: val,
      },
    });
  }

  function getBadgePrioridade(prioridade) {
    if (prioridade >= 18) {
      return {
        label: 'Altíssima Urgência',
        bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        dot: 'bg-rose-400',
      };
    }
    if (prioridade >= 10) {
      return {
        label: 'Atenção Elevada',
        bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        dot: 'bg-orange-400',
      };
    }
    if (prioridade >= 5) {
      return {
        label: 'Atenção Média',
        bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        dot: 'bg-blue-400',
      };
    }
    return {
      label: 'Domínio Satisfatório',
      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400',
    };
  }

  if (disciplinasDaProva.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[#121c33]/50 border border-dashed border-[#1d2c4c] text-slate-400">
        Cadastre disciplinas na prova ativa para visualizar o ranking de prioridades.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Box Didático da Fórmula */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-[#121c33] border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Algoritmo de Priorização Inteligente
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Fórmula de Prioridade por Disciplina
            </h3>
            <p className="text-xs text-slate-300 font-mono">
              Prioridade = <span className="text-blue-400">Peso (1–10)</span> ×{' '}
              <span className="text-orange-400">Dificuldade (1–5)</span> ×{' '}
              <span className="text-emerald-400">(1 − Domínio / 100)</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-3 rounded-xl bg-[#0b1222] border border-[#1e2f52] text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Como Funciona
              </span>
              <p className="text-[11px] text-slate-300 leading-snug max-w-xs">
                Disciplinas com alto peso, alta dificuldade e menor domínio sobem para o topo da fila de estudos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#1d2c4c]">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Ranking de Prioridade ({rankingOrdenado.length} matérias)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            Ordenar por:
          </label>
          <select
            value={criterioOrdenacao}
            onChange={(e) => setCriterioOrdenacao(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="prioridade_desc">Maior Prioridade (Padrão)</option>
            <option value="prioridade_asc">Menor Prioridade</option>
            <option value="dominio_asc">Menor Domínio (Maior Déficit)</option>
            <option value="dominio_desc">Maior Domínio</option>
            <option value="peso_desc">Maior Peso no Edital</option>
            <option value="dificuldade_desc">Maior Dificuldade Pessoal</option>
            <option value="nome_asc">Nome (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Lista / Ranking */}
      <div className="space-y-3">
        {rankingOrdenado.map((disc, index) => {
          const badge = getBadgePrioridade(disc.prioridade);
          const isTop3 = index < 3;

          return (
            <div
              key={disc.id}
              className={`p-4 sm:p-5 rounded-2xl bg-[#121c33] border transition-all duration-200 shadow-md ${
                index === 0
                  ? 'border-blue-500/50 bg-gradient-to-r from-blue-950/20 to-[#121c33]'
                  : 'border-[#1e2f52] hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Posição no Ranking + Nome da Matéria */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0 shadow-md ${
                      index === 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-900/20'
                        : index === 1
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                        : index === 2
                        ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                        : 'bg-[#182542] text-slate-400 border border-[#23355b]'
                    }`}
                  >
                    {index + 1}º
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: disc.cor }}
                      />
                      <h4 className="text-base font-bold text-white tracking-tight truncate">
                        {disc.nome}
                      </h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>

                      {disc.ativa === false ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30 shrink-0">
                          Pausada
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shrink-0">
                          No Ciclo
                        </span>
                      )}
                    </div>

                    {/* Breakdown da Fórmula em tempo real */}
                    <p className="text-xs text-slate-400 mt-1 font-mono flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-300 font-semibold">Cálculo:</span>
                      <span className="text-blue-400">Peso {disc.peso}</span>
                      <span>×</span>
                      <span className="text-orange-400">Dif {disc.dificuldade}</span>
                      <span>×</span>
                      <span className="text-emerald-400">Déficit {disc.deficit}%</span>
                      <span>=</span>
                      <span className="text-white font-bold text-sm bg-[#172440] px-1.5 py-0.5 rounded">
                        {disc.prioridade.toFixed(2)} pts
                      </span>
                    </p>
                  </div>
                </div>

                {/* Score de Prioridade em Destaque */}
                <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 border-t lg:border-t-0 border-[#1e2f52] pt-3 lg:pt-0">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Prioridade
                    </span>
                    <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
                      {disc.prioridade.toFixed(2)}
                    </span>
                  </div>

                  {onSelectDisciplina && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onSelectDisciplina(disc)}
                    >
                      Ver Edital
                    </Button>
                  )}
                </div>
              </div>

              {/* Slider de Domínio Interativo para teste instantâneo do aceite */}
              {/* "CRITÉRIO DE ACEITE: o ranking muda ao alterar domínio" */}
              <div className="mt-3.5 pt-3 border-t border-[#1d2c4c]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                  <span className="text-xs font-semibold text-slate-300 shrink-0">
                    Domínio Atual:
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    {disc.dominio}%
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono">0%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={disc.dominio}
                    onChange={(e) => handleDominioChange(disc, e.target.value)}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-[#0d1629] rounded-lg"
                    title={`Ajuste o domínio de ${disc.nome} (atualmente ${disc.dominio}%)`}
                  />
                  <span className="text-[10px] text-slate-500 font-mono">100%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
