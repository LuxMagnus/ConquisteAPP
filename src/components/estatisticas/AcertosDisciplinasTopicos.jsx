import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { ChevronDown, ChevronRight, CheckCircle2, BookOpen, Layers, Award, Clock, Filter, Eye } from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function AcertosDisciplinasTopicos({
  dadosGerais,
  disciplinas = [],
  filtroTempoLabel = '',
  filtroDisciplinaId = 'todas',
  temFiltroAtivo = false,
}) {
  const [apenasComAtividade, setApenasComAtividade] = useState(temFiltroAtivo);

  // Sincroniza estado de ocultar vazias quando o filtro de tempo ou matéria muda
  useEffect(() => {
    if (temFiltroAtivo) {
      setApenasComAtividade(true);
    }
  }, [temFiltroAtivo]);

  // Lista de disciplinas filtradas
  const disciplinasFiltradas = useMemo(() => {
    let lista = disciplinas;
    if (filtroDisciplinaId !== 'todas') {
      lista = lista.filter((d) => d.id === filtroDisciplinaId);
    }
    if (apenasComAtividade) {
      const ativas = lista.filter((d) => d.questoesFeitas > 0 || d.segundosEstudo > 0);
      return ativas.length > 0 ? ativas : lista;
    }
    return lista;
  }, [disciplinas, filtroDisciplinaId, apenasComAtividade]);

  // Controle de expansão das disciplinas (por id)
  const [expandidos, setExpandidos] = useState(() => {
    const primeiraComQuestoes = disciplinas.find((d) => d.questoesFeitas > 0);
    return primeiraComQuestoes ? { [primeiraComQuestoes.id]: true } : {};
  });

  function toggleExpandir(discId) {
    setExpandidos((prev) => ({
      ...prev,
      [discId]: !prev[discId],
    }));
  }

  function expandirTodos() {
    const todos = {};
    disciplinasFiltradas.forEach((d) => {
      todos[d.id] = true;
    });
    setExpandidos(todos);
  }

  function recolherTodos() {
    setExpandidos({});
  }

  const taxaGeral = dadosGerais?.taxaAcerto || 0;
  const totalQuestoes = dadosGerais?.totalQuestoes || 0;
  const totalAcertos = dadosGerais?.totalAcertos || 0;
  const totalErros = dadosGerais?.totalErros || 0;

  return (
    <div className="space-y-4">
      {/* Card de Rendimento Geral */}
      <Card className="bg-[#121c33] border-[#1d2c4c]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Rendimento Geral em Questões
                  </span>
                  {filtroTempoLabel && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Filter className="w-2.5 h-2.5" />
                      {filtroTempoLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {taxaGeral}%
                  </h3>
                  <span className="text-xs text-slate-400">
                    {temFiltroAtivo ? 'de acertos no período selecionado' : 'de acertos globais'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs bg-[#0b1120] px-4 py-2.5 rounded-xl border border-[#1d2c4c] self-stretch sm:self-auto justify-around sm:justify-start">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Resolvidas</span>
                <span className="text-sm font-bold font-mono text-white">{totalQuestoes}</span>
              </div>
              <div className="w-px h-6 bg-[#1d2c4c]" />
              <div>
                <span className="text-[10px] text-emerald-400 block">Acertos</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{totalAcertos}</span>
              </div>
              <div className="w-px h-6 bg-[#1d2c4c]" />
              <div>
                <span className="text-[10px] text-rose-400 block">Erros</span>
                <span className="text-sm font-bold font-mono text-rose-400">{totalErros}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar
              value={totalAcertos}
              max={totalQuestoes || 1}
              color="emerald"
              height="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Disciplinas e Tópicos Expansíveis */}
      <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#1d2c4c]/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Layers className="w-4 h-4" />
                </span>
                <CardTitle className="text-base text-white">
                  Acertos por Disciplina e Tópico
                </CardTitle>
                {filtroTempoLabel && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    {filtroTempoLabel}
                  </span>
                )}
              </div>
              <CardDescription className="mt-1 text-xs text-slate-400">
                Abra cada disciplina para inspecionar o percentual detalhado de cada assunto no período.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => setApenasComAtividade((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    apenasComAtividade
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-[#0b1120] text-slate-300 hover:text-white border-[#1d2c4c]'
                  }`}
                  title="Alternar matérias com e sem atividade no período"
                >
                  <Eye className="w-3 h-3" />
                  {apenasComAtividade ? 'Ativas no período' : 'Todas as matérias'}
                </button>
              )}
              <button
                type="button"
                onClick={expandirTodos}
                className="px-2.5 py-1 rounded-lg bg-[#0b1120] text-slate-300 hover:text-white border border-[#1d2c4c] hover:bg-slate-800 transition cursor-pointer"
              >
                Expandir Todos
              </button>
              <button
                type="button"
                onClick={recolherTodos}
                className="px-2.5 py-1 rounded-lg bg-[#0b1120] text-slate-300 hover:text-white border border-[#1d2c4c] hover:bg-slate-800 transition cursor-pointer"
              >
                Recolher
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#1d2c4c]/60">
          {disciplinasFiltradas.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma disciplina com atividade registrada no período selecionado
            </div>
          ) : (
            disciplinasFiltradas.map((disc) => {
              const isAberto = Boolean(expandidos[disc.id]);
              const topicos = disc.topicos || [];
              const temQuestoes = disc.questoesFeitas > 0;

              return (
                <div key={disc.id} className="transition-colors hover:bg-white/[0.01]">
                  {/* Linha da Disciplina (Accordion Trigger) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpandir(disc.id)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleExpandir(disc.id)}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-slate-400 hover:text-white transition">
                        {isAberto ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>

                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: disc.cor }}
                      />

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {disc.nome}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {topicos.length} tópicos • {disc.questoesFeitas} questões resolvidas
                          {disc.segundosEstudo > 0 && ` • ${formatarMinutosHoras(Math.round(disc.segundosEstudo / 60))}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-7 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-slate-300">
                          {disc.questoesAcertos}/{disc.questoesFeitas} acertos
                        </span>
                        {disc.questoesErros > 0 && (
                          <span className="text-[10px] text-rose-400 block">
                            {disc.questoesErros} erros
                          </span>
                        )}
                      </div>

                      <div className="w-24 sm:w-28 text-right">
                        <span
                          className={`text-sm font-black font-mono px-2 py-0.5 rounded border ${
                            disc.taxa >= 80
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : disc.taxa >= 60
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {temQuestoes ? `${disc.taxa}%` : '--%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tópicos Expansíveis */}
                  {isAberto && (
                    <div className="bg-[#0b1120]/70 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-[#1d2c4c]/40 space-y-2 animate-in fade-in duration-150">
                      {topicos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2 pl-7">
                          Nenhum tópico cadastrado nesta disciplina
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {topicos.map((topico) => {
                            const topicoTemQuestoes = topico.questoesFeitas > 0;

                            return (
                              <div
                                key={topico.id}
                                className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  topico.parentId
                                    ? 'ml-4 sm:ml-6 bg-[#0e1628]/80 border-[#1d2c4c]/40'
                                    : 'bg-[#121c33]/60 border-[#1d2c4c]/60'
                                }`}
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  {topico.parentId && (
                                    <span className="text-slate-500 text-xs shrink-0">↳</span>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-200 truncate">
                                      {topico.nome}
                                    </p>
                                    <span className="text-[10px] text-slate-400">
                                      {topico.questoesFeitas > 0
                                        ? `${topico.questoesAcertos} acertos em ${topico.questoesFeitas} questões`
                                        : 'Nenhuma questão resolvida'}
                                      {topico.segundosEstudo > 0 &&
                                        ` • ${formatarMinutosHoras(Math.round(topico.segundosEstudo / 60))}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  {topicoTemQuestoes ? (
                                    <>
                                      <div className="w-16 sm:w-20 bg-[#0d1629] h-1.5 rounded-full overflow-hidden border border-[#1d2c4c]">
                                        <div
                                          className={`h-full rounded-full ${
                                            topico.taxa >= 80
                                              ? 'bg-emerald-400'
                                              : topico.taxa >= 60
                                              ? 'bg-amber-400'
                                              : 'bg-rose-400'
                                          }`}
                                          style={{ width: `${topico.taxa}%` }}
                                        />
                                      </div>
                                      <span
                                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                          topico.taxa >= 80
                                            ? 'text-emerald-400 bg-emerald-950/40'
                                            : topico.taxa >= 60
                                            ? 'text-amber-400 bg-amber-950/40'
                                            : 'text-rose-400 bg-rose-950/40'
                                        }`}
                                      >
                                        {topico.taxa}%
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">
                                      Sem questões
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
