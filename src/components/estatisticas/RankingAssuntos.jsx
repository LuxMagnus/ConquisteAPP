import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { AlertTriangle, CheckCircle, TrendingDown, HelpCircle, ArrowDownUp, ShieldAlert, Filter } from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar.jsx';

export function RankingAssuntos({
  rankingAssuntos = [],
  assuntosPendentes = [],
  todosAssuntos = [],
  filtroTempoLabel = '',
  filtroPeriodo = 'tudo',
}) {
  const [mostrarPendentes, setMostrarPendentes] = useState(false);
  const [apenasRobusto, setApenasRobusto] = useState(false);

  // Se houver filtro ativo e poucos itens com >=10 questões, mostra todos os tópicos avaliados no período
  const listaExibida = useMemo(() => {
    if (apenasRobusto) return rankingAssuntos;
    if (todosAssuntos && todosAssuntos.length > 0) return todosAssuntos;
    if (rankingAssuntos.length > 0) return rankingAssuntos;
    return assuntosPendentes;
  }, [apenasRobusto, rankingAssuntos, todosAssuntos, assuntosPendentes]);

  const temQualificados = listaExibida.length > 0;

  function getStatusCor(taxa) {
    if (taxa < 60) {
      return {
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        barColor: 'bg-rose-500 shadow-rose-500/20',
        texto: 'Crítico (< 60%)',
      };
    }
    if (taxa < 75) {
      return {
        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        barColor: 'bg-amber-500 shadow-amber-500/20',
        texto: 'Atenção (60-74%)',
      };
    }
    if (taxa < 85) {
      return {
        badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        barColor: 'bg-blue-500 shadow-blue-500/20',
        texto: 'Regular (75-84%)',
      };
    }
    return {
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      barColor: 'bg-emerald-500 shadow-emerald-500/20',
      texto: 'Dominado (≥ 85%)',
    };
  }

  return (
    <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#1d2c4c]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <CardTitle className="text-sm sm:text-base text-white leading-tight">
                Ranking de Assuntos: Do Pior ao Melhor
              </CardTitle>
              {filtroTempoLabel && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 hidden sm:flex items-center gap-1 shrink-0">
                  <Filter className="w-3 h-3" />
                  {filtroTempoLabel}
                </span>
              )}
            </div>
            {filtroTempoLabel && (
              <div className="sm:hidden mt-1 pl-8">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                  <Filter className="w-2.5 h-2.5" />
                  {filtroTempoLabel}
                </span>
              </div>
            )}
            <CardDescription className="mt-1 text-xs text-slate-400">
              Identifique gargalos de rendimento. Tópicos ordenados pela{' '}
              <span className="text-rose-400 font-semibold">menor taxa de acerto</span> no período selecionado.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            {rankingAssuntos.length > 0 && todosAssuntos.length > rankingAssuntos.length && (
              <button
                type="button"
                onClick={() => setApenasRobusto((v) => !v)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  apenasRobusto
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#0b1120] text-slate-300 hover:text-white border-[#1d2c4c]'
                }`}
              >
                <ArrowDownUp className="w-3 h-3 text-amber-400" />
                {apenasRobusto ? 'Apenas ≥ 10 Q' : 'Todos com exercícios'}
              </button>
            )}
            {!apenasRobusto && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-[#1d2c4c] font-medium">
                {listaExibida.length} {listaExibida.length === 1 ? 'assunto' : 'assuntos'} avaliados
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-4 space-y-3">
        {!temQualificados ? (
          <div className="p-6 text-center bg-[#0b1120]/70 rounded-xl border border-dashed border-[#1d2c4c] space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">
              Nenhum exercício resolvido no período selecionado
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Realize questões nas sessões de estudo deste período para visualizar os tópicos com menor e maior aproveitamento.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {listaExibida.map((item, index) => {
              const status = getStatusCor(item.taxa);
              const isPior = index === 0;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all duration-200 ${
                    isPior
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : 'bg-[#0b1120]/60 border-[#1d2c4c] hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Posição + Identificação */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-xs shrink-0 ${
                          isPior
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                            : index === 1
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : index === 2
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: `${item.disciplinaCor}15`,
                              borderColor: `${item.disciplinaCor}40`,
                              color: item.disciplinaCor,
                            }}
                          >
                            {item.disciplinaNome}
                          </span>
                          {isPior && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Ponto Mais Crítico
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                          {item.topicoNome}
                        </h4>
                      </div>
                    </div>

                    {/* Taxa de acerto e números */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {item.questoesAcertos} de {item.questoesFeitas} acertos
                        </span>
                        <span className="text-[10px] text-rose-400 font-mono">
                          {item.questoesErros} erros
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg border ${status.badgeBg}`}
                        >
                          {item.taxa}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso do acerto */}
                  <div className="mt-2.5 pt-2 border-t border-[#1d2c4c]/50">
                    <div className="w-full bg-[#0d1629] h-2 rounded-full overflow-hidden border border-[#1d2c4c]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
                        style={{ width: `${item.taxa}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tópicos com menos de 10 questões (aguardando qualificação) */}
        {assuntosPendentes.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMostrarPendentes((v) => !v)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>
                {mostrarPendentes ? 'Ocultar' : 'Ver'} tópicos em amostragem (&lt; 10 questões) ({assuntosPendentes.length})
              </span>
            </button>

            {mostrarPendentes && (
              <div className="mt-2 p-3 bg-[#0b1120]/80 rounded-xl border border-[#1d2c4c] space-y-2 text-xs animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-400">
                  Estes tópicos já possuem resoluções registradas, mas ainda não atingiram o limite mínimo de 10 questões para figurar no ranking principal:
                </p>
                <div className="divide-y divide-[#1d2c4c]/60">
                  {assuntosPendentes.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400">{item.disciplinaNome}</span>
                        <p className="font-semibold text-slate-200 truncate text-xs">{item.topicoNome}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-slate-300">
                          {item.questoesAcertos}/{item.questoesFeitas} ({item.taxa}%)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold">
                          Faltam {10 - item.questoesFeitas} Q
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
