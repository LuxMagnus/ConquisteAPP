import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { PieChart as PieIcon, Clock, Filter } from 'lucide-react';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function DistribuicaoTempoRosca({
  dadosDistribuicao,
  filtroTempoLabel = '',
  isPorTopico = false,
  disciplinaNome = '',
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const { dados = [], totalSegundos = 0, totalHoras = 0, totalMinutos = 0 } = dadosDistribuicao || {};

  const activeItem = activeIndex !== null ? dados[activeIndex] : null;

  return (
    <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden flex flex-col justify-between">
      <CardHeader className="pb-2 border-b border-[#1d2c4c]/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PieIcon className="w-4 h-4" />
            </span>
            <CardTitle className="text-base text-white">
              {isPorTopico
                ? `Tempo por Tópico: ${disciplinaNome}`
                : 'Distribuição de Tempo por Disciplina'}
            </CardTitle>
            {filtroTempoLabel && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {filtroTempoLabel}
              </span>
            )}
          </div>
          <CardDescription className="text-xs text-slate-400 mt-1">
            {isPorTopico
              ? `Dedicação em horas líquidas por tópico de ${disciplinaNome} no período.`
              : 'Fatia de dedicação de horas líquidas em cada matéria no período filtrado.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4 flex flex-col items-center flex-1 justify-center">
        {dados.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <Clock className="w-8 h-8 text-slate-600" />
            <span>Nenhuma sessão de estudo registrada</span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Gráfico Donut / Rosca */}
            <div className="relative w-full max-w-[280px] h-[250px] flex items-center justify-center select-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<RoscaTooltip />} />
                  <Pie
                    data={dados}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, idx) => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    stroke="#0b1120"
                    strokeWidth={3}
                    animationDuration={600}
                  >
                    {dados.map((entry, index) => {
                      const isHovered = activeIndex === index;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={activeIndex === null || isHovered ? 1 : 0.45}
                          style={{
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            filter: isHovered
                              ? `brightness(1.15) drop-shadow(0 0 8px ${entry.color}80)`
                              : 'none',
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centro Informativo */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {activeItem ? (
                  <div className="text-center px-3 animate-in fade-in duration-150">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block mb-1"
                      style={{ backgroundColor: activeItem.color }}
                    />
                    <p className="text-xs font-bold text-white max-w-[130px] truncate">
                      {activeItem.name}
                    </p>
                    <p className="text-xl font-black text-white font-mono mt-0.5">
                      {activeItem.share}%
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {activeItem.minutosFormatados}
                    </p>
                  </div>
                ) : (
                  <div className="text-center px-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Total Estudado
                    </span>
                    <span className="text-2xl font-black font-mono text-white tracking-tight">
                      {formatarMinutosHoras(totalMinutos)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {dados.length} {isPorTopico ? (dados.length === 1 ? 'tópico' : 'tópicos') : (dados.length === 1 ? 'disciplina' : 'disciplinas')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Legenda Resumida */}
            <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-[#1d2c4c]/50">
              {dados.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    activeIndex === idx
                      ? 'bg-[#1e2f52] text-white border border-blue-500/50 shadow-md'
                      : 'bg-[#0b1120] text-slate-300 hover:bg-[#1a2b4a] border border-[#1d2c4c]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="max-w-[110px] truncate text-[11px] font-medium">{item.name}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {item.share}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoscaTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f172a] border border-[#22355c] p-2.5 rounded-xl shadow-2xl text-xs space-y-1 min-w-[170px]">
        <div className="flex items-center gap-2 pb-1 border-b border-[#1e293b]">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-white text-xs truncate max-w-[140px]">
            {data.name}
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-300">
          <span className="text-slate-400">Tempo:</span>
          <strong className="font-mono text-white">{data.minutosFormatados} ({data.horas}h)</strong>
        </div>
        <div className="flex justify-between text-[11px] text-slate-300">
          <span className="text-slate-400">Proporção:</span>
          <strong className="font-mono text-emerald-400">{data.share}% do total</strong>
        </div>
      </div>
    );
  }
  return null;
}
