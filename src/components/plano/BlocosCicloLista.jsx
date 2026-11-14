import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
} from 'lucide-react';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function BlocosCicloLista({ ciclo, disciplinas = [], onEstudarBloco }) {
  const { dispatch } = useStudyStore();
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  if (!ciclo || !Array.isArray(ciclo.blocos) || ciclo.blocos.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        Nenhum bloco cadastrado no ciclo de estudos.
      </div>
    );
  }

  function handleMove(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= ciclo.blocos.length || fromIdx === toIdx) return;
    const novosBlocos = [...ciclo.blocos];
    const [removido] = novosBlocos.splice(fromIdx, 1);
    novosBlocos.splice(toIdx, 0, removido);

    dispatch({
      type: ACTION_TYPES.REORDER_CICLO_BLOCOS,
      payload: {
        cicloId: ciclo.id,
        blocos: novosBlocos,
      },
    });
  }

  function handleDragStart(e, idx) {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  }

  function handleDrop(e, targetIdx) {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIdx) {
      handleMove(draggedIdx, targetIdx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleToggleConcluido(discId, statusAtual, blocoId) {
    dispatch({
      type: ACTION_TYPES.TOGGLE_CONCLUIR_BLOCO_CICLO,
      payload: {
        provaId: ciclo.provaId,
        disciplinaId: discId,
        blocoId: blocoId,
        concluido: !statusAtual,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 px-1 gap-1">
        <span className="font-bold uppercase tracking-wider text-slate-300">
          Ordem das Matérias no Ciclo ({ciclo.blocos.length} {ciclo.blocos.length === 1 ? 'sessão' : 'sessões'})
        </span>
        <span className="text-[11px] text-blue-400/90 font-medium">
          Arraste ou use as setas para reordenar a sequência de estudo
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ciclo.blocos.map((bloco, idx) => {
          // Busca a disciplina com suporte a coerção de id (string/number) e fallback ao state global
          const disc =
            disciplinas.find((d) => String(d.id) === String(bloco.disciplinaId)) ||
            state?.disciplinas?.find((d) => String(d.id) === String(bloco.disciplinaId)) ||
            null;

          const nomeMateria =
            disc?.nome ||
            bloco.disciplinaNome ||
            bloco.materiaNome ||
            bloco.nome ||
            `Disciplina ${idx + 1}`;

          const corMateria = disc?.cor || bloco.cor || '#38bdf8';

          const meta = Number(bloco.minutosMeta) || 0;
          const feitos = Number(bloco.minutosFeitos) || 0;
          const isConcluido = Boolean(bloco.concluido) || feitos >= meta;
          const pct = meta > 0 ? Math.min(100, Math.round((feitos / meta) * 100)) : 0;
          const faltam = Math.max(0, meta - feitos);

          const isDragging = draggedIdx === idx;
          const isOver = dragOverIdx === idx;

          return (
            <div
              key={bloco.id || `${bloco.disciplinaId}-${idx}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all select-none space-y-3 ${
                isDragging
                  ? 'opacity-40 scale-[0.98] border-dashed border-blue-400 bg-[#0e1728]'
                  : isOver
                  ? 'border-blue-400 bg-[#16274a] shadow-lg shadow-blue-500/20 translate-y-[-2px]'
                  : isConcluido
                  ? 'bg-[#121e36]/70 border-emerald-500/30'
                  : 'bg-[#131f38]/90 border-[#22355c] hover:border-blue-500/40 shadow-sm'
              }`}
            >
              {/* Linha Superior: Ordem, Matéria, Sessão e Badge de Status */}
              <div className="flex items-start justify-between gap-2.5">
                {/* Lado Esquerdo: Grip, Posição no Ciclo, Cor e Nome */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 -ml-1 rounded transition-colors touch-none shrink-0 pt-1"
                    title="Segure e arraste para alterar a ordem"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <span className="w-6 h-6 rounded-lg bg-[#1a2846] text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#2b4170] mt-0.5">
                    {idx + 1}º
                  </span>

                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm mt-1.5"
                    style={{ backgroundColor: corMateria }}
                  />

                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-snug"
                      title={nomeMateria}
                    >
                      {nomeMateria}
                    </h4>

                    {bloco.sessaoTotal > 1 && (
                      <div className="mt-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25 inline-flex items-center whitespace-nowrap">
                          Sessão {bloco.sessaoNumero || 1} de {bloco.sessaoTotal}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: StatusBadge (Concluído ou Faltam Xm) fixo e alinhado ao topo */}
                <div className="shrink-0 pt-0.5">
                  {isConcluido ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 whitespace-nowrap shadow-sm">
                      Faltam {faltam}m
                    </span>
                  )}
                </div>
              </div>


              {/* Linha Central: Métricas Alinhadas e Barra de Progresso */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Meta da sessão: <strong className="text-slate-200">{bloco.minutosMeta} min</strong> ({formatarMinutosHoras(bloco.minutosMeta)})</span>
                    <span>•</span>
                    <span>Feito: <strong className={isConcluido ? 'text-emerald-400' : 'text-blue-400'}>{bloco.minutosFeitos || 0} min</strong></span>
                    {bloco.minutosMetaTotalMateria && bloco.sessaoTotal > 1 && (
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        (Carga total na volta: {formatarMinutosHoras(bloco.minutosMetaTotalMateria)})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-white text-xs">
                    {pct}%
                  </span>
                </div>

                {/* Barra de Progresso elegante */}
                <div className="w-full bg-[#0a101d] h-2 rounded-full overflow-hidden p-0.5 border border-[#1b2b4d]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isConcluido ? '#10b981' : disc.cor,
                    }}
                  />
                </div>
              </div>

              {/* Linha Inferior: Controles de Reordenação e Botões de Ação */}
              <div className="pt-2 border-t border-[#1d2c4c]/60 flex items-center justify-between gap-2">
                {/* Controles de Reordenação Rápida (Setas compactas) */}
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center bg-[#0d1629] p-0.5 rounded-xl border border-[#1e2f52]">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, idx - 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2948] disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Mover para cima no ciclo"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-[#1e2f52]" />
                    <button
                      type="button"
                      disabled={idx === ciclo.blocos.length - 1}
                      onClick={() => handleMove(idx, idx + 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2948] disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Mover para baixo no ciclo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">Reordenar</span>
                </div>

                {/* Botões de Ação: Concluir e Estudar */}
                <div className="flex items-center gap-2">
                  {/* Botão de Conclusão Manual com Rótulo Claro */}
                  <button
                    type="button"
                    onClick={() => handleToggleConcluido(disc?.id || bloco.disciplinaId, isConcluido, bloco.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isConcluido
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-[#101b33] text-slate-300 border-[#22355c] hover:border-slate-400'
                    }`}
                    title={isConcluido ? 'Reabrir bloco no ciclo' : 'Marcar matéria como concluída no ciclo'}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isConcluido ? 'Reabrir' : 'Concluir'}</span>
                  </button>

                  {/* Botão Estudar */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onEstudarBloco) {
                        onEstudarBloco({
                          disciplinaId: disc?.id || bloco.disciplinaId,
                          blocoId: bloco.id,
                          topicoId: null,
                          duracaoBloco: faltam > 0 ? faltam : bloco.minutosMeta,
                          sessaoNumero: bloco.sessaoNumero,
                          sessaoTotal: bloco.sessaoTotal,
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                    title={`Estudar ${nomeMateria}`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Estudar</span>
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
