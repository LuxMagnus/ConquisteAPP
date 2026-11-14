import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { Flame, Trophy, Calendar, Sparkles, ChevronLeft, ChevronRight, Info, Filter } from 'lucide-react';
import { calcularMapaCalorAnual } from '../../lib/estatisticasUtils.js';
import { formatarMinutosHoras, formatarData } from '../../lib/dateUtils.js';

export function MapaCalorAnual({
  sessoes = [],
  filtroPeriodo = 'tudo',
  dataInicio = '',
  dataFim = '',
  filtroTempoLabel = '',
  disciplinaNome = '',
}) {
  // Ano padrão: ano corrente ou ano com mais sessões (default 2026)
  const [ano, setAno] = useState(() => {
    if (sessoes.length > 0 && sessoes[0].inicioISO) {
      const parsed = parseInt(sessoes[0].inicioISO.slice(0, 4), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return new Date().getFullYear();
  });

  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const containerRef = useRef(null);

  // Sincroniza ano caso filtro seja 'mes_anterior' ou personalizado em outro ano
  useEffect(() => {
    if (filtroPeriodo === 'mes_anterior') {
      const agora = new Date();
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      setAno(mesAnt.getFullYear());
    } else if (filtroPeriodo === 'personalizado' && dataInicio) {
      const parsedAno = parseInt(dataInicio.slice(0, 4), 10);
      if (!isNaN(parsedAno)) setAno(parsedAno);
    }
  }, [filtroPeriodo, dataInicio]);

  const dadosCalor = useMemo(() => {
    return calcularMapaCalorAnual(sessoes, ano);
  }, [sessoes, ano]);

  // Intervalo do filtro temporal ativo para destaque no mapa
  const intervaloFiltro = useMemo(() => {
    if (!filtroPeriodo || filtroPeriodo === 'tudo') return null;

    const agora = new Date();
    const hojeYMD = agora.toISOString().split('T')[0];

    if (filtroPeriodo === 'hoje') {
      return { inicio: hojeYMD, fim: hojeYMD };
    }
    if (filtroPeriodo === '7d') {
      const d = new Date(agora.getTime() - 7 * 86400000);
      return { inicio: d.toISOString().split('T')[0], fim: hojeYMD };
    }
    if (filtroPeriodo === '30d') {
      const d = new Date(agora.getTime() - 30 * 86400000);
      return { inicio: d.toISOString().split('T')[0], fim: hojeYMD };
    }
    if (filtroPeriodo === 'mes') {
      const ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return { inicio: ini.toISOString().split('T')[0], fim: hojeYMD };
    }
    if (filtroPeriodo === 'mes_anterior') {
      const anoCur = agora.getFullYear();
      const mesCur = agora.getMonth();
      const ini = new Date(anoCur, mesCur - 1, 1);
      const fim = new Date(anoCur, mesCur, 0);
      return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] };
    }
    if (filtroPeriodo === 'ano') {
      const ini = new Date(ano, 0, 1);
      const fim = new Date(ano, 11, 31);
      return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] };
    }
    if (filtroPeriodo === 'personalizado') {
      return { inicio: dataInicio || '0000-00-00', fim: dataFim || '9999-99-99' };
    }
    return null;
  }, [filtroPeriodo, dataInicio, dataFim, ano]);

  // Estatísticas no intervalo do filtro
  const metricasPeriodo = useMemo(() => {
    if (!intervaloFiltro) return null;
    let diasEst = 0;
    let minTot = 0;

    dadosCalor.semanas.forEach((sem) => {
      sem.forEach((dia) => {
        if (!dia) return;
        if (dia.dataYMD >= intervaloFiltro.inicio && dia.dataYMD <= intervaloFiltro.fim) {
          if (dia.estudadoValido) diasEst++;
          minTot += dia.minutos;
        }
      });
    });

    return {
      diasEstudados: diasEst,
      totalHoras: Number((minTot / 60).toFixed(1)),
    };
  }, [intervaloFiltro, dadosCalor]);

  // Função para centralizar no dia de hoje (especialmente crucial em mobile)
  const scrollToHoje = (suave = true) => {
    if (!containerRef.current || !dadosCalor?.semanas?.length) return;
    const agora = new Date();
    const hojeYMD = agora.toISOString().split('T')[0];
    const anoAtual = agora.getFullYear();

    // Procura a coluna onde hoje está localizado
    let targetCol = -1;
    for (let c = 0; c < dadosCalor.semanas.length; c++) {
      const col = dadosCalor.semanas[c];
      if (col && col.some((d) => d && d.dataYMD === hojeYMD)) {
        targetCol = c;
        break;
      }
    }

    // Se não encontrou hoje no ano atual (ou ano diferente)
    if (targetCol === -1) {
      if (ano < anoAtual) {
        targetCol = Math.max(0, dadosCalor.semanas.length - 1);
      } else {
        targetCol = 0;
      }
    }

    // Cada coluna tem 12px de largura + 3px de gap = 15px. Labels à esquerda têm ~36px.
    const colWidth = 15;
    const labelWidth = 36;
    const targetX = labelWidth + targetCol * colWidth;
    const containerWidth = containerRef.current.clientWidth || 360;

    // Centraliza o dia de hoje na viewport visível do container
    const targetScrollLeft = Math.max(0, targetX - containerWidth / 2 + colWidth / 2);

    if (suave) {
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    } else {
      containerRef.current.scrollLeft = targetScrollLeft;
    }
  };

  // Rola automaticamente para a data atual (ou final do ano) ao montar ou mudar de ano
  useEffect(() => {
    // Timeout para aguardar o render completo e dimensões do DOM no mobile
    const timer = setTimeout(() => {
      scrollToHoje(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [ano, dadosCalor]);

  const {
    semanas,
    diasEstudados,
    totalDiasAno,
    percentualDiasEstudados,
    streakAtual,
    streakRecorde,
    totalHorasAno,
    mesesHeader,
  } = dadosCalor;

  // Dias da semana para labels das linhas (Segunda a Domingo)
  const diasSemanaLabels = [
    { idx: 0, label: 'Seg' },
    { idx: 1, label: '' },
    { idx: 2, label: 'Qua' },
    { idx: 3, label: '' },
    { idx: 4, label: 'Sex' },
    { idx: 5, label: '' },
    { idx: 6, label: 'Dom' },
  ];

  function getCorNivel(nivel) {
    switch (nivel) {
      case 0:
        return 'bg-[#121c33] border-[#1d2c4c]/60 hover:border-slate-500';
      case 1:
        return 'bg-[#183050] border-blue-500/30 hover:border-blue-400';
      case 2:
        return 'bg-[#065f46] border-emerald-600/40 hover:border-emerald-400';
      case 3:
        return 'bg-[#059669] border-emerald-500/50 hover:border-emerald-300 shadow-sm shadow-emerald-900/30';
      case 4:
        return 'bg-[#10b981] border-emerald-400/60 hover:border-emerald-200 shadow-md shadow-emerald-500/30';
      case 5:
        return 'bg-[#34d399] border-emerald-200 hover:border-white shadow-lg shadow-emerald-400/40';
      default:
        return 'bg-[#121c33] border-[#1d2c4c]';
    }
  }

  return (
    <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#1d2c4c]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Flame className="w-4 h-4" />
              </span>
              <CardTitle className="text-base text-white">
                Consistência & Mapa de Calor Anual
              </CardTitle>
              {filtroPeriodo !== 'tudo' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {filtroTempoLabel}
                  {disciplinaNome ? ` • ${disciplinaNome}` : ''}
                </span>
              )}
            </div>
            <CardDescription className="mt-1 text-xs text-slate-400">
              Grade de atividade diária estilo GitHub. Apenas dias com{' '}
              <strong className="text-emerald-400">ao menos 15 minutos</strong> contam como dia estudado.
              {intervaloFiltro && (
                <span className="text-blue-400 ml-1">
                  (Dias dentro do período filtrado estão destacados com borda azul)
                </span>
              )}
            </CardDescription>
          </div>

          {/* Controles de Navegação: Ano e Botão Hoje */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                const anoAtual = new Date().getFullYear();
                if (ano !== anoAtual) {
                  setAno(anoAtual);
                }
                setTimeout(() => scrollToHoje(true), 60);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold cursor-pointer transition-all shadow-sm active:scale-95"
              title="Centralizar no dia de hoje"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Ir para Hoje</span>
            </button>

            {/* Seletor de Ano */}
            <div className="flex items-center gap-1.5 bg-[#0b1120] px-2 py-1 rounded-xl border border-[#1d2c4c]">
              <button
                type="button"
                onClick={() => setAno((a) => a - 1)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Ano anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono text-white px-2">
                {ano}
              </span>
              <button
                type="button"
                onClick={() => setAno((a) => a + 1)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Próximo ano"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de Consistência e Streaks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 mt-1 border-t border-[#1d2c4c]/40 text-xs">
          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[11px]">
                {metricasPeriodo ? 'Dias no Período' : 'Dias Estudados'}
              </span>
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-white font-mono">
              {metricasPeriodo
                ? `${metricasPeriodo.diasEstudados} dias`
                : `${diasEstudados}/${totalDiasAno}`}
            </p>
            <span className="text-[10px] text-slate-400">
              {metricasPeriodo
                ? `${diasEstudados} dias estudados no ano todo`
                : `${percentualDiasEstudados}% de frequência no ano`}
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[11px]">Streak Atual</span>
              <Flame className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-orange-400 font-mono">
              {streakAtual} {streakAtual === 1 ? 'dia' : 'dias'}
            </p>
            <span className="text-[10px] text-slate-400">
              {streakAtual > 0 ? 'Sequência ininterrupta ativa' : 'Estude hoje para manter'}
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[11px]">Recorde de Streak</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-amber-300 font-mono">
              {streakRecorde} {streakRecorde === 1 ? 'dia' : 'dias'}
            </p>
            <span className="text-[10px] text-slate-400">
              Maior sequência contígua
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[11px]">
                {metricasPeriodo ? 'Horas no Período' : 'Horas no Ano'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono">
              {metricasPeriodo ? `${metricasPeriodo.totalHoras}h` : `${totalHorasAno}h`}
            </p>
            <span className="text-[10px] text-slate-400">
              {metricasPeriodo
                ? `${totalHorasAno}h acumuladas em ${ano}`
                : 'Horas líquidas acumuladas'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-3">
        {/* Container rolável horizontalmente com o mapa estilo GitHub */}
        <div
          ref={containerRef}
          className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#1d2c4c] scrollbar-track-transparent"
        >
          <div className="min-w-[800px] select-none py-1">
            {/* Header com meses alinhados às semanas */}
            <div className="flex text-[11px] font-semibold text-slate-400 mb-2 pl-9">
              {mesesHeader.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    // cada coluna de semana tem ~14px (11px + 3px gap)
                    width: `${idx < mesesHeader.length - 1 ? (mesesHeader[idx + 1].coluna - m.coluna) * 14 : 45}px`,
                  }}
                  className="truncate"
                >
                  {m.nomeAbrev}
                </div>
              ))}
            </div>

            {/* Grid de 7 linhas (dias da semana) por N colunas de semanas */}
            <div className="flex gap-1.5 items-start">
              {/* Rótulo dos dias na lateral esquerda */}
              <div className="flex flex-col gap-[3px] text-[10px] text-slate-400 font-medium shrink-0 pt-[2px] pr-1">
                {diasSemanaLabels.map((item, idx) => (
                  <span
                    key={idx}
                    className="h-[12px] flex items-center leading-none text-right"
                  >
                    {item.label}
                  </span>
                ))}
              </div>

              {/* Colunas de semanas */}
              <div className="flex gap-[3px]">
                {semanas.map((semana, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[3px]">
                    {semana.map((diaInfo, rowIdx) => {
                      if (!diaInfo) {
                        return (
                          <div
                            key={rowIdx}
                            className="w-[12px] h-[12px] rounded-[2px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      const corClasses = getCorNivel(diaInfo.nivel);
                      const isSelected = diaSelecionado?.dataYMD === diaInfo.dataYMD;
                      const isInFiltro = intervaloFiltro
                        ? diaInfo.dataYMD >= intervaloFiltro.inicio && diaInfo.dataYMD <= intervaloFiltro.fim
                        : false;
                      const isDimmed = intervaloFiltro && !isInFiltro;

                      return (
                        <div
                          key={rowIdx}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDiaSelecionado(diaInfo)}
                          onKeyDown={(e) => e.key === 'Enter' && setDiaSelecionado(diaInfo)}
                          title={`${formatarData(diaInfo.dataYMD)}: ${
                            diaInfo.minutos > 0
                              ? `${formatarMinutosHoras(diaInfo.minutos)} (${diaInfo.questoes} questões)`
                              : 'Nenhum estudo'
                          }${diaInfo.estudadoValido ? ' • Dia Estudado (≥15m)' : ''}${isInFiltro ? ' • No Período Filtrado' : ''}`}
                          className={`w-[12px] h-[12px] rounded-[2.5px] border cursor-pointer transition-all duration-150 ${corClasses} ${
                            isSelected
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0b1120] scale-125 z-10'
                              : isInFiltro
                              ? 'ring-1 ring-blue-400 border-blue-300 scale-110 shadow-sm shadow-blue-500/40 z-10'
                              : isDimmed
                              ? 'opacity-35 hover:opacity-100'
                              : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes do Dia Selecionado ou Instrução */}
        {diaSelecionado && (
          <div className="mt-3 p-3 bg-[#0b1120] rounded-xl border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150 text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3.5 h-3.5 rounded-full shrink-0 border ${getCorNivel(diaSelecionado.nivel)}`}
              />
              <div>
                <p className="font-bold text-white">
                  {formatarData(diaSelecionado.dataYMD)}
                </p>
                <p className="text-slate-400 text-[11px]">
                  {diaSelecionado.minutos > 0
                    ? `${formatarMinutosHoras(diaSelecionado.minutos)} de estudo líquido • ${diaSelecionado.questoes} exercícios`
                    : 'Sem sessões registradas neste dia'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {diaSelecionado.estudadoValido ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Dia Estudado Válido
                </span>
              ) : diaSelecionado.minutos > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                  Estudou &lt; 15 min (não computado)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[11px]">
                  Dia de descanso
                </span>
              )}
              <button
                type="button"
                onClick={() => setDiaSelecionado(null)}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Legenda de Intensidade */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-3 mt-3 border-t border-[#1d2c4c]/50 text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Regra de Consistência: apenas dias com ≥ 15 min contam para o streak</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Menos</span>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-[2px] bg-[#121c33] border border-[#1d2c4c]"
                title="0 min"
              />
              <span
                className="w-3 h-3 rounded-[2px] bg-[#183050] border border-blue-500/30"
                title="1 a 14 min (abaixo de 15 min)"
              />
              <span
                className="w-3 h-3 rounded-[2px] bg-[#065f46] border border-emerald-600/40"
                title="15 a 59 min (Nível 1)"
              />
              <span
                className="w-3 h-3 rounded-[2px] bg-[#059669] border border-emerald-500/50"
                title="1h a 2h (Nível 2)"
              />
              <span
                className="w-3 h-3 rounded-[2px] bg-[#10b981] border border-emerald-400/60"
                title="2h a 4h (Nível 3)"
              />
              <span
                className="w-3 h-3 rounded-[2px] bg-[#34d399] border border-emerald-200"
                title="≥ 4h (Nível 4)"
              />
            </div>
            <span>Mais</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
