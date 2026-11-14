import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  HelpCircle,
  ListTodo,
  ChevronRight,
  BookOpen,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { ConfirmModal } from '../common/Modal.jsx';
import { TopicoModal } from './TopicoModal.jsx';
import { calcularProgressoEdital } from '../../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function EditalVerticalizado({ disciplina, onVoltar }) {
  const { state, dispatch } = useStudyStore();

  // Tópicos desta disciplina
  const topicosDaDisc = useMemo(() => {
    return state.topicos.filter((t) => t.disciplinaId === disciplina?.id);
  }, [state.topicos, disciplina?.id]);

  // Separa tópicos de Nível 1 (raiz) e Nível 2 (subtópicos)
  const topicosNivel1 = useMemo(() => {
    return topicosDaDisc.filter((t) => !t.parentId);
  }, [topicosDaDisc]);

  const subtopicosPorPai = useMemo(() => {
    const mapa = new Map();
    topicosDaDisc.forEach((t) => {
      if (t.parentId) {
        if (!mapa.has(t.parentId)) {
          mapa.set(t.parentId, []);
        }
        mapa.get(t.parentId).push(t);
      }
    });
    return mapa;
  }, [topicosDaDisc]);

  // Progresso do edital desta disciplina em tempo real
  const progresso = useMemo(() => {
    return calcularProgressoEdital(topicosDaDisc);
  }, [topicosDaDisc]);

  // Estado dos modais
  const [modalTopicoOpen, setModalTopicoOpen] = useState(false);
  const [topicoParaEditar, setTopicoParaEditar] = useState(null);
  const [parentParaSubtopico, setParentParaSubtopico] = useState(null);

  // Confirmação de exclusão de tópico
  const [topicoParaExcluir, setTopicoParaExcluir] = useState(null);

  function handleOpenNovoRaiz() {
    setTopicoParaEditar(null);
    setParentParaSubtopico(null);
    setModalTopicoOpen(true);
  }

  function handleOpenNovoSubtopico(pai) {
    setTopicoParaEditar(null);
    setParentParaSubtopico(pai);
    setModalTopicoOpen(true);
  }

  function handleOpenEditar(topico) {
    setTopicoParaEditar(topico);
    setParentParaSubtopico(null);
    setModalTopicoOpen(true);
  }

  function handleToggleCheckbox(topicoId, campo) {
    // CRITÉRIO DE ACEITE: marcar checkboxes atualiza os percentuais imediatamente
    dispatch({
      type: ACTION_TYPES.TOGGLE_TOPICO_STATUS,
      payload: { topicoId, campo },
    });
  }

  function handleMoveTopico(topicoId, direction) {
    dispatch({
      type: ACTION_TYPES.MOVE_TOPICO,
      payload: { topicoId, direction },
    });
  }

  function handleConfirmExcluirTopico() {
    if (topicoParaExcluir) {
      dispatch({
        type: ACTION_TYPES.DELETE_TOPICO,
        payload: topicoParaExcluir.id,
      });
      setTopicoParaExcluir(null);
    }
  }

  if (!disciplina) return null;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header da Disciplina com Progresso do Edital */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121c33] border border-[#1e2f52] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="w-5 h-5 rounded-lg mt-1 shrink-0 shadow-md"
              style={{ backgroundColor: disciplina.cor }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Edital Verticalizado
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#172440] text-slate-300 whitespace-nowrap">
                  Peso {disciplina.peso} | Dif {disciplina.dificuldade} | Dom {disciplina.dominio}%
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5 truncate">
                {disciplina.nome}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onVoltar && (
              <Button variant="outline" size="sm" onClick={onVoltar}>
                Voltar
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenNovoRaiz}
            >
              Novo Tópico
            </Button>
          </div>
        </div>

        {/* Barra de Progresso e Métricas do Edital Verticalizado */}
        <div className="mt-5 pt-4 border-t border-[#1d2c4c] space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">Conclusão do Edital:</span>
              <span className="font-mono font-extrabold text-base text-white">
                {progresso.percentual}%
              </span>
              <span className="text-slate-400 text-[11px]">
                ({progresso.teoriaConcluidas} de {progresso.totalTopicos} tópicos)
              </span>
            </div>
          </div>

          <ProgressBar
            value={progresso.teoriaConcluidas}
            max={progresso.totalTopicos || 1}
            customColor={disciplina.cor}
            height="h-3"
          />
        </div>
      </div>

      {/* Árvore de Tópicos (Até 2 níveis) */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 px-1">
          {/* Linha 1: Título com total de tópicos */}
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Conteúdo Programático ({topicosDaDisc.length} tópicos)
          </h3>

          {/* Linha 2: Níveis do edital */}
          <span className="text-[11px] text-slate-400">
            (Nível 1: Capítulos | Nível 2: Subtópicos)
          </span>

          {/* Linha 3: Legenda T / Q / R */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" /> T (Teoria)
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" /> Q (Questões)
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded bg-orange-500 shrink-0" /> R (Revisão)
            </span>
          </div>
        </div>

        {topicosDaDisc.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#121c33]/50 border border-dashed border-[#1d2c4c] space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Nenhum tópico cadastrado</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Adicione os tópicos do edital desta disciplina para acompanhar o cumprimento de Teoria, Questões e Revisão.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenNovoRaiz}
            >
              Adicionar Primeiro Tópico
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topicosNivel1.map((topicoRaiz, indexRaiz) => {
              const subtopicos = subtopicosPorPai.get(topicoRaiz.id) || [];
              const isFirstRaiz = indexRaiz === 0;
              const isLastRaiz = indexRaiz === topicosNivel1.length - 1;

              return (
                <div
                  key={topicoRaiz.id}
                  className="rounded-2xl bg-[#121c33] border border-[#1e2f52] overflow-hidden shadow-sm transition-all"
                >
                  {/* Linha do Tópico Nível 1 */}
                  <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131f38]/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                        {indexRaiz + 1}
                      </span>
                      <span className="text-sm font-bold text-white truncate">
                        {topicoRaiz.nome}
                      </span>
                      {subtopicos.length > 0 && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          {subtopicos.length} sub
                        </span>
                      )}
                    </div>

                    {/* Checkboxes T / Q / R e Ações do Nível 1 */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#1b2b4d] sm:border-0">
                      {/* Checkboxes de Edital Verticalizado */}
                      <div className="flex items-center gap-1 bg-[#0d1629] p-1 rounded-xl border border-[#1e2f52]">
                        <button
                          type="button"
                          onClick={() => handleToggleCheckbox(topicoRaiz.id, 'teoria')}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                            topicoRaiz.status?.teoria
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                              : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                          }`}
                          title="Teoria estudada (critério do edital)"
                        >
                          T
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCheckbox(topicoRaiz.id, 'questoes')}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                            topicoRaiz.status?.questoes
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                              : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                          }`}
                          title="Questões resolvidas"
                        >
                          Q
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCheckbox(topicoRaiz.id, 'revisao')}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                            topicoRaiz.status?.revisao
                              ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/30'
                              : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                          }`}
                          title="Revisão feita"
                        >
                          R
                        </button>
                      </div>

                      {/* Botões de Gestão: Subir, Descer, +Sub, Editar, Excluir */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={isFirstRaiz}
                          onClick={() => handleMoveTopico(topicoRaiz.id, 'up')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-[#1b2a4a] transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Subir posição"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLastRaiz}
                          onClick={() => handleMoveTopico(topicoRaiz.id, 'down')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-[#1b2a4a] transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Descer posição"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão de adicionar subtópico (Nível 2) */}
                        <button
                          type="button"
                          onClick={() => handleOpenNovoSubtopico(topicoRaiz)}
                          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[11px] font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                          title="Adicionar subtópico (Nível 2)"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Subtópico</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditar(topicoRaiz)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1b2a4a] transition-colors cursor-pointer"
                          title="Renomear tópico"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTopicoParaExcluir(topicoRaiz)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir tópico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtópicos (Nível 2) com linha guia visual */}
                  {subtopicos.length > 0 && (
                    <div className="p-2 sm:p-4 pt-2 border-t border-[#1d2c4c] bg-[#0c1424]/60 space-y-2">
                      {subtopicos.map((sub, indexSub) => {
                        const isFirstSub = indexSub === 0;
                        const isLastSub = indexSub === subtopicos.length - 1;

                        return (
                          <div
                            key={sub.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-[#111a2f] border border-[#1b2b4d] hover:border-slate-600 transition-colors ml-1 sm:ml-6 relative before:absolute before:-left-1 sm:before:-left-4 before:top-1/2 before:w-1.5 sm:before:w-3.5 before:h-px before:bg-[#23355b]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                {indexRaiz + 1}.{indexSub + 1}
                              </span>
                              <span className="text-xs font-medium text-slate-200 truncate">
                                {sub.nome}
                              </span>
                            </div>

                            {/* Checkboxes e Ações do Nível 2 */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1.5 sm:pt-0 border-t border-[#182645]/80 sm:border-0">
                              {/* Checkboxes de Edital Verticalizado */}
                              <div className="flex items-center gap-1 bg-[#090f1d] p-0.5 rounded-lg border border-[#1b2b4d]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckbox(sub.id, 'teoria')}
                                  className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                                    sub.status?.teoria
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                                  }`}
                                  title="Teoria estudada (critério do edital)"
                                >
                                  T
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckbox(sub.id, 'questoes')}
                                  className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                                    sub.status?.questoes
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                                  }`}
                                  title="Questões resolvidas"
                                >
                                  Q
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckbox(sub.id, 'revisao')}
                                  className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                                    sub.status?.revisao
                                      ? 'bg-orange-600 text-white shadow-sm'
                                      : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                                  }`}
                                  title="Revisão feita"
                                >
                                  R
                                </button>
                              </div>

                              {/* Ações do Nível 2: Subir, Descer, Editar, Excluir */}
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={isFirstSub}
                                  onClick={() => handleMoveTopico(sub.id, 'up')}
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded hover:bg-[#1b2a4a] transition-colors cursor-pointer disabled:cursor-not-allowed"
                                  title="Subir subtópico"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLastSub}
                                  onClick={() => handleMoveTopico(sub.id, 'down')}
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded hover:bg-[#1b2a4a] transition-colors cursor-pointer disabled:cursor-not-allowed"
                                  title="Descer subtópico"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditar(sub)}
                                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1b2a4a] transition-colors cursor-pointer"
                                  title="Renomear subtópico"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setTopicoParaExcluir(sub)}
                                  className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Excluir subtópico"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Adicionar/Editar Tópico ou Subtópico */}
      <TopicoModal
        isOpen={modalTopicoOpen}
        onClose={() => setModalTopicoOpen(false)}
        disciplinaId={disciplina.id}
        topicoParaEditar={topicoParaEditar}
        parentTopico={parentParaSubtopico}
      />

      {/* Confirmação de Exclusão de Tópico */}
      <ConfirmModal
        isOpen={Boolean(topicoParaExcluir)}
        onClose={() => setTopicoParaExcluir(null)}
        onConfirm={handleConfirmExcluirTopico}
        title="Excluir Tópico do Edital?"
        message={`Tem certeza que deseja remover o tópico "${topicoParaExcluir?.nome}"? ${
          !topicoParaExcluir?.parentId ? 'Seus subtópicos e revisões associadas também serão excluídos.' : ''
        }`}
        confirmText="Sim, excluir"
        variant="danger"
      />
    </div>
  );
}
