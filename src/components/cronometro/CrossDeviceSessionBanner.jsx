import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Play,
  Pause,
  Flag,
  RotateCcw,
  Maximize2,
  AlertTriangle,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { formatarSegundos } from '../../lib/dateUtils.js';
import { calcularTemposSessao } from '../../lib/timerUtils.js';

export function CrossDeviceSessionBanner({
  sessaoAtiva,
  disciplina,
  topico,
  dispositivoAtual,
  onOpenTimerPage,
  onTogglePause,
  onFinalizar,
  onDescartar,
}) {
  const [agora, setAgora] = useState(Date.now());
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!sessaoAtiva) return;
    const interval = setInterval(() => {
      setAgora(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [sessaoAtiva]);

  if (!sessaoAtiva || minimized) return null;

  // Mostra destaque especial se a sessão foi originada em outro aparelho (ex: celular para computador)
  const origem = sessaoAtiva.origemDispositivo || 'Celular';
  const isFromOtherDevice = sessaoAtiva.origemDispositivo && sessaoAtiva.origemDispositivo !== dispositivoAtual;

  const tempos = calcularTemposSessao(sessaoAtiva, agora);
  const isRunning = sessaoAtiva.status === 'rodando';

  const displayTime =
    sessaoAtiva.modo === 'bloco'
      ? formatarSegundos(tempos.tempoRestanteSegundos)
      : formatarSegundos(tempos.segundosEstudo);

  // Verifica se o celular parou de enviar heartbeat há mais de 15 minutos enquanto em modo livre
  const ultimoHeartbeatEpoch = sessaoAtiva.ultimoHeartbeat || sessaoAtiva.inicioEpochMs || null;
  const minutosDesdeHeartbeat = ultimoHeartbeatEpoch
    ? Math.floor((agora - ultimoHeartbeatEpoch) / (1000 * 60))
    : 0;
  const possivelDescarregamentoLongo =
    isFromOtherDevice &&
    sessaoAtiva.modo === 'livre' &&
    minutosDesdeHeartbeat >= 15;

  // Sessão iniciada neste mesmo aparelho já é controlada pela barra flutuante e pela
  // tela do cronômetro: o banner do topo só aparece para sessões de outro aparelho
  // (ou quando o outro aparelho parou de responder), evitando controles duplicados.
  if (!isFromOtherDevice && !possivelDescarregamentoLongo) return null;

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 pt-3">
      <div className="max-w-7xl mx-auto bg-gradient-to-r from-[#122244] via-[#0f1d3b] to-[#122040] border border-blue-500/30 rounded-2xl px-3 py-2.5 sm:px-4 shadow-lg shadow-black/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Lado Esquerdo: Identificação do Dispositivo de Origem e Matéria */}
        <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
          <div className="relative p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shrink-0">
            {origem === 'Celular' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            {isRunning && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-[#0d1629]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {isFromOtherDevice ? `Iniciado no ${origem}` : 'Sessão em Andamento'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {sessaoAtiva.modo === 'bloco' ? `Pomodoro (${sessaoAtiva.duracaoBlocoMinutos}m)` : 'Modo Livre'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: disciplina?.cor || '#38bdf8' }}
              />
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {disciplina?.nome || 'Disciplina Ativa'}
              </p>
              {topico && (
                <span className="text-xs text-slate-400 truncate hidden sm:inline">
                  • {topico.nome}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Centro / Alerta se o celular descarregou há muito tempo em modo livre */}
        {possivelDescarregamentoLongo && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>
              Celular parou de responder há {minutosDesdeHeartbeat}m (bateria descarregada).
            </span>
          </div>
        )}

        {/* Lado Direito: Cronômetro e Ações Rápidas */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0">
          <div className="text-right">
            <span className="font-mono text-base sm:text-lg font-black text-white tracking-wider">
              {displayTime}
            </span>
            <span className="text-[9px] block text-slate-400 leading-none">
              {sessaoAtiva.modo === 'bloco' ? 'Restante' : 'Líquido'} ({isRunning ? 'Rodando' : 'Pausado'})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePause}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
              title={isRunning ? 'Pausar' : 'Retomar'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={onFinalizar}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Finalizar e Salvar Sessão"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Finalizar</span>
            </button>

            <button
              type="button"
              onClick={onOpenTimerPage}
              className="p-2 text-slate-300 hover:text-white bg-[#172545] hover:bg-[#1e325c] border border-[#263c6e] rounded-xl transition-colors cursor-pointer"
              title="Abrir Tela do Cronômetro"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Ocultar aviso do topo (o cronômetro continuará na barra inferior)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
