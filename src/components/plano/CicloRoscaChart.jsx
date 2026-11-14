import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Sliders, Percent, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';
import { agruparMateriasCiclo } from '../../lib/cicloUtils.js';
import { DefinirPorcentagemCicloModal } from './DefinirPorcentagemCicloModal.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function CicloRoscaChart({ ciclo, disciplinas = [], progressoCiclo }) {
  const { dispatch } = useStudyStore();
  const [activeIndex, setActiveIndex] = useState(null);
  const [hoveredDisciplinaId, setHoveredDisciplinaId] = useState(null);
  const [isModalPorcentagemOpen, setIsModalPorcentagemOpen] = useState(false);

  // Agrupa todas as sessões de uma mesma disciplina para exibir a real porcentagem ocupada no ciclo
  const materiasAgrupadas = useMemo(() => {
    return agruparMateriasCiclo(ciclo, disciplinas);
  }, [ciclo, disciplinas]);

  if (!ciclo || !Array.isArray(ciclo.blocos) || ciclo.blocos.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Nenhum bloco cadastrado no ciclo
      </div>
    );
  }

  const chartData = ciclo.blocos.map((bloco, idx) => {
    const disc = disciplinas.find((d) => String(d.id) === String(bloco.disciplinaId));
    const meta = Number(bloco.minutosMeta) || 0;
    const feitos = Number(bloco.minutosFeitos) || 0;
    const pctConcluido = meta > 0 ? Math.min(100, Math.round((feitos / meta) * 100)) : 0;
    const shareCiclo = progressoCiclo?.minutosMetaTotal > 0
      ? Math.round((meta / progressoCiclo.minutosMetaTotal) * 100)
      : 0;

    return {
      name: disc?.nome || bloco.disciplinaNome || `Matéria ${idx + 1}`,
      disciplinaId: bloco.disciplinaId,
      value: meta,
      minutosMeta: meta,
      minutosFeitos: feitos,
      color: disc?.cor || bloco.cor || '#38bdf8',
      peso: disc?.peso,
      dificuldade: disc?.dificuldade,
      dominio: disc?.dominio,
      sessaoNumero: bloco.sessaoNumero,
      sessaoTotal: bloco.sessaoTotal,
      pctConcluido,
      shareCiclo,
      isConcluido: feitos >= meta,
    };
  });

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  const temPorcentagemManual = Boolean(
    ciclo?.porcentagensManuais &&
    Object.keys(ciclo.porcentagensManuais).length > 0 &&
    materiasAgrupadas.some((m) => m.isManual)
  );

  const handleSalvarPorcentagens = (porcentagensManuais) => {
    dispatch({
      type: ACTION_TYPES.SET_PORCENTAGENS_MANUAIS_CICLO,
      payload: {
        provaId: ciclo.provaId,
        porcentagensManuais,
        resetarProgresso: false,
      },
    });
  };

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Container do Gráfico Donut com Centro Informativo e Barra Extra de Conclusão */}
      <div className="relative w-full max-w-[340px] h-[300px] flex items-center justify-center select-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 1000, pointerEvents: 'none', outline: 'none' }}
              isAnimationActive={false}
            />

            {/* 1. Anel Interno: Fatias coloridas de cada matéria no Ciclo (Sentido Horário) */}
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={72}
              outerRadius={104}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="#0b1120"
              strokeWidth={2.5}
              animationDuration={800}
            >
              {chartData.map((entry, index) => {
                const isHoveredPie = activeIndex === index;
                const isHoveredMateria = hoveredDisciplinaId && String(entry.disciplinaId) === String(hoveredDisciplinaId);
                const isHighlighted = isHoveredPie || isHoveredMateria;
                const hasAnyHover = activeIndex !== null || hoveredDisciplinaId !== null;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={!hasAnyHover || isHighlighted ? 1 : 0.4}
                    style={{
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      filter: isHighlighted ? 'brightness(1.2) drop-shadow(0 0 8px rgba(56,189,248,0.6))' : 'none',
                    }}
                  />
                );
              })}
            </Pie>

            {/* 2. Barra Extra Externa: Progresso e Conclusão das Matérias (Sentido Horário) */}
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={110}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="#0b1120"
              strokeWidth={2}
              animationDuration={800}
            >
              {chartData.map((entry, index) => {
                const isHoveredPie = activeIndex === index;
                const isHoveredMateria = hoveredDisciplinaId && String(entry.disciplinaId) === String(hoveredDisciplinaId);
                const isHighlighted = isHoveredPie || isHoveredMateria;

                // Barra verde esmeralda para matérias concluídas, azul celeste para em andamento, escuro para pendente
                const statusColor = entry.isConcluido
                  ? '#10b981'
                  : entry.minutosFeitos > 0
                  ? '#38bdf8'
                  : '#16233b';

                return (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={statusColor}
                    style={{
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      filter: entry.isConcluido
                        ? 'drop-shadow(0 0 4px rgba(16,185,129,0.75))'
                        : isHighlighted
                        ? 'brightness(1.2)'
                        : 'none',
                    }}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro Informativo do Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          {activeItem ? (
            <div className="text-center px-4 animate-in fade-in duration-150">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block mb-1"
                style={{ backgroundColor: activeItem.color }}
              />
              <p className="text-xs font-bold text-white max-w-[140px] truncate leading-tight">
                {activeItem.name}
              </p>
              {activeItem.sessaoTotal > 1 && (
                <span className="text-[10px] text-blue-300 font-mono block">
                  Sessão {activeItem.sessaoNumero}/{activeItem.sessaoTotal}
                </span>
              )}
              <p className="text-xl font-black text-white font-mono mt-0.5">
                {activeItem.pctConcluido}%
              </p>
              <p className="text-[10px] text-slate-400">
                {activeItem.minutosFeitos}/{activeItem.minutosMeta} min ({activeItem.shareCiclo}% do ciclo)
              </p>
            </div>
          ) : (
            <div className="text-center px-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                Volta {ciclo.voltaAtual || 1}
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight drop-shadow">
                {progressoCiclo?.percentual || 0}%
              </span>
              <span className="text-[11px] font-medium text-emerald-400 block mt-0.5">
                {formatarMinutosHoras(progressoCiclo?.minutosFeitosTotal || 0)} de{' '}
                {formatarMinutosHoras(progressoCiclo?.minutosMetaTotal || 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legenda visual da barra extra de conclusão */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400 -mt-1 pb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-slate-300 font-medium">Barra externa: Concluído</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <span>Em andamento</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1e2f54]" />
          <span>Pendente</span>
        </span>
      </div>

      {/* LISTAGEM CONCISA DAS MATÉRIAS AGRUPADAS NO CICLO */}
      {/* Agrupa todas as sessões de uma mesma matéria para uma noção real do % total no Ciclo */}
      <div className="w-full pt-1 space-y-2.5 border-t border-[#1d2c4c]/70">
        <div className="flex flex-col gap-1 px-1">
          {/* Linha 1: Título */}
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Distribuição das Matérias no Ciclo
          </h3>

          {/* Linha 2: Informação de matérias ativas e sessões */}
          <p className="text-[11px] text-slate-400">
            {materiasAgrupadas.length} matérias ativas • Sessões somadas para indicar a carga real no ciclo
          </p>

          {/* Linha 3: Status da % e Botão de Ação */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {temPorcentagemManual ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                % Personalizada
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                % Proporcional
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsModalPorcentagemOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#14223f] hover:bg-[#1a2c52] text-blue-300 border border-blue-500/30 transition-all cursor-pointer shadow-sm hover:border-blue-400"
              title="Ajustar manualmente a porcentagem de cada matéria no ciclo"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Definir % Manual</span>
            </button>
          </div>
        </div>

        {/* Grade de Matérias Agrupadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {materiasAgrupadas.map((item) => {
            const isHovered = hoveredDisciplinaId === item.disciplinaId;

            return (
              <div
                key={item.disciplinaId}
                onMouseEnter={() => setHoveredDisciplinaId(item.disciplinaId)}
                onMouseLeave={() => setHoveredDisciplinaId(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-default space-y-1.5 ${
                  isHovered
                    ? 'bg-[#182747] border-blue-400 shadow-md shadow-blue-500/20'
                    : 'bg-[#10192e] border-[#1d2c4c] hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[170px]" title={item.nome}>
                      {item.nome}
                    </span>
                    {item.sessoesTotal > 1 && (
                      <span className="text-[10px] font-mono text-slate-400 bg-[#162442] px-1.5 py-0.2 rounded border border-[#23355c] shrink-0">
                        {item.sessoesTotal}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-black text-white bg-[#1a2846] px-2 py-0.5 rounded-lg border border-[#2b4170]">
                      {item.shareCiclo}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Total: <strong className="text-slate-200">{formatarMinutosHoras(item.minutosMetaTotal)}</strong>
                    {item.sessoesTotal > 1 && ` (${item.sessoesTotal} sessões)`}
                  </span>
                  <span className={item.isConcluido ? 'text-emerald-400 font-bold' : 'text-blue-300'}>
                    {formatarMinutosHoras(item.minutosFeitosTotal)} feitos ({item.pctConcluido}%)
                  </span>
                </div>

                {/* Mini Barra de Progresso desta Disciplina no Ciclo */}
                <div className="w-full bg-[#080d19] h-1.5 rounded-full overflow-hidden border border-[#1b2b4d]/70">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.pctConcluido}%`,
                      backgroundColor: item.isConcluido ? '#10b981' : item.cor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Definição Manual de % do Ciclo */}
      <DefinirPorcentagemCicloModal
        isOpen={isModalPorcentagemOpen}
        onClose={() => setIsModalPorcentagemOpen(false)}
        ciclo={ciclo}
        disciplinas={disciplinas}
        onSalvarPorcentagens={handleSalvarPorcentagens}
      />
    </div>
  );
}


function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{ backgroundColor: '#0d1527', opacity: 1 }}
        className="bg-[#0d1527] border border-[#24365d] p-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.85)] text-xs space-y-2 min-w-[210px] z-50 pointer-events-none relative select-none"
      >
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#1e293b]">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-white text-xs truncate max-w-[160px]">
            {data.name}
          </span>
        </div>

        <div className="space-y-1 text-slate-300 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Meta do bloco:</span>
            <strong className="font-mono text-white">{data.minutosMeta} min ({formatarMinutosHoras(data.minutosMeta)})</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Tempo cumprido:</span>
            <strong className="font-mono text-emerald-400">{data.minutosFeitos} min</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Progresso do bloco:</span>
            <strong className="font-mono text-blue-400">{data.pctConcluido}%</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Status no ciclo:</span>
            <strong className={`font-mono ${data.isConcluido ? 'text-emerald-400' : 'text-amber-300'}`}>
              {data.isConcluido ? '✓ Concluído' : `Faltam ${Math.max(0, data.minutosMeta - data.minutosFeitos)} min`}
            </strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Fatia do ciclo:</span>
            <strong className="font-mono text-slate-300">{data.shareCiclo}%</strong>
          </div>
          {data.peso && (
            <div className="flex justify-between items-center pt-1.5 border-t border-[#1e293b]/80 text-[10px] text-slate-400">
              <span>Peso: <b className="text-slate-200">{data.peso}/10</b></span>
              <span>Dif: <b className="text-slate-200">{data.dificuldade}/5</b></span>
              <span>Dom: <b className="text-emerald-400">{data.dominio}%</b></span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
