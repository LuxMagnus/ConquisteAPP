import React, { useState, useMemo } from 'react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  BookOpen,
  Calendar,
  FileText,
  Percent,
  Bookmark,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { ConfirmModal } from '../common/Modal.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';
import { formatarSegundos, formatarDataHora } from '../../lib/dateUtils.js';

export function HistoricoSessoes({ maxItems = null, showFilter = true }) {
  const { state, dispatch } = useStudyStore();
  const [filtroDisciplina, setFiltroDisciplina] = useState('todas');
  const [termoBusca, setTermoBusca] = useState('');
  const [sessaoParaExcluir, setSessaoParaExcluir] = useState(null);

  const sessoes = state.sessoes || [];

  const sessoesFiltradas = useMemo(() => {
    return sessoes.filter((s) => {
      if (filtroDisciplina !== 'todas' && s.disciplinaId !== filtroDisciplina) {
        return false;
      }
      if (termoBusca.trim()) {
        const busca = termoBusca.toLowerCase();
        const disc = state.disciplinas.find((d) => d.id === s.disciplinaId);
        const topico = state.topicos.find((t) => t.id === s.topicoId);
        const matchDisc = disc?.nome?.toLowerCase().includes(busca);
        const matchTopico = topico?.nome?.toLowerCase().includes(busca);
        const matchObs = s.observacao?.toLowerCase().includes(busca);
        if (!matchDisc && !matchTopico && !matchObs) return false;
      }
      return true;
    });
  }, [sessoes, filtroDisciplina, termoBusca, state.disciplinas, state.topicos]);

  const listaExibicao = maxItems ? sessoesFiltradas.slice(0, maxItems) : sessoesFiltradas;

  function confirmarExclusao() {
    if (sessaoParaExcluir) {
      dispatch({ type: ACTION_TYPES.DELETE_SESSAO, payload: sessaoParaExcluir.id });
      setSessaoParaExcluir(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros e Barra de Pesquisa */}
      {showFilter && sessoes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#121c33] border border-[#1e2f52]">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Buscar por matéria, tópico ou anotação..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 w-full focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="bg-[#172440] border border-[#23355b] text-slate-200 rounded-xl px-2.5 py-1.5 text-xs max-w-[200px] sm:max-w-xs truncate focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="todas">Todas as matérias</option>
              {state.disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Lista de Sessões */}
      {sessoes.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nenhuma sessão registrada ainda"
          description="Inicie o cronômetro para cronometrar seu tempo de estudo, pausas e resolução de questões."
        />
      ) : listaExibicao.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#121c33] border border-[#1e2f52]">
          <p className="text-sm text-slate-400">
            Nenhuma sessão encontrada para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {listaExibicao.map((sessao) => {
            const disc = state.disciplinas.find((d) => d.id === sessao.disciplinaId);
            const topico = state.topicos.find((t) => t.id === sessao.topicoId);
            const temQuestoes = sessao.questoesFeitas > 0;
            const pct = temQuestoes
              ? Math.round((sessao.questoesAcertos / sessao.questoesFeitas) * 100)
              : null;

            return (
              <div
                key={sessao.id}
                className="p-4 rounded-2xl bg-[#121c33] border border-[#1e2f52] hover:border-[#2d426d] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Lado Esquerdo: Info da Disciplina & Tópico */}
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 shadow-sm"
                    style={{ backgroundColor: disc?.cor || '#38bdf8' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {disc?.nome || 'Disciplina Geral'}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {sessao.tipo || 'teoria'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-0.5 truncate">
                      {topico ? topico.nome : 'Estudo geral sem tópico específico'}
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{formatarDataHora(sessao.inicioISO)}</span>
                    </p>

                    {sessao.pontoDeParada && (
                      <p className="text-xs text-amber-300/90 mt-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25 flex items-start gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Ponto de Parada:</strong> {sessao.pontoDeParada}</span>
                      </p>
                    )}

                    {sessao.observacao && (
                      <p className="text-xs text-slate-400 mt-2 bg-[#0d1629] p-2.5 rounded-xl border border-[#1e2f52] flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="italic">{sessao.observacao}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Métricas de Tempo e Questões */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1e2f52]/60 shrink-0">
                  {/* Foco Líquido */}
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-white bg-[#172440] px-2.5 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{formatarSegundos(sessao.segundosEstudo)}</span>
                    </div>
                    {sessao.segundosPausa > 0 && (
                      <span className="text-[10px] text-slate-400 block mt-0.5 sm:text-right">
                        Pausa: {formatarSegundos(sessao.segundosPausa)}
                      </span>
                    )}
                  </div>

                  {/* Exercícios */}
                  {temQuestoes ? (
                    <div className="flex flex-col items-end">
                      <div
                        className={`text-xs font-bold font-mono px-2.5 py-1 rounded-xl border ${
                          pct >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : pct >= 60
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {sessao.questoesAcertos}/{sessao.questoesFeitas} ({pct}%)
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5">acertos</span>
                    </div>
                  ) : null}

                  {/* Exclusão com confirmação */}
                  <button
                    type="button"
                    onClick={() => setSessaoParaExcluir(sessao)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                    title="Excluir sessão"
                    aria-label="Excluir sessão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        isOpen={Boolean(sessaoParaExcluir)}
        onClose={() => setSessaoParaExcluir(null)}
        onConfirm={confirmarExclusao}
        title="Excluir Sessão de Estudo"
        message="Tem certeza que deseja apagar o registro desta sessão? Os minutos estudados continuarão salvos no ciclo atual, mas o histórico detalhado será removido."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
