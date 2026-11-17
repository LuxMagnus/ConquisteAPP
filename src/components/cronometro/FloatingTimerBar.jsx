import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  Flag,
  Maximize2,
  Clock,
  Coffee,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';
import { formatarSegundos } from '../../lib/dateUtils.js';
import { calcularTemposSessao } from '../../lib/timerUtils.js';
import { ativarWakeLock, desativarWakeLock } from '../../lib/soundUtils.js';

export function FloatingTimerBar({ onOpenTimerPage, onFinalizarSessao }) {
  const { state, dispatch, dispositivoAtual } = useStudyStore();
  const sessaoAtiva = state.sessaoAtiva;

  const [agora, setAgora] = useState(Date.now());

  // Intervalo de renderização local a cada 500ms para manter a tela atualizada com Date.now()
  useEffect(() => {
    if (!sessaoAtiva) return;

    const interval = setInterval(() => {
      setAgora(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [sessaoAtiva]);

  // Gestão de Wake Lock na mini-barra
  useEffect(() => {
    if (sessaoAtiva?.status === 'rodando') {
      ativarWakeLock();
    } else {
      desativarWakeLock();
    }
  }, [sessaoAtiva?.status]);

  const disc = useMemo(() => {
    if (!sessaoAtiva?.disciplinaId) return null;
    return state.disciplinas.find((d) => d.id === sessaoAtiva.disciplinaId);
  }, [state.disciplinas, sessaoAtiva?.disciplinaId]);

  const topico = useMemo(() => {
    if (!sessaoAtiva?.topicoId) return null;
    return state.topicos.find((t) => t.id === sessaoAtiva.topicoId);
  }, [state.topicos, sessaoAtiva?.topicoId]);

  if (!sessaoAtiva) return null;

  const tempos = calcularTemposSessao(sessaoAtiva, agora);
  const isRunning = sessaoAtiva.status === 'rodando';

  const displayTime =
    sessaoAtiva.modo === 'bloco'
      ? formatarSegundos(tempos.tempoRestanteSegundos)
      : formatarSegundos(tempos.segundosEstudo);

  function handleTogglePause(e) {
    e.stopPropagation();
    if (isRunning) {
      dispatch({ type: ACTION_TYPES.PAUSE_SESSAO_ATIVA });
    } else {
      dispatch({ type: ACTION_TYPES.RESUME_SESSAO_ATIVA });
    }
  }

  function handleFinalizarClick(e) {
    e.stopPropagation();
    // Pausa se ainda estiver rodando
    if (isRunning) {
      dispatch({ type: ACTION_TYPES.PAUSE_SESSAO_ATIVA });
    }
    onFinalizarSessao({
      ...tempos,
      questoesFeitas: sessaoAtiva.questoesFeitas || 0,
      questoesAcertos: sessaoAtiva.questoesAcertos || 0,
    });
  }

  return (
    <div
      onClick={onOpenTimerPage}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-3 left-3 sm:left-auto sm:w-96 lg:right-6 z-40 bg-[#0d1629]/95 backdrop-blur-xl border border-[#203254] shadow-2xl shadow-black/80 rounded-2xl p-2.5 sm:p-3 transition-all duration-200 hover:border-blue-500/50 cursor-pointer group"
      role="region"
      aria-label="Barra flutuante de sessão de estudo"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Esquerda: Indicador de status, Matéria e Tempo */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Status indicator ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                isRunning
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse'
                  : 'bg-amber-400 ring-4 ring-amber-400/20'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: disc?.cor || '#38bdf8' }}
              />
              <p className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[160px]">
                {disc?.nome || 'Estudo Ativo'}
              </p>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {sessaoAtiva.modo === 'bloco' ? 'Bloco' : 'Livre'}
              </span>
              {sessaoAtiva.origemDispositivo && sessaoAtiva.origemDispositivo !== dispositivoAtual && (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                  {sessaoAtiva.origemDispositivo === 'Celular' ? (
                    <Smartphone className="w-2.5 h-2.5 text-blue-400" />
                  ) : (
                    <Laptop className="w-2.5 h-2.5 text-blue-400" />
                  )}
                  <span>{sessaoAtiva.origemDispositivo}</span>
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-[180px]">
              {topico ? topico.nome : sessaoAtiva.tipo}
            </p>
          </div>
        </div>

        {/* Centro / Direita: Display de Tempo e Ações Rápidas */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right pr-1">
            <span
              className={`font-mono text-base sm:text-lg font-black tracking-tight ${
                isRunning ? 'text-white' : 'text-amber-300'
              }`}
            >
              {displayTime}
            </span>
            <span className="text-[9px] block text-slate-400 leading-none">
              {isRunning ? 'Líquido' : 'Pausado'}
            </span>
          </div>

          {/* Botão Pausar / Retomar */}
          <button
            type="button"
            onClick={handleTogglePause}
            className={`p-2 rounded-xl text-white transition-all cursor-pointer shadow-md ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
            }`}
            title={isRunning ? 'Pausar Estudo' : 'Retomar Estudo'}
            aria-label={isRunning ? 'Pausar Estudo' : 'Retomar Estudo'}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Botão Finalizar */}
          <button
            type="button"
            onClick={handleFinalizarClick}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all cursor-pointer"
            title="Finalizar e Salvar Sessão"
            aria-label="Finalizar e Salvar Sessão"
          >
            <Flag className="w-4 h-4" />
          </button>

          {/* Botão Expandir para o Cronômetro */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTimerPage();
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden sm:block"
            title="Abrir tela cheia do Cronômetro"
            aria-label="Abrir tela cheia do Cronômetro"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
