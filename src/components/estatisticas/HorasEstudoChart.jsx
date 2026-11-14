import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { Tabs } from '../common/Tabs.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';
import { calcularDadosHorasPeriodo } from '../../lib/estatisticasUtils.js';
import { CheckCircle2, TrendingUp, Target, Calendar, Filter } from 'lucide-react';

export function HorasEstudoChart({
  sessoes = [],
  provaAtiva,
  filtroPeriodo = 'tudo',
  dataInicio = '',
  dataFim = '',
  filtroTempoLabel = '',
}) {
  const [periodo, setPeriodo] = useState('dia');
  const [dataBase, setDataBase] = useState(() => new Date());

  // Sincroniza a exibição e data base sempre que o filtro global de tempo mudar
  useEffect(() => {
    const agora = new Date();

    if (filtroPeriodo === 'hoje') {
      setPeriodo('dia');
      setDataBase(agora);
    } else if (filtroPeriodo === '7d') {
      setPeriodo('7d');
      setDataBase(agora);
    } else if (filtroPeriodo === '30d') {
      setPeriodo('30d');
      setDataBase(agora);
    } else if (filtroPeriodo === 'mes') {
      setPeriodo('dia');
      setDataBase(agora);
    } else if (filtroPeriodo === 'mes_anterior') {
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 15);
      setPeriodo('dia');
      setDataBase(mesAnt);
    } else if (filtroPeriodo === 'ano') {
      setPeriodo('mes');
      setDataBase(agora);
    } else if (filtroPeriodo === 'personalizado') {
      setPeriodo('personalizado');
      if (dataFim) {
        setDataBase(new Date(`${dataFim}T12:00:00Z`));
      }
    } else {
      // tudo
      setPeriodo('semana');
      setDataBase(agora);
    }
  }, [filtroPeriodo, dataInicio, dataFim]);

  const metasDiarias = provaAtiva?.metasDiarias || {
    seg: 240,
    ter: 240,
    qua: 240,
    qui: 240,
    sex: 180,
    sab: 300,
    dom: 120,
  };

  const relatorio = calcularDadosHorasPeriodo(
    sessoes,
    periodo,
    metasDiarias,
    dataBase,
    { dataInicio, dataFim, filtroPeriodo }
  );
  const dados = relatorio.dados || [];

  // Quantos períodos bateram a meta
  const bateramMetaQtd = dados.filter((d) => d.superou).length;

  return (
    <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#1d2c4c]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Target className="w-4 h-4" />
              </span>
              <CardTitle className="text-base text-white">
                Horas Estudadas vs Meta
              </CardTitle>
              {filtroPeriodo !== 'tudo' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {filtroTempoLabel}
                </span>
              )}
            </div>
            <CardDescription className="mt-1 text-xs text-slate-400">
              Visualização por período com linha de meta. Barras em{' '}
              <span className="text-emerald-400 font-semibold">verde</span> indicam meta superada.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              tabs={[
                { id: 'dia', label: 'Dia' },
                { id: '7d', label: '7 Dias' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mês' },
                { id: 'ano', label: 'Ano' },
              ]}
              activeTab={periodo}
              onChange={setPeriodo}
            />
          </div>
        </div>

        {/* Resumo rápido do período */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-1 border-t border-[#1d2c4c]/40 text-xs">
          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <span className="text-[11px] text-slate-400 block">Total no Período</span>
            <span className="text-base sm:text-lg font-black font-mono text-white">
              {formatarMinutosHoras(Math.round(relatorio.totalSegundos / 60))}
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <span className="text-[11px] text-slate-400 block">Meta de Referência</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-400">
              {relatorio.metaReferenciaHoras}h
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <span className="text-[11px] text-slate-400 block">Metas Batidas</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline" /> {bateramMetaQtd} de {dados.length}
            </span>
          </div>

          <div className="bg-[#0b1120]/70 p-2.5 rounded-xl border border-[#1d2c4c]/50">
            <span className="text-[11px] text-slate-400 block">Recorte Temporal</span>
            <span className="text-xs font-semibold text-slate-300 truncate block mt-1" title={relatorio.periodoRotulo}>
              {relatorio.periodoRotulo}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        {dados.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Nenhum dado encontrado para o período selecionado
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                margin={{ top: 20, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1d2c4c" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#1d2c4c' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#1d2c4c' }}
                  unit="h"
                />
                <Tooltip content={<CustomBarTooltip periodo={periodo} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                
                {relatorio.metaReferenciaHoras > 0 && (
                  <ReferenceLine
                    y={relatorio.metaReferenciaHoras}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Meta: ${relatorio.metaReferenciaHoras}h`,
                      fill: '#fbbf24',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}

                <Bar dataKey="horas" radius={[5, 5, 0, 0]} maxBarSize={52}>
                  {dados.map((entry, index) => {
                    // Verde esmeralda quando superar a meta; azul claro quando abaixo
                    const fillCor = entry.superou ? '#10b981' : '#38bdf8';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillCor}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda de status */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-[#1d2c4c]/50 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm shadow-emerald-500/30" />
            <span>Meta superada (ou igualada)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-400 shadow-sm shadow-blue-400/30" />
            <span>Abaixo da meta planejada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span className="text-amber-400">Linha da meta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomBarTooltip({ active, payload, periodo }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { horas, minutos, metaHoras, superou, label, sessoesQtd, questoes } = data;

    return (
      <div className="bg-[#0f172a] border border-[#22355c] p-3 rounded-xl shadow-2xl text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
          <span className="font-bold text-white text-xs">{label}</span>
          {superou ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Meta Superada!
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {metaHoras > 0 ? `${Math.round((horas / metaHoras) * 100)}% da meta` : 'Sem meta'}
            </span>
          )}
        </div>

        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Tempo Estudado:</span>
            <strong className={`font-mono ${superou ? 'text-emerald-400' : 'text-blue-400'}`}>
              {formatarMinutosHoras(minutos)} ({horas}h)
            </strong>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Meta Estabelecida:</span>
            <strong className="font-mono text-amber-400">{metaHoras}h</strong>
          </div>

          {sessoesQtd > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Sessões:</span>
              <strong className="font-mono text-slate-200">{sessoesQtd}</strong>
            </div>
          )}

          {questoes > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Questões resolvidas:</span>
              <strong className="font-mono text-orange-400">{questoes}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
