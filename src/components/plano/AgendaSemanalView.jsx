import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  ArrowRight,
  BookOpen,
  Sparkles,
  Play,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function AgendaSemanalView({ progressoSemana, ciclo, disciplinas = [], onEstudarAgora }) {
  if (!progressoSemana) return null;

  const {
    inicioSegunda,
    fimDomingo,
    diasProgresso,
    hojeKey,
    hojeYMD,
    totalEstudadoMinutos,
    totalMetaMinutos,
    percentualSemana,
    restanteSemanaMinutos,
    mediaDiariaMinutos,
    totalSessoesNaSemana,
  } = progressoSemana;

  // Dados para o BarChart comparativo (Meta vs Realizado)
  const chartData = diasProgresso.map((dia) => ({
    name: dia.abrev,
    diaKey: dia.key,
    label: dia.label,
    dataFmt: dia.diaMesFmt,
    isHoje: dia.isHoje,
    metaHoras: Math.round((dia.metaMinutos / 60) * 10) / 10,
    estudadoHoras: Math.round((dia.estudadoMinutos / 60) * 10) / 10,
    metaMinutos: dia.metaMinutos,
    estudadoMinutos: dia.estudadoMinutos,
    atingiuMeta: dia.atingiuMeta,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Resumo da Semana Atual */}
      <Card className="bg-gradient-to-br from-[#121c33] via-[#0f172a] to-[#0a101d] border-[#1f2f54] shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Semana Corrente (Segunda a Domingo)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold font-mono">
                  {diasProgresso[0]?.diaMesFmt} a {diasProgresso[6]?.diaMesFmt}
                </span>
              </div>
              <CardTitle className="text-base sm:text-lg mt-1">
                Progresso Semanal vs Meta do Concurso
              </CardTitle>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 self-start sm:self-auto">
              {percentualSemana}% da meta semanal
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Barra de Progresso Semanal */}
          <ProgressBar
            value={totalEstudadoMinutos}
            max={totalMetaMinutos || 100}
            label="Tempo Líquido Estudado na Semana"
            sublabel={`${formatarMinutosHoras(totalEstudadoMinutos)} realizados de ${formatarMinutosHoras(totalMetaMinutos)} previstos`}
            showPercentage
            color="gradient"
          />

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#172545]/60 border border-[#233760]">
              <span className="text-[11px] text-slate-400 block font-medium">Estudado</span>
              <span className="text-base sm:text-lg font-mono font-bold text-white">
                {formatarMinutosHoras(totalEstudadoMinutos)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {totalSessoesNaSemana} {totalSessoesNaSemana === 1 ? 'sessão' : 'sessões'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#172545]/60 border border-[#233760]">
              <span className="text-[11px] text-slate-400 block font-medium">Meta Semanal</span>
              <span className="text-base sm:text-lg font-mono font-bold text-blue-400">
                {formatarMinutosHoras(totalMetaMinutos)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                soma seg a dom
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#172545]/60 border border-[#233760]">
              <span className="text-[11px] text-slate-400 block font-medium">Restante</span>
              <span className="text-base sm:text-lg font-mono font-bold text-amber-400">
                {formatarMinutosHoras(restanteSemanaMinutos)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                para fechar a semana
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#172545]/60 border border-[#233760]">
              <span className="text-[11px] text-slate-400 block font-medium">Média Realizada</span>
              <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                {formatarMinutosHoras(mediaDiariaMinutos)}/dia
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                nos 7 dias da semana
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Comparativo Diário: Meta vs Estudado (SEG–DOM) */}
      <Card className="p-4 sm:p-6 bg-[#0f172a] border-[#1d2c4c]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Comparativo Diário: Meta vs Tempo Realizado
            </h3>
            <p className="text-xs text-slate-400">
              Desempenho diário de Segunda a Domingo nesta semana
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-400" />
              <span className="text-slate-300">Meta do Dia</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-300">Estudado</span>
            </div>
          </div>
        </div>

        <div className="h-56 w-full select-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                unit="h"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <Tooltip content={<CustomDailyTooltip />} />
              <Bar dataKey="metaHoras" name="Meta" fill="#3b82f6" opacity={0.35} radius={[4, 4, 0, 0]} />
              <Bar dataKey="estudadoHoras" name="Estudado" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isSuccess = entry.estudadoMinutos >= entry.metaMinutos && entry.metaMinutos > 0;
                  const color = isSuccess ? '#10b981' : entry.isHoje ? '#38bdf8' : '#60a5fa';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Grid com os 7 Dias Detalhados (SEG a DOM) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Agenda Detalhada por Dia da Semana (SEG–DOM)
          </span>
          <span className="text-[11px] text-slate-400">
            Fuso: America/Fortaleza (UTC-3)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {diasProgresso.map((dia) => {
            const isHoje = dia.isHoje;
            const pct = Math.min(100, dia.percentual);
            const isConcluido = dia.atingiuMeta && dia.metaMinutos > 0;

            return (
              <div
                key={dia.key}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isHoje
                    ? 'bg-gradient-to-b from-[#152342] to-[#0f172a] border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                    : 'bg-[#111c33]/70 border-[#1d2c4c] hover:border-[#2b3f6b]'
                }`}
              >
                <div>
                  {/* Header do Dia */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {dia.label}
                      </span>
                      {isHoje && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white tracking-wider">
                          Hoje
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {dia.diaMesFmt}
                    </span>
                  </div>

                  {/* Informações de Meta e Tempo Estudado */}
                  <div className="flex items-baseline justify-between text-xs mb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Estudado</span>
                      <span className={`font-mono font-bold text-sm ${isConcluido ? 'text-emerald-400' : 'text-white'}`}>
                        {formatarMinutosHoras(dia.estudadoMinutos)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Meta Diária</span>
                      <span className="font-mono font-bold text-sm text-slate-300">
                        {formatarMinutosHoras(dia.metaMinutos)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Dia */}
                  <div className="w-full bg-[#0c1424] h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isConcluido ? 'bg-emerald-400' : isHoje ? 'bg-blue-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Lista de Sessões Realizadas no Dia */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {dia.sessoes.length > 0 ? `Sessões (${dia.sessoes.length})` : 'Nenhuma sessão'}
                    </span>

                    {dia.sessoes.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {dia.sessoes.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="p-1.5 rounded-lg bg-[#16233f] border border-[#22355c] flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: s.disciplinaCor }}
                              />
                              <span className="text-slate-200 truncate max-w-[100px] font-medium">
                                {s.disciplinaNome}
                              </span>
                            </div>
                            <span className="font-mono text-slate-300 font-semibold shrink-0">
                              {s.minutos}m
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        {isHoje
                          ? 'Ainda não estudado hoje. Inicie um bloco!'
                          : 'Sem registro de estudo nesta data.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ação rápida para o dia */}
                {isHoje && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Play}
                    className="w-full text-xs font-bold mt-2 bg-blue-600 hover:bg-blue-500 shadow"
                    onClick={() => onEstudarAgora && onEstudarAgora()}
                  >
                    Estudar Agora
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomDailyTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f172a] border border-[#22355c] p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[170px]">
        <p className="font-bold text-white text-xs pb-1 border-b border-[#1e293b]">
          {data.label} ({data.dataFmt})
        </p>
        <div className="flex justify-between text-[11px] text-slate-300">
          <span className="text-slate-400">Meta do dia:</span>
          <strong className="font-mono text-blue-400">{formatarMinutosHoras(data.metaMinutos)}</strong>
        </div>
        <div className="flex justify-between text-[11px] text-slate-300">
          <span className="text-slate-400">Realizado:</span>
          <strong className="font-mono text-emerald-400">{formatarMinutosHoras(data.estudadoMinutos)}</strong>
        </div>
        <div className="flex justify-between text-[11px] text-slate-300 pt-1 border-t border-[#1e293b]/70">
          <span className="text-slate-400">Status:</span>
          <strong className={data.atingiuMeta ? 'text-emerald-400' : 'text-amber-400'}>
            {data.atingiuMeta ? 'Meta atingida!' : `${Math.round((data.estudadoMinutos / (data.metaMinutos || 1)) * 100)}%`}
          </strong>
        </div>
      </div>
    );
  }
  return null;
}
