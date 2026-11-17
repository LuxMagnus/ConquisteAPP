import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';
import { agruparMateriasCiclo } from '../../lib/cicloUtils.js';
import { DefinirPorcentagemCicloModal } from './DefinirPorcentagemCicloModal.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function CicloRoscaChart({ ciclo, disciplinas = [], progressoCiclo }) {
  const { dispatch } = useStudyStore();
  const [activeIndex, setActiveIndex] = useState(null);
  const [hoveredDisciplinaId, setHoveredDisciplinaId] = useState(null);
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState(null);
  const [isModalPorcentagemOpen, setIsModalPorcentagemOpen] = useState(false);

  // Agrupa todas as sessões de uma mesma disciplina para exibir a real porcentagem ocupada no ciclo
  const materiasAgrupadas = useMemo(() => {
    return agruparMateriasCiclo(ciclo, disciplinas);
  }, [ciclo, disciplinas]);

  const effectiveSelectedDisciplinaId = useMemo(() => {
    if (!selectedDisciplinaId) return null;
    const exists = materiasAgrupadas.some(
      (m) => String(m.disciplinaId) === String(selectedDisciplinaId)
    );
    return exists ? String(selectedDisciplinaId) : null;
  }, [materiasAgrupadas, selectedDisciplinaId]);

  const selectedIndex = useMemo(() => {
    if (!effectiveSelectedDisciplinaId) return -1;
    return materiasAgrupadas.findIndex(
      (m) => String(m.disciplinaId) === String(effectiveSelectedDisciplinaId)
    );
  }, [materiasAgrupadas, effectiveSelectedDisciplinaId]);

  const selectedMateria = useMemo(() => {
    if (selectedIndex < 0) return null;
    return materiasAgrupadas[selectedIndex] || null;
  }, [materiasAgrupadas, selectedIndex]);

  const hoveredMateria = useMemo(() => {
    if (!hoveredDisciplinaId) return null;
    return (
      materiasAgrupadas.find(
        (m) => String(m.disciplinaId) === String(hoveredDisciplinaId)
      ) || null
    );
  }, [materiasAgrupadas, hoveredDisciplinaId]);

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
      isConcluido: Boolean(bloco.concluido) || feitos >= meta,
    };
  });

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleToggleSelectMateria = (disciplinaId) => {
    const idStr = String(disciplinaId);
    setSelectedDisciplinaId((prev) => {
      if (prev && String(prev) === idStr) {
        setActiveIndex(null);
        return null;
      }
      return idStr;
    });
  };

  const handlePrevMateria = () => {
    if (materiasAgrupadas.length === 0) return;
    setActiveIndex(null);
    if (selectedIndex === -1) {
      setSelectedDisciplinaId(
        String(materiasAgrupadas[materiasAgrupadas.length - 1].disciplinaId)
      );
    } else if (selectedIndex === 0) {
      setSelectedDisciplinaId(null);
    } else {
      setSelectedDisciplinaId(
        String(materiasAgrupadas[selectedIndex - 1].disciplinaId)
      );
    }
  };

  const handleNextMateria = () => {
    if (materiasAgrupadas.length === 0) return;
    setActiveIndex(null);
    if (selectedIndex === -1) {
      setSelectedDisciplinaId(String(materiasAgrupadas[0].disciplinaId));
    } else if (selectedIndex >= materiasAgrupadas.length - 1) {
      setSelectedDisciplinaId(null);
    } else {
      setSelectedDisciplinaId(
        String(materiasAgrupadas[selectedIndex + 1].disciplinaId)
      );
    }
  };

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;
  const centerMateria = hoveredMateria || selectedMateria;

  const activeSliceDisciplinaId = activeItem ? String(activeItem.disciplinaId) : null;
  const focusedDisciplinaId = hoveredDisciplinaId
    ? String(hoveredDisciplinaId)
    : activeSliceDisciplinaId || effectiveSelectedDisciplinaId;

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

  const renderMateriaCard = (item, { compact = false, showClear = false } = {}) => {
    const isSelected =
      effectiveSelectedDisciplinaId &&
      String(effectiveSelectedDisciplinaId) === String(item.disciplinaId);
    const isHovered =
      hoveredDisciplinaId &&
      String(hoveredDisciplinaId) === String(item.disciplinaId);
    const isActive = isSelected || isHovered;

    return (
      <div
        key={item.disciplinaId}
        role="button"
        tabIndex={0}
        onClick={() => handleToggleSelectMateria(item.disciplinaId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleSelectMateria(item.disciplinaId);
          }
        }}
        onMouseEnter={() => setHoveredDisciplinaId(String(item.disciplinaId))}
        onMouseLeave={() => setHoveredDisciplinaId(null)}
        className={`w-full text-left rounded-xl border transition-all cursor-pointer select-none ${
          compact ? 'p-2 space-y-1' : 'p-2.5 space-y-1.5'
        } ${
          isSelected
            ? 'bg-[#19294d] border-blue-400 ring-1 ring-blue-400/40 shadow-md shadow-blue-500/20'
            : isActive
            ? 'bg-[#182747] border-blue-400/70 shadow-md shadow-blue-500/15'
            : 'bg-[#10192e] border-[#1d2c4c] hover:border-slate-500'
        }`}
        aria-pressed={Boolean(isSelected)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: item.cor }}
            />
            <span className="text-xs font-bold text-white truncate" title={item.nome}>
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
            {showClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(null);
                  setSelectedDisciplinaId(null);
                }}
                className="p-1 rounded-lg bg-[#162442] hover:bg-[#1e325c] text-slate-400 hover:text-white border border-[#23355c] transition-colors cursor-pointer"
                title="Voltar à visão geral"
                aria-label="Limpar seleção"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="truncate">
            Total: <strong className="text-slate-200">{formatarMinutosHoras(item.minutosMetaTotal)}</strong>
            {item.sessoesTotal > 1 && ` (${item.sessoesTotal} sessões)`}
          </span>
          <span className={`shrink-0 ${item.isConcluido ? 'text-emerald-400 font-bold' : 'text-blue-300'}`}>
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
  };

  return (
    <div className="w-full">
      {/* Layout principal: empilhado no mobile (< md), LADO A LADO no tablet (md) e desktop largo (xl), empilhado no lg intermediário */}
      <div className="grid grid-cols-1 md:grid-cols-[285px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 md:items-center lg:items-stretch xl:items-center">
        {/* COLUNA ESQUERDA: Gráfico Donut + Legenda da Barra Externa */}
        <div className="flex flex-col items-center justify-center w-full">
          {/* Container do Gráfico Donut com Centro Informativo e Barra Extra de Conclusão */}
          <div className="relative w-full max-w-[300px] h-[270px] sm:h-[280px] flex items-center justify-center select-none">
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
                  innerRadius={70}
                  outerRadius={101}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(_, index) => {
                    const entry = chartData[index];
                    if (entry) handleToggleSelectMateria(entry.disciplinaId);
                  }}
                  stroke="#0b1120"
                  strokeWidth={2.5}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    const isHoveredPie = activeIndex === index;
                    const isFocusedMateria =
                      focusedDisciplinaId &&
                      String(entry.disciplinaId) === String(focusedDisciplinaId);
                    const isHighlighted = isHoveredPie || isFocusedMateria;
                    const hasAnyFocus = Boolean(focusedDisciplinaId) || activeIndex !== null;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={!hasAnyFocus || isHighlighted ? 1 : 0.25}
                        style={{
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          filter: isHighlighted
                            ? 'brightness(1.2) drop-shadow(0 0 8px rgba(56,189,248,0.6))'
                            : 'none',
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
                  innerRadius={107}
                  outerRadius={117}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(_, index) => {
                    const entry = chartData[index];
                    if (entry) handleToggleSelectMateria(entry.disciplinaId);
                  }}
                  stroke="#0b1120"
                  strokeWidth={2}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    const isHoveredPie = activeIndex === index;
                    const isFocusedMateria =
                      focusedDisciplinaId &&
                      String(entry.disciplinaId) === String(focusedDisciplinaId);
                    const isHighlighted = isHoveredPie || isFocusedMateria;
                    const hasAnyFocus = Boolean(focusedDisciplinaId) || activeIndex !== null;

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
                        opacity={!hasAnyFocus || isHighlighted ? 1 : 0.35}
                        style={{
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          filter: entry.isConcluido
                            ? 'drop-shadow(0 0 4px rgba(16,185,129,0.75))'
                            : isHighlighted
                            ? 'brightness(1.25)'
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
              {activeItem && !hoveredMateria ? (
                <div className="text-center px-4 animate-in fade-in duration-150">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block mb-1"
                    style={{ backgroundColor: activeItem.color }}
                  />
                  <p className="text-xs font-bold text-white max-w-[128px] truncate leading-tight">
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
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {activeItem.minutosFeitos}/{activeItem.minutosMeta} min
                  </p>
                  <p className="text-[10px] text-blue-300/90 font-mono">
                    {activeItem.shareCiclo}% do ciclo
                  </p>
                </div>
              ) : centerMateria ? (
                <div className="text-center px-3 animate-in fade-in duration-150">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block mb-1"
                    style={{ backgroundColor: centerMateria.cor }}
                  />
                  <p className="text-[11px] font-bold text-white max-w-[126px] line-clamp-2 leading-tight mx-auto">
                    {centerMateria.nome}
                  </p>
                  {centerMateria.sessoesTotal > 1 && (
                    <span className="text-[10px] text-blue-300 font-mono block mt-0.5">
                      {centerMateria.sessoesTotal} sessões
                    </span>
                  )}
                  <p
                    className={`text-xl font-black font-mono mt-0.5 leading-none ${
                      centerMateria.isConcluido ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {centerMateria.pctConcluido}%
                  </p>
                  <p className="text-[10px] text-slate-300 mt-1 leading-tight">
                    {formatarMinutosHoras(centerMateria.minutosFeitosTotal)} de{' '}
                    {formatarMinutosHoras(centerMateria.minutosMetaTotal)}
                  </p>
                  <span className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {centerMateria.shareCiclo}% do ciclo
                  </span>
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
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 -mt-1 pb-1">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span className="text-slate-300 font-medium">Barra externa: Concluído</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Em andamento</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e2f54]" />
              <span>Pendente</span>
            </span>
          </div>
        </div>

        {/* COLUNA DIREITA: Distribuição das Matérias no Ciclo */}
        <div className="w-full min-w-0 pt-3 md:pt-0 lg:pt-3 xl:pt-0 space-y-2.5 border-t md:border-t-0 md:border-l lg:border-l-0 lg:border-t xl:border-t-0 xl:border-l border-[#1d2c4c]/70 md:pl-5 lg:pl-0 xl:pl-5">
          <div className="flex flex-col gap-1 px-0.5">
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

              {effectiveSelectedDisciplinaId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(null);
                    setSelectedDisciplinaId(null);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/50 transition-all cursor-pointer"
                  title="Voltar para visão geral da volta"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar destaque</span>
                </button>
              )}
            </div>
          </div>

          {/* VISUALIZAÇÃO MOBILE (< md): Fusão de botões laterais (< >) + lista dropdown (<select>) */}
          <div className="md:hidden space-y-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMateria}
                className="p-2.5 rounded-xl bg-[#121c33] hover:bg-[#1a2b50] text-blue-400 border border-[#1e2f52] hover:border-blue-500/50 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Matéria anterior no ciclo"
                aria-label="Matéria anterior no ciclo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1 min-w-0">
                <select
                  value={effectiveSelectedDisciplinaId || ''}
                  onChange={(e) => {
                    setActiveIndex(null);
                    setSelectedDisciplinaId(e.target.value || null);
                  }}
                  className="w-full appearance-none bg-[#0d1629] border border-[#243963] focus:border-blue-500 text-white text-xs font-bold rounded-xl pl-3 pr-8 py-2.5 cursor-pointer focus:outline-none truncate"
                  aria-label="Selecionar matéria do ciclo"
                >
                  <option value="" className="bg-[#0d1629] text-slate-200">
                    Todas as matérias ({materiasAgrupadas.length}) — Visão Geral
                  </option>
                  {materiasAgrupadas.map((item, idx) => (
                    <option
                      key={item.disciplinaId}
                      value={String(item.disciplinaId)}
                      className="bg-[#0d1629] text-white"
                    >
                      {idx + 1}. {item.nome} ({item.shareCiclo}% • {item.pctConcluido}%)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-blue-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="button"
                onClick={handleNextMateria}
                className="p-2.5 rounded-xl bg-[#121c33] hover:bg-[#1a2b50] text-blue-400 border border-[#1e2f52] hover:border-blue-500/50 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Próxima matéria no ciclo"
                aria-label="Próxima matéria no ciclo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedMateria ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <span>
                    Matéria <strong className="text-slate-200">{selectedIndex + 1}</strong> de{' '}
                    <strong className="text-slate-200">{materiasAgrupadas.length}</strong> destacada no círculo
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIndex(null);
                      setSelectedDisciplinaId(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Ver todas
                  </button>
                </div>
                {renderMateriaCard(selectedMateria, { showClear: true })}
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-0.5">
                {materiasAgrupadas.map((item) => renderMateriaCard(item, { compact: true }))}
              </div>
            )}
          </div>

          {/* VISUALIZAÇÃO TABLET & DESKTOP (>= md): Grade clicável ao lado do círculo */}
          <div className="hidden md:block space-y-1.5">
            {!effectiveSelectedDisciplinaId && (
              <p className="text-[10px] text-slate-500 px-0.5">
                Clique em uma matéria abaixo ou no gráfico para destacar no círculo.
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2 md:max-h-[320px] lg:max-h-none xl:max-h-[330px] md:overflow-y-auto lg:overflow-visible xl:overflow-y-auto pr-1">
              {materiasAgrupadas.map((item) => renderMateriaCard(item))}
            </div>
          </div>
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
