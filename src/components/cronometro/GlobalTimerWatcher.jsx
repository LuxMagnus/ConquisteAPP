import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';
import { calcularTemposSessao } from '../../lib/timerUtils.js';
import {
  tocarAlarmeFimDeBloco,
  dispararNotificacao,
  ativarWakeLock,
  desativarWakeLock,
} from '../../lib/soundUtils.js';
import { CrossDevicePomodoroModal } from './CrossDevicePomodoroModal.jsx';
import { CrossDeviceSessionBanner } from './CrossDeviceSessionBanner.jsx';

export function GlobalTimerWatcher({ onOpenTimerPage, onOpenSaveModal }) {
  const { state, dispatch, dispositivoAtual } = useStudyStore();
  const sessaoAtiva = state.sessaoAtiva;

  const [agora, setAgora] = useState(Date.now());
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);

  // Evita reabrir o modal se o usuário já o dispensou nesta sessão do browser
  const dismissedPomodoroIdRef = useRef(null);

  // Intervalo global de verificação de tempo a cada 500ms
  useEffect(() => {
    if (!sessaoAtiva) return;

    const interval = setInterval(() => {
      setAgora(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [sessaoAtiva]);

  // Gestão global de Wake Lock
  useEffect(() => {
    if (sessaoAtiva?.status === 'rodando') {
      ativarWakeLock();
    } else {
      desativarWakeLock();
    }
    return () => {
      desativarWakeLock();
    };
  }, [sessaoAtiva?.status]);

  // Detector Global de Pomodoro Concluído (funciona em qualquer aba e restaura sessões que encerraram offline)
  useEffect(() => {
    if (!sessaoAtiva) {
      setIsPomodoroModalOpen(false);
      dismissedPomodoroIdRef.current = null;
      return;
    }

    // Se a sessão já foi marcada como encerrada por Pomodoro na nuvem ou no carregamento inicial
    if (sessaoAtiva.encerradoPorPomodoro) {
      const sessionIdKey = `${sessaoAtiva.inicioISO}-${sessaoAtiva.disciplinaId}`;
      if (dismissedPomodoroIdRef.current !== sessionIdKey) {
        setIsPomodoroModalOpen(true);
      }
      return;
    }

    if (sessaoAtiva.modo !== 'bloco' || sessaoAtiva.blocoNotificado) {
      return;
    }

    const { blocoConcluido } = calcularTemposSessao(sessaoAtiva, agora);

    if (blocoConcluido) {
      const metaMs = (Number(sessaoAtiva.duracaoBlocoMinutos) || 25) * 60 * 1000;
      const sessionIdKey = `${sessaoAtiva.inicioISO}-${sessaoAtiva.disciplinaId}`;

      // 1. Congela imediatamente a contagem e marca como concluído por Pomodoro
      dispatch({
        type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
        payload: {
          blocoNotificado: true,
          encerradoPorPomodoro: true,
          status: 'pausado',
          acumuladoEstudoMs: metaMs,
          ultimoInicioIntervalo: null,
          ultimoInicioPausa: null, // Não corre pausa automaticamente!
          dataEncerramentoPomodoroISO: new Date().toISOString(),
        },
      });

      // 2. Dispara som sintetizado e notificação do sistema
      tocarAlarmeFimDeBloco(state.config?.alarmeAtivo);

      const disc = state.disciplinas.find((d) => d.id === sessaoAtiva.disciplinaId);
      const origem = sessaoAtiva.origemDispositivo || 'Celular';
      dispararNotificacao('Pomodoro de Foco Concluído!', {
        body: `Meta de ${sessaoAtiva.duracaoBlocoMinutos}m em ${disc?.nome || 'Estudos'} cumprida com sucesso (${origem}).`,
      });

      // 3. Abre o modal global de conclusão
      if (dismissedPomodoroIdRef.current !== sessionIdKey) {
        setIsPomodoroModalOpen(true);
      }
    }
  }, [sessaoAtiva, agora, state.config?.alarmeAtivo, state.disciplinas, dispatch]);

  const disc = useMemo(() => {
    if (!sessaoAtiva?.disciplinaId) return null;
    return state.disciplinas.find((d) => d.id === sessaoAtiva.disciplinaId);
  }, [state.disciplinas, sessaoAtiva?.disciplinaId]);

  const topico = useMemo(() => {
    if (!sessaoAtiva?.topicoId) return null;
    return state.topicos.find((t) => t.id === sessaoAtiva.topicoId);
  }, [state.topicos, sessaoAtiva?.topicoId]);

  const cicloAtivo = useMemo(() => {
    const provaId = disc?.provaId || state.config?.provaAtivaId;
    return state.ciclos.find((c) => c.provaId === provaId) || null;
  }, [state.ciclos, disc?.provaId, state.config?.provaAtivaId]);

  const blocoCiclo = useMemo(() => {
    if (!cicloAtivo || !sessaoAtiva?.disciplinaId) return null;
    if (sessaoAtiva?.blocoId) {
      return cicloAtivo.blocos?.find((b) => b.id === sessaoAtiva.blocoId) || null;
    }
    return (
      cicloAtivo.blocos?.find((b) => b.disciplinaId === sessaoAtiva.disciplinaId && !b.concluido) ||
      cicloAtivo.blocos?.find((b) => b.disciplinaId === sessaoAtiva.disciplinaId) ||
      null
    );
  }, [cicloAtivo, sessaoAtiva?.disciplinaId, sessaoAtiva?.blocoId]);

  // Ações do Modal de Pomodoro
  function handleFinalizarESalvarPomodoro() {
    setIsPomodoroModalOpen(false);
    const metaSegundos = (Number(sessaoAtiva?.duracaoBlocoMinutos) || 25) * 60;
    onOpenSaveModal({
      segundosEstudo: metaSegundos,
      segundosPausa: Math.floor((sessaoAtiva?.acumuladoPausaMs || 0) / 1000),
      questoesFeitas: sessaoAtiva?.questoesFeitas || 0,
      questoesAcertos: sessaoAtiva?.questoesAcertos || 0,
    });
  }

  function handleContinuarLivrePomodoro() {
    setIsPomodoroModalOpen(false);
    dispatch({
      type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
      payload: {
        modo: 'livre',
        status: 'rodando',
        blocoNotificado: false,
        encerradoPorPomodoro: false,
        ultimoInicioIntervalo: Date.now(),
        ultimoInicioPausa: null,
      },
    });
  }

  function handlePausarPomodoro() {
    setIsPomodoroModalOpen(false);
    dispatch({
      type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
      payload: {
        status: 'pausado',
        ultimoInicioIntervalo: null,
        ultimoInicioPausa: Date.now(),
      },
    });
  }

  function handleDescartarPomodoro() {
    setIsPomodoroModalOpen(false);
    desativarWakeLock();
    dispatch({ type: ACTION_TYPES.DISCARD_SESSAO_ATIVA });
  }

  function handleCloseModal() {
    setIsPomodoroModalOpen(false);
    if (sessaoAtiva) {
      dismissedPomodoroIdRef.current = `${sessaoAtiva.inicioISO}-${sessaoAtiva.disciplinaId}`;
    }
  }

  // Ações da Banner Cross-Device
  function handleTogglePauseBanner() {
    if (sessaoAtiva?.status === 'rodando') {
      dispatch({ type: ACTION_TYPES.PAUSE_SESSAO_ATIVA });
    } else {
      dispatch({ type: ACTION_TYPES.RESUME_SESSAO_ATIVA });
    }
  }

  function handleFinalizarBanner() {
    const tempos = calcularTemposSessao(sessaoAtiva, Date.now());
    if (sessaoAtiva?.status === 'rodando') {
      dispatch({ type: ACTION_TYPES.PAUSE_SESSAO_ATIVA });
    }
    onOpenSaveModal(tempos);
  }

  return (
    <>
      {/* Banner Superior para Sessão Cross-Device Ativa */}
      {sessaoAtiva && !isPomodoroModalOpen && (
        <CrossDeviceSessionBanner
          sessaoAtiva={sessaoAtiva}
          disciplina={disc}
          topico={topico}
          dispositivoAtual={dispositivoAtual}
          onOpenTimerPage={onOpenTimerPage}
          onTogglePause={handleTogglePauseBanner}
          onFinalizar={handleFinalizarBanner}
          onDescartar={handleDescartarPomodoro}
        />
      )}

      {/* Modal de Pomodoro Concluído (Cross-Device ou Local) */}
      <CrossDevicePomodoroModal
        isOpen={isPomodoroModalOpen}
        onClose={handleCloseModal}
        sessaoAtiva={sessaoAtiva}
        disciplina={disc}
        topico={topico}
        blocoCiclo={blocoCiclo}
        dispositivoAtual={dispositivoAtual}
        onFinalizarESalvar={handleFinalizarESalvarPomodoro}
        onContinuarLivre={handleContinuarLivrePomodoro}
        onPausar={handlePausarPomodoro}
        onDescartar={handleDescartarPomodoro}
      />
    </>
  );
}
