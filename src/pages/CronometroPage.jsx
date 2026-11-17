import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Trash2,
  Bell,
  BellOff,
  Sparkles,
  Layers,
  BookOpen,
  Coffee,
  CheckCircle2,
  Plus,
  Bookmark,
  BookmarkCheck,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { ConfirmModal } from '../components/common/Modal.jsx';
import { SalvarSessaoModal } from '../components/cronometro/SalvarSessaoModal.jsx';
import { BlocoConcluidoModal } from '../components/cronometro/BlocoConcluidoModal.jsx';
import { HistoricoSessoes } from '../components/cronometro/HistoricoSessoes.jsx';
import { InserirSessaoManualModal } from '../components/cronometro/InserirSessaoManualModal.jsx';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';
import { formatarSegundos, getNowISO } from '../lib/dateUtils.js';
import {
  calcularTemposSessao,
  PRESETS_BLOCO,
  calcularPercentualAcertos,
} from '../lib/timerUtils.js';
import { sugerirProximaMateria } from '../lib/cicloUtils.js';
import {
  tocarAlarmeFimDeBloco,
  tocarBeepSimples,
  pedirPermissaoNotificacao,
  dispararNotificacao,
  ativarWakeLock,
  desativarWakeLock,
} from '../lib/soundUtils.js';

export function CronometroPage({ prefilledConfig, onClearPrefilled }) {
  const { state, dispatch, disciplinasDaProva, dispositivoAtual } = useStudyStore();
  const sessaoAtiva = state.sessaoAtiva;

  // Tabs superiores: 'timer' ou 'historico'
  const [tabAtiva, setTabAtiva] = useState('timer');

  // Modal para inserção manual de estudos
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Configurações para iniciar nova sessão
  const [disciplinaId, setDisciplinaId] = useState('');
  const [topicoId, setTopicoId] = useState('');
  const [tipoEstudo, setTipoEstudo] = useState('teoria');
  // Memoriza preferência de modo do usuário: padrão modo livre (vinculado ao ciclo)
  const [modoEstudo, setModoEstudo] = useState(() => {
    return localStorage.getItem('conquiste_timer_mode') || 'livre';
  });
  const [duracaoBloco, setDuracaoBloco] = useState(25); // minutos
  const [duracaoCustomizada, setDuracaoCustomizada] = useState('');
  const [isCustomDuracao, setIsCustomDuracao] = useState(false);

  function handleMudarModo(novoModo) {
    setModoEstudo(novoModo);
    try {
      localStorage.setItem('conquiste_timer_mode', novoModo);
    } catch (e) {
      // Ignora erro de storage
    }
  }

  // Modais de controle
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isBlocoModalOpen, setIsBlocoModalOpen] = useState(false);

  // Questões em tempo real durante a sessão (inicia com os dados da sessão ativa se existirem)
  const [questoesFeitasLocal, setQuestoesFeitasLocal] = useState(() => sessaoAtiva?.questoesFeitas || 0);
  const [questoesAcertosLocal, setQuestoesAcertosLocal] = useState(() => sessaoAtiva?.questoesAcertos || 0);
  const [questoesChutesLocal, setQuestoesChutesLocal] = useState(() => sessaoAtiva?.questoesChutes || sessaoAtiva?.questoesDuvida || 0);

  // Mantém os contadores sincronizados com a sessão ativa
  useEffect(() => {
    if (sessaoAtiva) {
      if (typeof sessaoAtiva.questoesFeitas === 'number') {
        setQuestoesFeitasLocal(sessaoAtiva.questoesFeitas);
      }
      if (typeof sessaoAtiva.questoesAcertos === 'number') {
        setQuestoesAcertosLocal(sessaoAtiva.questoesAcertos);
      }
      if (typeof sessaoAtiva.questoesChutes === 'number' || typeof sessaoAtiva.questoesDuvida === 'number') {
        setQuestoesChutesLocal(sessaoAtiva.questoesChutes ?? sessaoAtiva.questoesDuvida ?? 0);
      }
    } else {
      setQuestoesFeitasLocal(0);
      setQuestoesAcertosLocal(0);
      setQuestoesChutesLocal(0);
    }
  }, [sessaoAtiva?.id, sessaoAtiva?.inicioISO]);

  function handleAtualizarQuestoes(novoFeitas, novoAcertos, novoChutes) {
    const rawChutes = novoChutes !== undefined ? novoChutes : questoesChutesLocal;
    const c = Math.max(0, rawChutes);
    const a = Math.max(c, Math.max(0, novoAcertos)); // Acertos total deve ser pelo menos igual aos chutes
    const f = Math.max(a, Math.max(0, novoFeitas));  // Feitas deve ser pelo menos igual aos acertos
    const finalChutes = Math.min(c, a);

    setQuestoesFeitasLocal(f);
    setQuestoesAcertosLocal(a);
    setQuestoesChutesLocal(finalChutes);

    if (sessaoAtiva) {
      dispatch({
        type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
        payload: {
          questoesFeitas: f,
          questoesAcertos: a,
          questoesChutes: finalChutes,
        },
      });
    }
  }

  // Timestamp reativo atualizado a cada 500ms
  const [agora, setAgora] = useState(Date.now());

  // Ciclo Ativo da Prova
  const cicloAtivo = useMemo(() => {
    const provaId = state.config?.provaAtivaId;
    return state.ciclos.find((c) => c.provaId === provaId) || state.ciclos[0] || null;
  }, [state.ciclos, state.config?.provaAtivaId]);

  // Próxima matéria sugerida na ordem do ciclo (enquanto carga horária não for cumprida)
  const proximaSugerida = useMemo(() => {
    if (!cicloAtivo || disciplinasDaProva.length === 0) return null;
    return sugerirProximaMateria(cicloAtivo, disciplinasDaProva, state.topicos);
  }, [cicloAtivo, disciplinasDaProva, state.topicos]);

  // Ref para rastrear se o usuário escolheu uma disciplina manualmente fora do ciclo
  const manualDiscSelectionRef = useRef(false);
  // Controle para expandir seletores manuais de disciplina/tópico (opcional)
  const [mostrarAjustesMateria, setMostrarAjustesMateria] = useState(false);

  // Aplica pré-preenchimento vindo do Plano de Estudos ("Estudar agora")
  useEffect(() => {
    if (prefilledConfig && prefilledConfig.disciplinaId) {
      manualDiscSelectionRef.current = true;
      setDisciplinaId(prefilledConfig.disciplinaId);
      if (prefilledConfig.topicoId) {
        setTopicoId(prefilledConfig.topicoId);
      }
      if (prefilledConfig.duracaoBloco) {
        setDuracaoBloco(prefilledConfig.duracaoBloco);
        handleMudarModo('bloco');
      }
      setTabAtiva('timer');
      if (onClearPrefilled) {
        onClearPrefilled();
      }
    }
  }, [prefilledConfig, onClearPrefilled]);

  // Modo Foco deve SEMPRE sugerir a matéria da ordem do ciclo automaticamente
  // enquanto a carga não for cumprida (sem necessidade de clicar em "Carregar")
  useEffect(() => {
    if (sessaoAtiva) return;

    if (!manualDiscSelectionRef.current && proximaSugerida?.disciplina) {
      setDisciplinaId(proximaSugerida.disciplina.id);
      if (proximaSugerida.topicoSugerido?.id) {
        setTopicoId(proximaSugerida.topicoSugerido.id);
      } else if (proximaSugerida.disciplina.ultimoTopicoId) {
        setTopicoId(proximaSugerida.disciplina.ultimoTopicoId);
      } else {
        setTopicoId('');
      }
      if (proximaSugerida.bloco?.minutosMeta) {
        setDuracaoBloco(proximaSugerida.bloco.minutosMeta);
      }
    } else if (!disciplinaId && disciplinasDaProva.length > 0) {
      const defaultDisc = disciplinasDaProva.find((d) => d.ativa !== false) || disciplinasDaProva[0];
      setDisciplinaId(defaultDisc.id);
      if (defaultDisc.ultimoTopicoId) {
        setTopicoId(defaultDisc.ultimoTopicoId);
      }
    }
  }, [disciplinasDaProva, proximaSugerida, sessaoAtiva, disciplinaId]);

  // Ao mudar de disciplina manualmente, sugere o último tópico estudado com seu ponto de parada
  function handleSelectDisciplina(novoId) {
    manualDiscSelectionRef.current = true;
    setDisciplinaId(novoId);
    const d = state.disciplinas.find((x) => x.id === novoId);
    if (d?.ultimoTopicoId) {
      setTopicoId(d.ultimoTopicoId);
    } else {
      setTopicoId('');
    }
  }

  function handleResetarParaCiclo() {
    manualDiscSelectionRef.current = false;
    if (proximaSugerida?.disciplina) {
      setDisciplinaId(proximaSugerida.disciplina.id);
      if (proximaSugerida.topicoSugerido?.id) {
        setTopicoId(proximaSugerida.topicoSugerido.id);
      } else if (proximaSugerida.disciplina.ultimoTopicoId) {
        setTopicoId(proximaSugerida.disciplina.ultimoTopicoId);
      } else {
        setTopicoId('');
      }
    }
  }

  // Tique-taque reativo via Date.now()
  useEffect(() => {
    const interval = setInterval(() => {
      setAgora(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Gestão de Wake Lock e Notificação de Fim de Bloco
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

  // Monitora se o bloco terminou para disparar alarme e aviso
  useEffect(() => {
    if (!sessaoAtiva || sessaoAtiva.modo !== 'bloco' || sessaoAtiva.blocoNotificado) {
      return;
    }

    const { blocoConcluido } = calcularTemposSessao(sessaoAtiva, agora);

    if (blocoConcluido) {
      // 1. CONGELA IMEDIATAMENTE O TEMPO DE ESTUDO na meta do temporizador.
      // E NÃO INICIA CONTAGEM DE PAUSA (ultimoInicioPausa: null)!
      // Isso impede que o tempo continue contando enquanto o pop-up estiver aberto na tela.
      const metaMs = (Number(sessaoAtiva.duracaoBlocoMinutos) || 25) * 60 * 1000;
      dispatch({
        type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
        payload: {
          blocoNotificado: true,
          status: 'pausado',
          acumuladoEstudoMs: metaMs,
          ultimoInicioIntervalo: null,
          ultimoInicioPausa: null, // NÃO corre pausa! Fica congelado aguardando escolha do usuário
        },
      });

      // 2. Toca o alarme sintetizado Web Audio API
      tocarAlarmeFimDeBloco(state.config?.alarmeAtivo);

      // 3. Dispara a notificação de sistema
      const disc = state.disciplinas.find((d) => d.id === sessaoAtiva.disciplinaId);
      dispararNotificacao('Temporizador de Foco Finalizado!', {
        body: `Excelente foco em ${disc?.nome || 'sua matéria'}! Meta da sessão de ${sessaoAtiva.duracaoBlocoMinutos}m atingida.`,
      });

      // 4. Abre o modal visual de celebração/escolha
      setIsBlocoModalOpen(true);
    }
  }, [sessaoAtiva, agora, state.config?.alarmeAtivo, state.disciplinas, dispatch]);

  // Tópicos da disciplina selecionada
  const topicosDaDisciplina = useMemo(() => {
    const targetDiscId = sessaoAtiva ? sessaoAtiva.disciplinaId : disciplinaId;
    return state.topicos.filter((t) => t.disciplinaId === targetDiscId);
  }, [state.topicos, sessaoAtiva, disciplinaId]);

  // Cálculos matemáticos robustos da sessão ativa
  const tempos = useMemo(() => {
    return calcularTemposSessao(sessaoAtiva, agora);
  }, [sessaoAtiva, agora]);

  // Disciplina e tópico ativos
  const discAtiva = useMemo(() => {
    const id = sessaoAtiva ? sessaoAtiva.disciplinaId : disciplinaId;
    return state.disciplinas.find((d) => d.id === id);
  }, [state.disciplinas, sessaoAtiva, disciplinaId]);

  const topicoAtivo = useMemo(() => {
    const id = sessaoAtiva ? sessaoAtiva.topicoId : topicoId;
    return state.topicos.find((t) => t.id === id);
  }, [state.topicos, sessaoAtiva, topicoId]);

  // Handlers de Ações
  async function handleIniciarSessao() {
    if (!disciplinaId) return;

    // Pede permissão de notificação nativa ao iniciar para garantir entrega futura
    await pedirPermissaoNotificacao();

    const duracaoFinal = isCustomDuracao
      ? Math.max(1, Math.min(360, parseInt(duracaoCustomizada, 10) || 25))
      : duracaoBloco;

    // Identifica o bloco do ciclo sendo estudado (ou o bloco sugerido)
    const targetBloco = (
      (prefilledConfig?.blocoId && cicloAtivo?.blocos?.find((b) => b.id === prefilledConfig.blocoId)) ||
      (proximaSugerida?.disciplina?.id === disciplinaId ? proximaSugerida?.bloco : null) ||
      cicloAtivo?.blocos?.find((b) => b.disciplinaId === disciplinaId && !b.concluido) ||
      cicloAtivo?.blocos?.find((b) => b.disciplinaId === disciplinaId) ||
      null
    );

    const agoraTs = Date.now();
    const novaSessaoAtiva = {
      disciplinaId,
      blocoId: targetBloco?.id || null,
      topicoId: topicoId || null,
      tipo: tipoEstudo,
      modo: modoEstudo,
      duracaoBlocoMinutos: duracaoFinal,
      status: 'rodando',
      inicioISO: getNowISO(),
      inicioEpochMs: agoraTs,
      acumuladoEstudoMs: 0,
      acumuladoPausaMs: 0,
      ultimoInicioIntervalo: agoraTs,
      ultimoInicioPausa: null,
      blocoNotificado: false,
      encerradoPorPomodoro: false,
      origemDispositivo: dispositivoAtual || 'Celular',
      ultimoHeartbeat: agoraTs,
    };

    setQuestoesFeitasLocal(0);
    setQuestoesAcertosLocal(0);
    setQuestoesChutesLocal(0);

    tocarBeepSimples(state.config?.alarmeAtivo);
    dispatch({
      type: ACTION_TYPES.START_SESSAO_ATIVA,
      payload: novaSessaoAtiva,
    });
  }

  function handlePausar() {
    tocarBeepSimples(state.config?.alarmeAtivo);
    dispatch({ type: ACTION_TYPES.PAUSE_SESSAO_ATIVA });
  }

  function handleRetomar() {
    tocarBeepSimples(state.config?.alarmeAtivo);
    dispatch({ type: ACTION_TYPES.RESUME_SESSAO_ATIVA });
  }

  function handleSolicitarDescarte() {
    setIsDiscardModalOpen(true);
  }

  function handleConfirmarDescarte() {
    desativarWakeLock();
    manualDiscSelectionRef.current = false;
    dispatch({ type: ACTION_TYPES.DISCARD_SESSAO_ATIVA });
    setIsDiscardModalOpen(false);
  }

  function handleAbrirSalvar() {
    const agoraTs = Date.now();
    let extraEstudo = 0;
    let extraPausa = 0;

    if (sessaoAtiva?.status === 'rodando' && sessaoAtiva.ultimoInicioIntervalo) {
      extraEstudo = Math.max(0, agoraTs - sessaoAtiva.ultimoInicioIntervalo);
    } else if (sessaoAtiva?.status === 'pausado' && sessaoAtiva.ultimoInicioPausa) {
      extraPausa = Math.max(0, agoraTs - sessaoAtiva.ultimoInicioPausa);
    }

    // Congela a sessão completamente: ultimoInicioPausa = null impede que a pausa corra enquanto o usuário digita e salva
    dispatch({
      type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
      payload: {
        status: 'pausado',
        acumuladoEstudoMs: (sessaoAtiva?.acumuladoEstudoMs || 0) + extraEstudo,
        acumuladoPausaMs: (sessaoAtiva?.acumuladoPausaMs || 0) + extraPausa,
        ultimoInicioIntervalo: null,
        ultimoInicioPausa: null, // CONGELADO! Não conta pausa no modal de salvar
      },
    });

    setIsSaveModalOpen(true);
  }

  function handlePausarDoBloco() {
    setIsBlocoModalOpen(false);
    tocarBeepSimples(state.config?.alarmeAtivo);
    // Usuário optou explicitamente por iniciar pausa cronometrada
    dispatch({
      type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
      payload: {
        status: 'pausado',
        ultimoInicioIntervalo: null,
        ultimoInicioPausa: Date.now(),
      },
    });
  }

  function handleContinuarLivreDoBloco() {
    setIsBlocoModalOpen(false);
    tocarBeepSimples(state.config?.alarmeAtivo);
    // Retoma estudo em modo livre sem perder o tempo já acumulado
    dispatch({
      type: ACTION_TYPES.UPDATE_SESSAO_ATIVA,
      payload: {
        modo: 'livre',
        status: 'rodando',
        ultimoInicioIntervalo: Date.now(),
        ultimoInicioPausa: null,
      },
    });
  }

  function handleSalvarSessao(dadosSessao) {
    // Incorpora eventuais questões computadas na interface e o ID do bloco do ciclo
    const dadosFinais = {
      ...dadosSessao,
      blocoId: dadosSessao.blocoId || sessaoAtiva?.blocoId || blocoCicloAtual?.id || null,
      questoesFeitas: dadosSessao.questoesFeitas ?? questoesFeitasLocal,
      questoesAcertos: dadosSessao.questoesAcertos ?? questoesAcertosLocal,
      questoesChutes: dadosSessao.questoesChutes ?? questoesChutesLocal,
    };

    dispatch({ type: ACTION_TYPES.ADD_SESSAO, payload: dadosFinais });
    setIsSaveModalOpen(false);
    setIsBlocoModalOpen(false);
    desativarWakeLock();
    // Ao salvar uma sessão, reseta a seleção manual para carregar automaticamente a próxima matéria do ciclo
    manualDiscSelectionRef.current = false;
    setTabAtiva('timer');
  }

  // Vínculo com o bloco do ciclo e cálculos de meta
  const blocoCicloAtual = useMemo(() => {
    if (!cicloAtivo) return null;
    const targetId = sessaoAtiva ? sessaoAtiva.disciplinaId : disciplinaId;
    if (sessaoAtiva?.blocoId) {
      return cicloAtivo.blocos?.find((b) => b.id === sessaoAtiva.blocoId) || null;
    }
    // Senão pega o primeiro bloco pendente dessa disciplina no ciclo
    return (
      cicloAtivo.blocos?.find((b) => b.disciplinaId === targetId && !b.concluido) ||
      cicloAtivo.blocos?.find((b) => b.disciplinaId === targetId) ||
      null
    );
  }, [cicloAtivo, sessaoAtiva, disciplinaId]);

  const minutosMetaCiclo = blocoCicloAtual?.minutosMeta || (sessaoAtiva?.duracaoBlocoMinutos || 60);
  const minutosFeitosAnteriores = blocoCicloAtual?.minutosFeitos || 0;
  const segundosMetaTotal = minutosMetaCiclo * 60;
  const segundosEstudadosTotal = (minutosFeitosAnteriores * 60) + tempos.segundosEstudo;
  const isMetaCicloAtingida = Boolean(blocoCicloAtual?.concluido) || (segundosEstudadosTotal >= segundosMetaTotal);

  const corDisc = discAtiva?.cor || '#38bdf8';
  const isRodando = sessaoAtiva?.status === 'rodando';
  const showActiveGlow = isRodando && !isMetaCicloAtingida;

  // Bloco circular progressivo / SVG
  const radius = 104;
  const circumference = 2 * Math.PI * radius;

  // Em modo livre, o círculo também progride visualmente em direção à meta da volta do ciclo!
  const pctModoLivre = Math.min(100, Math.round((segundosEstudadosTotal / segundosMetaTotal) * 100));
  const strokeDashoffsetLivre = circumference - (pctModoLivre / 100) * circumference;

  const strokeDashoffsetBloco =
    circumference - (tempos.progressoPercentual / 100) * circumference;

  const strokeDashoffset =
    sessaoAtiva?.modo === 'bloco'
      ? strokeDashoffsetBloco
      : strokeDashoffsetLivre;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
      {tabAtiva === 'historico' ? (
        /* Aba do Histórico Completo de Sessões */
        <Card className="p-4 sm:p-6 bg-[#0e1628] border-[#1d2c4c]">
          <HistoricoSessoes showFilter={true} />
        </Card>
      ) : (
        /* Aba do Cronômetro Ativo / Configuração */
        <div className="space-y-6">
          <Card className="p-3.5 sm:p-6 text-center bg-gradient-to-b from-[#131f3b] via-[#0f172a] to-[#0a101d] border-[#22355c] shadow-2xl relative overflow-hidden">
            {/* 1. TOPO: Identificação Clara da Matéria e Ponto de Parada (100% Automático) */}
            {!sessaoAtiva ? (
              <div className="max-w-md mx-auto space-y-2">
                {/* Badge da Ordem do Ciclo */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/25">
                    Ciclo de Estudos • Volta {cicloAtivo?.voltaAtual || 1}
                  </span>
                  {blocoCicloAtual?.sessaoTotal > 1 && (
                    <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      Sessão {blocoCicloAtual.sessaoNumero || 1} de {blocoCicloAtual.sessaoTotal}
                    </span>
                  )}
                  {blocoCicloAtual && (
                    <span className="text-[11px] font-semibold text-slate-300 bg-[#142340] px-2.5 py-0.5 rounded-full border border-[#22355b]">
                      Meta: {minutosMetaCiclo}m
                      {minutosMetaCiclo > minutosFeitosAnteriores ? (
                        <span className="text-amber-400 ml-1 font-bold">
                          (Faltam {minutosMetaCiclo - minutosFeitosAnteriores}m)
                        </span>
                      ) : (
                        <span className="text-emerald-400 ml-1 font-bold">✓ Cumprida</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Nome da Matéria da Ordem do Ciclo */}
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: corDisc }}
                  />
                  <span>{discAtiva?.nome || 'Selecione uma Matéria'}</span>
                </h2>

                {/* Ponto de Parada em Destaque Visível Imediato */}
                {discAtiva?.ultimoPontoDeParada ? (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-left flex items-start gap-2.5 shadow-sm">
                    <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Ponto de Parada da Matéria
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 break-words">
                        "{discAtiva.ultimoPontoDeParada}"
                      </p>
                      {topicoAtivo && (
                        <p className="text-[11px] text-slate-300 mt-0.5 truncate flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Tópico sugerido: <strong className="text-white">{topicoAtivo.nome}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : topicoAtivo ? (
                  <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Tópico sugerido: <strong className="text-slate-200">{topicoAtivo.nome}</strong></span>
                  </div>
                ) : null}
              </div>
            ) : (
              /* Sessão em Andamento */
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#172545] border border-[#263c6e]">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        sessaoAtiva.status === 'rodando'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200">
                      {sessaoAtiva.status === 'rodando' ? 'Foco Líquido Ativo' : 'Sessão Pausada'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      {sessaoAtiva.modo === 'bloco'
                        ? `Bloco ${sessaoAtiva.duracaoBlocoMinutos}m`
                        : 'Modo Livre (Ciclo)'}
                    </span>
                    {blocoCicloAtual?.sessaoTotal > 1 && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs font-mono font-bold text-blue-300">
                          Sessão {blocoCicloAtual.sessaoNumero}/{blocoCicloAtual.sessaoTotal}
                        </span>
                      </>
                    )}
                  </div>

                  {sessaoAtiva.origemDispositivo && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-full">
                      {sessaoAtiva.origemDispositivo === 'Celular' ? (
                        <Smartphone className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-blue-400" />
                      )}
                      <span>
                        {sessaoAtiva.origemDispositivo !== dispositivoAtual
                          ? `Sincronizado do ${sessaoAtiva.origemDispositivo}`
                          : `Neste ${dispositivoAtual}`}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-base sm:text-lg text-slate-200">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: discAtiva?.cor || '#38bdf8' }}
                  />
                  <strong className="text-white font-extrabold">{discAtiva?.nome || 'Disciplina'}</strong>
                  {topicoAtivo && (
                    <>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-300 text-sm font-medium">{topicoAtivo.nome}</span>
                    </>
                  )}
                </div>

                {discAtiva?.ultimoPontoDeParada && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 max-w-full">
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Ponto de parada:</span>
                    <span className="font-semibold text-white truncate">"{discAtiva.ultimoPontoDeParada}"</span>
                  </div>
                )}
              </div>
            )}

            {/* 2. CENTRO: Mostrador Circular com Glowing Effect e Tempo Compacto */}
            <div className="my-2 sm:my-3.5 flex justify-center">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center select-none">
                {/* Efeito Glow Circular Animado (Gradiente Radial para evitar clipping de quadrado) */}
                {showActiveGlow && (
                  <div
                    className="absolute inset-0 rounded-full opacity-45 animate-pulse pointer-events-none transition-all duration-700"
                    style={{
                      background: `radial-gradient(circle, ${corDisc} 20%, transparent 70%)`,
                    }}
                  />
                )}
                {sessaoAtiva && isMetaCicloAtingida && (
                  <div
                    className="absolute inset-0 rounded-full opacity-35 animate-pulse pointer-events-none transition-all duration-700"
                    style={{
                      background: `radial-gradient(circle, #10b981 20%, transparent 70%)`,
                    }}
                  />
                )}

                {/* SVG Ring Background & Progress */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
                  {/* Trilha base do anel */}
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    className="stroke-[#162340]"
                    strokeWidth="8"
                    fill="transparent"
                  />

                  {/* Halo Pulsante Glow do SVG enquanto estuda a carga horária pendente */}
                  {showActiveGlow && (
                    <circle
                      cx="120"
                      cy="120"
                      r={radius}
                      className="transition-all duration-500 ease-linear animate-pulse"
                      stroke={corDisc}
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      opacity="0.35"
                      style={{ filter: 'blur(5px)' }}
                    />
                  )}

                  {/* Trilha do progresso (em modo bloco ou modo livre vinculado ao ciclo) */}
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    className="transition-all duration-500 ease-linear"
                    stroke={isMetaCicloAtingida ? '#10b981' : corDisc}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      filter: showActiveGlow
                        ? `drop-shadow(0 0 8px ${corDisc}) drop-shadow(0 0 16px ${corDisc})`
                        : isMetaCicloAtingida
                        ? 'drop-shadow(0 0 10px #10b981)'
                        : 'none',
                    }}
                  />
                </svg>

                {/* Conteúdo Central do Relógio */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-8">
                  {/* Tempo Principal */}
                  <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wider drop-shadow-md">
                    {!sessaoAtiva
                      ? modoEstudo === 'bloco'
                        ? formatarSegundos((isCustomDuracao ? parseInt(duracaoCustomizada, 10) || 25 : duracaoBloco) * 60)
                        : '00:00'
                      : sessaoAtiva.modo === 'bloco'
                      ? formatarSegundos(tempos.tempoRestanteSegundos)
                      : formatarSegundos(tempos.segundosEstudo)}
                  </span>

                  {/* Legenda do Timer e Status do Ciclo */}
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest font-semibold mt-1 text-slate-400 text-center">
                    {!sessaoAtiva
                      ? modoEstudo === 'livre'
                        ? 'Modo Livre (Ciclo)'
                        : 'Pronto para iniciar'
                      : sessaoAtiva.modo === 'bloco'
                      ? tempos.blocoConcluido
                        ? 'Bloco Concluído!'
                        : 'Tempo Restante'
                      : 'Tempo Líquido'}
                  </p>

                  {/* Indicador de Meta do Ciclo Cumprida ou Progresso */}
                  {sessaoAtiva && isMetaCicloAtingida && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Meta do Ciclo Atingida!</span>
                    </div>
                  )}

                  {blocoCicloAtual && (
                    <span className="text-[10px] text-slate-400/90 mt-1 font-mono text-center leading-snug">
                      <span className="block whitespace-nowrap">Meta do ciclo: {minutosMetaCiclo}m</span>
                      <span className="block whitespace-nowrap">Total volta: {Math.round(segundosEstudadosTotal / 60)}m</span>
                    </span>
                  )}

                  {/* Informação de Pausa Acumulada */}
                  {sessaoAtiva && tempos.segundosPausa > 0 && (
                    <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18274a] text-amber-300 text-[10px] font-mono font-medium">
                      <Coffee className="w-2.5 h-2.5" />
                      <span>Pausa: {formatarSegundos(tempos.segundosPausa)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. AÇÃO PRINCIPAL IMEDIATA (Iniciar Foco ou Pausar/Finalizar) */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-md mx-auto">
              {!sessaoAtiva ? (
                /* Botão Iniciar Foco em Alta Prioridade */
                <Button
                  variant="primary"
                  size="lg"
                  icon={Play}
                  onClick={handleIniciarSessao}
                  disabled={disciplinasDaProva.length === 0}
                  className="w-56 py-3.5 text-base font-extrabold shadow-xl shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  Iniciar Foco
                </Button>
              ) : (
                /* Controles Ativos: Pausar/Retomar, Finalizar, Descartar */
                <>
                  {sessaoAtiva.status === 'rodando' ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={Pause}
                      onClick={handlePausar}
                      className="w-36 text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold"
                    >
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      icon={Play}
                      onClick={handleRetomar}
                      className="w-36 text-sm bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white shadow-emerald-900/30 font-bold"
                    >
                      Retomar
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    icon={Flag}
                    onClick={handleAbrirSalvar}
                    className="w-36 text-sm bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 font-bold"
                  >
                    Finalizar
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    icon={Trash2}
                    onClick={handleSolicitarDescarte}
                    className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-3"
                    title="Descartar Sessão"
                    aria-label="Descartar Sessão"
                  />
                </>
              )}
            </div>

            {/* 4. AJUSTES SECUNDÁRIOS / OPÇÕES RÁPIDAS (ABAIXO DO PLAY) */}
            {!sessaoAtiva ? (
              <div className="mt-6 pt-5 border-t border-[#1d2c4c] max-w-md mx-auto space-y-4 text-left">
                {/* Objetivo de Estudo */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Objetivo do Estudo
                  </label>
                  <Tabs
                    tabs={[
                      { id: 'teoria', label: 'Teoria' },
                      { id: 'questoes', label: 'Questões' },
                      { id: 'revisao', label: 'Revisão' },
                    ]}
                    activeTab={tipoEstudo}
                    onChange={setTipoEstudo}
                  />
                </div>

                {/* Seletor de Modo: Bloco vs Livre (com memorização) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Modo do Cronômetro
                    </label>
                    <div className="inline-flex rounded-xl bg-[#0f172a] p-0.5 border border-[#1e2f52]">
                      <button
                        type="button"
                        onClick={() => handleMudarModo('livre')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          modoEstudo === 'livre'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Livre (Ciclo)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMudarModo('bloco')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          modoEstudo === 'bloco'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Pomodoro
                      </button>
                    </div>
                  </div>

                  {/* Opções de Bloco / Duração */}
                  {modoEstudo === 'bloco' && (
                    <div className="p-3 rounded-2xl bg-[#121c33] border border-[#1d2c4c] space-y-2.5 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Duração do Bloco</span>
                        <span className="font-bold text-emerald-400">
                          {isCustomDuracao
                            ? `${duracaoCustomizada || 25} min`
                            : `${duracaoBloco} min`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {PRESETS_BLOCO.slice(0, 5).map((preset) => {
                          const isSelected = !isCustomDuracao && duracaoBloco === preset.minutos;
                          return (
                            <button
                              key={preset.minutos}
                              type="button"
                              onClick={() => {
                                setIsCustomDuracao(false);
                                setDuracaoBloco(preset.minutos);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-white shadow font-bold border border-emerald-400'
                                  : 'bg-[#182542] text-slate-300 hover:bg-[#1f3158] border border-[#23355b]'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setIsCustomDuracao(true)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isCustomDuracao
                              ? 'bg-emerald-500 text-white shadow font-bold border border-emerald-400'
                              : 'bg-[#182542] text-slate-300 hover:bg-[#1f3158] border border-[#23355b]'
                          }`}
                        >
                          Outro...
                        </button>
                      </div>

                      {isCustomDuracao && (
                        <div className="pt-1 flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="360"
                            placeholder="Minutos"
                            value={duracaoCustomizada}
                            onChange={(e) => setDuracaoCustomizada(e.target.value)}
                            className="w-24 bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1 text-xs font-bold focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-xs text-slate-400">minutos</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Opção para trocar matéria / tópico manualmente */}
                <div className="pt-2 border-t border-[#182644]">
                  <button
                    type="button"
                    onClick={() => setMostrarAjustesMateria((v) => !v)}
                    className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      {mostrarAjustesMateria ? 'Ocultar troca de matéria' : 'Trocar matéria ou tópico manualmente'}
                    </span>
                    {mostrarAjustesMateria ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {mostrarAjustesMateria && (
                    <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] animate-in fade-in">
                      {manualDiscSelectionRef.current && (
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#1b2b4a]">
                          <span className="text-amber-400">Matéria alterada manualmente</span>
                          <button
                            type="button"
                            onClick={handleResetarParaCiclo}
                            className="text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Voltar à ordem do ciclo
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Disciplina
                          </label>
                          <select
                            value={disciplinaId}
                            onChange={(e) => handleSelectDisciplina(e.target.value)}
                            className="w-full bg-[#172440] border border-[#23355b] text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            {disciplinasDaProva.length > 0 ? (
                              disciplinasDaProva.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.nome}{d.ativa === false ? ' (Pausada do ciclo)' : ''}
                                </option>
                              ))
                            ) : (
                              <option value="">Nenhuma disciplina cadastrada</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Tópico do Edital
                          </label>
                          <select
                            value={topicoId}
                            onChange={(e) => setTopicoId(e.target.value)}
                            className="w-full bg-[#172440] border border-[#23355b] text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="">Estudo Geral / Sem tópico</option>
                            {topicosDaDisciplina.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.parentId ? `↳ ${t.nome}` : t.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Contador Rápido de Questões Durante a Sessão (3 Blocos: Feitas, Acertos, No Chute) */
              <div className="mt-6 pt-5 border-t border-[#1d2c4c] max-w-lg mx-auto space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Contador Rápido de Exercícios
                  </span>
                  {questoesFeitasLocal > 0 && (
                    <div className="flex items-center gap-2 font-mono text-[11px] self-start sm:self-auto">
                      <span className="text-emerald-400 font-bold">
                        {calcularPercentualAcertos(questoesFeitasLocal, questoesAcertosLocal)}% total
                      </span>
                      {questoesChutesLocal > 0 && (
                        <span className="text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                          {questoesChutesLocal} no chute ({Math.round((questoesChutesLocal / (questoesAcertosLocal || 1)) * 100)}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-left">
                  {/* Bloco 1: Questões Feitas */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#172440]/60 border border-[#23355b] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold block">Feitas</span>
                      <span className="text-base sm:text-lg font-mono font-bold text-white">
                        {questoesFeitasLocal}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextF = Math.max(0, questoesFeitasLocal - 1);
                          const nextA = Math.min(questoesAcertosLocal, nextF);
                          const nextC = Math.min(questoesChutesLocal, nextA);
                          handleAtualizarQuestoes(nextF, nextA, nextC);
                        }}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                        title="Diminuir questões feitas"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAtualizarQuestoes(questoesFeitasLocal + 1, questoesAcertosLocal, questoesChutesLocal)}
                        className="flex-1 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        title="Adicionar questão feita"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Bloco 2: Acertos Confirmados */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#172440]/60 border border-[#23355b] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold block">Acertos</span>
                      <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                        {questoesAcertosLocal}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextA = Math.max(0, questoesAcertosLocal - 1);
                          const nextC = Math.min(questoesChutesLocal, nextA);
                          handleAtualizarQuestoes(questoesFeitasLocal, nextA, nextC);
                        }}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                        title="Diminuir acertos"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAcertos = questoesAcertosLocal + 1;
                          const nextFeitas = Math.max(questoesFeitasLocal, nextAcertos);
                          handleAtualizarQuestoes(nextFeitas, nextAcertos, questoesChutesLocal);
                        }}
                        className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        title="Adicionar acerto confirmado"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Bloco 3: Acertos no Chute / Dúvida (Solicitado pelo usuário) */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#1a1712]/80 border border-amber-500/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-amber-300 font-semibold block truncate" title="Acertos na dúvida, no chute ou sem certeza">
                        No Chute
                      </span>
                      <span className="text-base sm:text-lg font-mono font-bold text-amber-400">
                        {questoesChutesLocal}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextC = Math.max(0, questoesChutesLocal - 1);
                          handleAtualizarQuestoes(questoesFeitasLocal, questoesAcertosLocal, nextC);
                        }}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                        title="Diminuir acerto no chute"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextChutes = questoesChutesLocal + 1;
                          const nextAcertos = Math.max(questoesAcertosLocal, nextChutes);
                          const nextFeitas = Math.max(questoesFeitasLocal, nextAcertos);
                          handleAtualizarQuestoes(nextFeitas, nextAcertos, nextChutes);
                        }}
                        className="flex-1 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        title="Adicionar questão acertada no chute ou na dúvida (+1 acerto no chute)"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

        </div>
      )}

      {/* Barra Inferior: Alternador Cronômetro vs Histórico e Inserção Manual */}
      <div className="pt-2 border-t border-[#1d2c4c] flex flex-col sm:flex-row items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: 'timer', label: 'Cronômetro' },
            { id: 'historico', label: `Histórico (${state.sessoes.length})` },
          ]}
          activeTab={tabAtiva}
          onChange={setTabAtiva}
        />

        <Button
          variant="secondary"
          size="sm"
          icon={PlusCircle}
          onClick={() => setIsManualModalOpen(true)}
          className="bg-[#121c33] hover:bg-[#1a294c] text-blue-300 border-[#22365c] text-xs font-bold shadow-sm w-full sm:w-auto justify-center cursor-pointer"
        >
          + Registrar Manual
        </Button>
      </div>

      {/* Modal Salvar Sessão */}
      <SalvarSessaoModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        sessaoAtiva={sessaoAtiva}
        initialTimes={{
          segundosEstudo: tempos.segundosEstudo,
          segundosPausa: tempos.segundosPausa,
          questoesFeitas: questoesFeitasLocal,
          questoesAcertos: questoesAcertosLocal,
          questoesChutes: questoesChutesLocal,
        }}
        onSave={handleSalvarSessao}
      />

      {/* Modal Aviso Fim de Bloco */}
      <BlocoConcluidoModal
        isOpen={isBlocoModalOpen}
        onClose={() => setIsBlocoModalOpen(false)}
        sessaoAtiva={sessaoAtiva}
        disciplina={discAtiva}
        topico={topicoAtivo}
        blocoCiclo={blocoCicloAtual}
        onFinalizar={() => {
          setIsBlocoModalOpen(false);
          handleAbrirSalvar();
        }}
        onPausar={handlePausarDoBloco}
        onContinuarLivre={handleContinuarLivreDoBloco}
      />

      {/* Modal Descartar Sessão */}
      <ConfirmModal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={handleConfirmarDescarte}
        title="Descartar Sessão em Andamento"
        message="Tem certeza que deseja descartar este estudo? O tempo líquido acumulado e as anotações desta sessão serão apagados permanentemente."
        confirmText="Sim, descartar"
        cancelText="Voltar ao estudo"
        variant="danger"
      />

      {/* Modal Inserção Manual de Estudos */}
      <InserirSessaoManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
}
