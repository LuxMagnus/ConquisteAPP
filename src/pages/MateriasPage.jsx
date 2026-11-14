import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Layers,
  Award,
  Sliders,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  FolderOpen,
  PauseCircle,
  PlayCircle,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { ProgressBar } from '../components/common/ProgressBar.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { ConfirmModal } from '../components/common/Modal.jsx';

import { MetasSemanaisCard } from '../components/materias/MetasSemanaisCard.jsx';
import { ProvaModal } from '../components/materias/ProvaModal.jsx';
import { DisciplinaModal } from '../components/materias/DisciplinaModal.jsx';
import { EditalVerticalizado } from '../components/materias/EditalVerticalizado.jsx';
import { RankingPrioridade } from '../components/materias/RankingPrioridade.jsx';
import { ImportarEditalModal } from '../components/materias/ImportarEditalModal.jsx';

import { calcularPrioridade, calcularProgressoEdital, calcularProgressoEditalGeral } from '../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';

export function MateriasPage() {
  const {
    state,
    dispatch,
    disciplinasDaProva,
    disciplinasAtivasDaProva,
    disciplinasInativasDaProva,
    provaAtiva,
  } = useStudyStore();

  // Abas e Navegação por Páginas (com transição e setas < >)
  const PAGINAS_MATERIAS = useMemo(() => [
    { id: 'edital', label: 'Edital Verticalizado', icon: Layers, desc: 'Acompanhamento de tópicos e teoria' },
    { id: 'ranking', label: 'Ranking de Prioridade', icon: Award, desc: 'Peso × Dificuldade × Falta de Domínio' },
    { id: 'disciplinas', label: 'Todas as Disciplinas', icon: BookOpen, desc: 'Gestão geral, pesos e status no ciclo' },
  ], []);

  const [tabAtiva, setTabAtiva] = useState('edital'); // 'edital' | 'ranking' | 'disciplinas'
  const [direcaoTransicao, setDirecaoTransicao] = useState('proximo'); // 'proximo' | 'anterior'

  const paginaAtualIndex = PAGINAS_MATERIAS.findIndex((p) => p.id === tabAtiva);
  const paginaAtual = PAGINAS_MATERIAS[paginaAtualIndex] || PAGINAS_MATERIAS[0];

  function irParaProximaPagina() {
    setDirecaoTransicao('proximo');
    const proximoIdx = (paginaAtualIndex + 1) % PAGINAS_MATERIAS.length;
    setTabAtiva(PAGINAS_MATERIAS[proximoIdx].id);
  }

  function irParaPaginaAnterior() {
    setDirecaoTransicao('anterior');
    const anteriorIdx = (paginaAtualIndex - 1 + PAGINAS_MATERIAS.length) % PAGINAS_MATERIAS.length;
    setTabAtiva(PAGINAS_MATERIAS[anteriorIdx].id);
  }

  function handleMudarPagina(novoId) {
    const novoIdx = PAGINAS_MATERIAS.findIndex((p) => p.id === novoId);
    setDirecaoTransicao(novoIdx >= paginaAtualIndex ? 'proximo' : 'anterior');
    setTabAtiva(novoId);
  }

  // Sub-filtro de status no ciclo para a aba "Todas as Disciplinas"
  const [filtroCicloStatus, setFiltroCicloStatus] = useState('todas'); // 'todas' | 'ativas' | 'inativas'

  // Disciplina selecionada para exibição em profundidade no Edital Verticalizado
  const [disciplinaFocoId, setDisciplinaFocoId] = useState(disciplinasDaProva[0]?.id || null);

  // Modais
  const [modalProvaOpen, setModalProvaOpen] = useState(false);
  const [provaParaEditar, setProvaParaEditar] = useState(null);

  const [modalDisciplinaOpen, setModalDisciplinaOpen] = useState(false);
  const [disciplinaParaEditar, setDisciplinaParaEditar] = useState(null);

  const [disciplinaParaExcluir, setDisciplinaParaExcluir] = useState(null);
  const [modalImportarOpen, setModalImportarOpen] = useState(false);

  // Disciplina atual selecionada no Edital Verticalizado
  const disciplinaFoco = useMemo(() => {
    return (
      disciplinasDaProva.find((d) => d.id === disciplinaFocoId) ||
      disciplinasDaProva[0] ||
      null
    );
  }, [disciplinasDaProva, disciplinaFocoId]);

  // Progresso geral do edital
  const progressoGeral = useMemo(() => {
    return calcularProgressoEditalGeral(disciplinasDaProva, state.topicos);
  }, [disciplinasDaProva, state.topicos]);

  function handleOpenNovaProva() {
    setProvaParaEditar(null);
    setModalProvaOpen(true);
  }

  function handleOpenEditarProva(prova) {
    setProvaParaEditar(prova);
    setModalProvaOpen(true);
  }

  function handleOpenNovaDisciplina() {
    setDisciplinaParaEditar(null);
    setModalDisciplinaOpen(true);
  }

  function handleOpenEditarDisciplina(disc) {
    setDisciplinaParaEditar(disc);
    setModalDisciplinaOpen(true);
  }

  function handleToggleAtiva(disc) {
    dispatch({
      type: ACTION_TYPES.TOGGLE_DISCIPLINA_ATIVA,
      payload: { disciplinaId: disc.id },
    });
  }

  function handleConfirmExcluirDisciplina() {
    if (disciplinaParaExcluir) {
      dispatch({
        type: ACTION_TYPES.DELETE_DISCIPLINA,
        payload: disciplinaParaExcluir.id,
      });
      setDisciplinaParaExcluir(null);
    }
  }

  const temDisciplinas = disciplinasDaProva.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1d2c4c]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Planejamento & Edital
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Provas, Matérias & Edital
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie o edital verticalizado, pesos, dificuldades e acompanhe a conclusão da teoria.
          </p>
        </div>

        {/* Ações Globais */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => setModalImportarOpen(true)}
            disabled={!provaAtiva}
            className="flex-1 sm:flex-none justify-center text-xs text-blue-300 border-blue-500/40 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 font-semibold"
            title="Importar e estruturar conteúdo programático usando a IA do Gemini"
          >
            Importar com IA
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenNovaDisciplina}
            disabled={!provaAtiva}
            className="flex-1 sm:flex-none justify-center text-xs font-bold"
          >
            Nova Disciplina
          </Button>
        </div>
      </div>

      {/* Card da Prova Ativa com Contagem Regressiva em Dias e Metas Semanais */}
      <MetasSemanaisCard
        onEditarProva={handleOpenEditarProva}
        onNovaProva={handleOpenNovaNova => handleOpenNovaProva()}
      />

      {/* Navegador de Páginas com Setas (< >) e Efeito de Transição (Sem rolagem horizontal) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Navegador com Setas < > e Título Central com Indicador de Página */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Seta Esquerda */}
            <button
              type="button"
              onClick={irParaPaginaAnterior}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#121c33] hover:bg-[#1a2b50] text-slate-300 hover:text-white border border-[#1e2f52] hover:border-blue-500/50 transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 active:scale-95"
              title="Página anterior (←)"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-5 h-5 text-blue-400" />
            </button>

            {/* Pill Central da Página Ativa */}
            <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0d1629] p-1.5 rounded-2xl border border-[#1e2f52] shadow-inner w-60">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30 w-full justify-center">
                <paginaAtual.icon className="w-4 h-4 shrink-0" />
                <span className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">
                  {paginaAtual.label}
                </span>
              </div>
            </div>

            {/* Seta Direita */}
            <button
              type="button"
              onClick={irParaProximaPagina}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#121c33] hover:bg-[#1a2b50] text-slate-300 hover:text-white border border-[#1e2f52] hover:border-blue-500/50 transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 active:scale-95"
              title="Próxima página (→)"
              aria-label="Próxima página"
            >
              <ChevronRight className="w-5 h-5 text-blue-400" />
            </button>
          </div>

          {/* Seletor de Disciplinas em Pílulas para Tablet e Desktop (Sem Rolagem Horizontal no Computador) */}
          {tabAtiva === 'edital' && temDisciplinas && (
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold shrink-0">
                Disciplina:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {disciplinasDaProva.map((d) => {
                  const isSelected = disciplinaFoco?.id === d.id;
                  const isPausada = d.ativa === false;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDisciplinaFocoId(d.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1e2f52] text-white border border-blue-400/40 shadow-sm'
                          : 'bg-[#121c33] text-slate-400 hover:text-slate-200 border border-[#1e2f52]'
                      } ${isPausada ? 'opacity-70' : ''}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.cor }}
                      />
                      <span>{d.nome}</span>
                      {isPausada && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Pausada
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Nativo Mobile para Alternar Disciplinas (Evita Rolagem Horizontal) */}
        {tabAtiva === 'edital' && temDisciplinas && (
          <div className="sm:hidden w-full">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Disciplina em exibição:
            </label>
            <select
              value={disciplinaFoco?.id || ''}
              onChange={(e) => setDisciplinaFocoId(e.target.value)}
              className="w-full bg-[#121c33] border border-[#1e2f52] text-white text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-blue-500"
            >
              {disciplinasDaProva.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} {d.ativa === false ? '(Pausada do ciclo)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conteúdo Conforme a Aba Selecionada */}
      {!temDisciplinas ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma disciplina cadastrada para esta prova"
          description="Importe o conteúdo programático do edital para o Gemini estruturar automaticamente as disciplinas, pesos e tópicos, ou cadastre manualmente."
          actionLabel="Importar Edital com IA"
          actionIcon={Sparkles}
          onAction={() => setModalImportarOpen(true)}
        >
          <div className="mt-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={handleOpenNovaDisciplina}
            >
              Cadastrar Manualmente
            </Button>
          </div>
        </EmptyState>
      ) : (
        <div
          key={tabAtiva}
          className={
            direcaoTransicao === 'proximo'
              ? 'animate-page-from-right'
              : 'animate-page-from-left'
          }
        >
          {/* 1. Edital Verticalizado */}
          {tabAtiva === 'edital' && (
            <div className="space-y-4">
              {disciplinaFoco?.ativa === false && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <PauseCircle className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="font-bold text-amber-300 block">
                        Matéria pausada do ciclo de estudos
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        Você pode continuar marcando tópicos e estudando, mas ela não receberá horas no ciclo atual.
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="xs"
                    icon={PlayCircle}
                    onClick={() => handleToggleAtiva(disciplinaFoco)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs shrink-0 font-bold"
                  >
                    Ativar no Ciclo
                  </Button>
                </div>
              )}
              <EditalVerticalizado
                disciplina={disciplinaFoco}
                onVoltar={null}
              />
            </div>
          )}

          {/* 2. Ranking de Prioridade Ordenável (peso × dificuldade × (1 − dominio/100)) */}
          {tabAtiva === 'ranking' && (
            <RankingPrioridade
              onSelectDisciplina={(disc) => {
                setDisciplinaFocoId(disc.id);
                handleMudarPagina('edital');
              }}
            />
          )}

          {/* 3. CRUD e Visão Geral de Todas as Disciplinas */}
          {tabAtiva === 'disciplinas' && (
            <div className="space-y-4">
              {/* Barra de Filtros de Status no Ciclo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0e1628] border border-[#1e2f52]">
                <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFiltroCicloStatus('todas')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filtroCicloStatus === 'todas'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#15233e] text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({disciplinasDaProva.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroCicloStatus('ativas')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filtroCicloStatus === 'ativas'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-[#15233e] text-slate-400 hover:text-white'
                    }`}
                  >
                    No Ciclo ({disciplinasAtivasDaProva.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroCicloStatus('inativas')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filtroCicloStatus === 'inativas'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-[#15233e] text-slate-400 hover:text-white'
                    }`}
                  >
                    Pausadas ({disciplinasInativasDaProva.length})
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 text-right sm:text-left">
                  {disciplinasAtivasDaProva.length} de {disciplinasDaProva.length} ativas no ciclo
                </span>
              </div>

              {/* Grid das Disciplinas */}
              {disciplinasDaProva
                .filter((d) => {
                  if (filtroCicloStatus === 'ativas') return d.ativa !== false;
                  if (filtroCicloStatus === 'inativas') return d.ativa === false;
                  return true;
                })
                .length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#121c33]/50 border border-dashed border-[#1d2c4c] text-slate-400 text-xs">
                  Nenhuma disciplina encontrada com o filtro selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {disciplinasDaProva
                    .filter((d) => {
                      if (filtroCicloStatus === 'ativas') return d.ativa !== false;
                      if (filtroCicloStatus === 'inativas') return d.ativa === false;
                      return true;
                    })
                    .map((disc) => {
                      const topicosDaDisc = state.topicos.filter((t) => t.disciplinaId === disc.id);
                      const progressoDisc = calcularProgressoEdital(topicosDaDisc);
                      const prioridade = calcularPrioridade(disc.peso, disc.dificuldade, disc.dominio);
                      const isAtiva = disc.ativa !== false;

                      return (
                        <Card
                          key={disc.id}
                          className={`border-[#1e2f52] hover:border-slate-500 transition-all flex flex-col justify-between ${
                            !isAtiva ? 'bg-[#101728]/90 border-dashed border-slate-700/60' : ''
                          }`}
                        >
                          <div>
                            {/* Top Header do Card */}
                            <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span
                                  className="w-4 h-4 rounded-full mt-1 shrink-0 shadow-md"
                                  style={{ backgroundColor: disc.cor }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-white tracking-tight truncate">
                                      {disc.nome}
                                    </h3>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                        isAtiva
                                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                      }`}
                                    >
                                      {isAtiva ? '✓ No Ciclo' : '⏸ Pausada'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                                    <span className="px-2 py-0.5 rounded bg-[#172440] text-slate-300 font-semibold font-mono">
                                      Peso {disc.peso}/10
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-[#172440] text-slate-300 font-semibold font-mono">
                                      Dif {disc.dificuldade}/5
                                    </span>
                                    <span className="text-slate-500">•</span>
                                    <span>{topicosDaDisc.length} tópicos</span>
                                  </div>
                                </div>
                              </div>

                              {/* Prioridade e Domínio */}
                              <div className="text-right shrink-0">
                                <span className="text-sm font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 block">
                                  {prioridade.toFixed(1)} pts
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                  Prioridade
                                </span>
                              </div>
                            </div>

                            {/* Domínio com Slider Rápido */}
                            <div className="px-4 sm:px-5 pb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400 font-medium">Domínio Atual:</span>
                                <span className="text-emerald-400 font-mono font-bold">{disc.dominio}%</span>
                              </div>
                              <ProgressBar
                                value={disc.dominio}
                                max={100}
                                customColor={disc.cor}
                                height="h-2"
                              />
                            </div>

                            {/* Progresso do Edital Verticalizado (Baseado em Teoria) */}
                            <div className="px-4 sm:px-5 pb-3 pt-1 border-t border-[#1d2c4c]/60">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400 font-medium">Edital (Teoria):</span>
                                <span className="text-slate-300 font-mono font-semibold">
                                  {progressoDisc.percentual}% ({progressoDisc.teoriaConcluidas}/{progressoDisc.totalTopicos} tópicos)
                                </span>
                              </div>
                              <ProgressBar
                                value={progressoDisc.teoriaConcluidas}
                                max={progressoDisc.totalTopicos || 1}
                                color="blue"
                                height="h-1.5"
                              />
                            </div>
                          </div>

                          {/* Footer com Ações */}
                          <div className="p-3 sm:p-4 bg-[#0d1629] border-t border-[#1d2c4c] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1.5 w-full sm:w-auto">
                              <Button
                                variant="ghost"
                                size="xs"
                                icon={FolderOpen}
                                onClick={() => {
                                  setDisciplinaFocoId(disc.id);
                                  handleMudarPagina('edital');
                                }}
                                className="w-full sm:w-auto justify-center text-xs"
                              >
                                Abrir Edital ({topicosDaDisc.length})
                              </Button>

                              {/* Botão de 1 clique para ativar/pausar do ciclo */}
                              <Button
                                variant={isAtiva ? 'secondary' : 'primary'}
                                size="xs"
                                icon={isAtiva ? PauseCircle : PlayCircle}
                                onClick={() => handleToggleAtiva(disc)}
                                className={`w-full sm:w-auto justify-center ${
                                  isAtiva
                                    ? 'text-xs text-slate-300 hover:text-amber-300 hover:border-amber-500/40'
                                    : 'text-xs bg-emerald-600 hover:bg-emerald-500 font-bold'
                                }`}
                                title={
                                  isAtiva
                                    ? 'Pausar matéria: sai da distribuição de horas do ciclo sem perder histórico'
                                    : 'Ativar matéria: entra na distribuição de horas do ciclo'
                                }
                              >
                                {isAtiva ? 'Pausar do Ciclo' : 'Ativar no Ciclo'}
                              </Button>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t border-[#172440] sm:border-0">
                              <Button
                                variant="outline"
                                size="xs"
                                icon={Edit2}
                                onClick={() => handleOpenEditarDisciplina(disc)}
                                className="flex-1 sm:flex-none justify-center"
                              >
                                Editar
                              </Button>
                              <Button
                                variant="danger"
                                size="xs"
                                icon={Trash2}
                                onClick={() => setDisciplinaParaExcluir(disc)}
                                className="flex-1 sm:flex-none justify-center"
                              >
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Gestão de Prova (Criar/Editar com Metas e Contagem Regressiva) */}
      <ProvaModal
        isOpen={modalProvaOpen}
        onClose={() => setModalProvaOpen(false)}
        provaParaEditar={provaParaEditar}
      />

      {/* Modal de Disciplina (Criar/Editar com Peso, Dificuldade, Domínio em Slider e Cor) */}
      <DisciplinaModal
        isOpen={modalDisciplinaOpen}
        onClose={() => setModalDisciplinaOpen(false)}
        disciplinaParaEditar={disciplinaParaEditar}
        provaId={provaAtiva?.id}
      />

      {/* Confirmação de Exclusão de Disciplina com Cascata */}
      <ConfirmModal
        isOpen={Boolean(disciplinaParaExcluir)}
        onClose={() => setDisciplinaParaExcluir(null)}
        onConfirm={handleConfirmExcluirDisciplina}
        title="Excluir Disciplina?"
        message={`Tem certeza que deseja excluir "${disciplinaParaExcluir?.nome}"? Todos os tópicos do edital, sessões de estudo realizadas e revisões agendadas vinculadas a ela serão excluídos permanentemente.`}
        confirmText="Sim, excluir disciplina"
        variant="danger"
      />

      {/* Modal de Importação de Edital com IA Gemini (Fase 6) */}
      <ImportarEditalModal
        isOpen={modalImportarOpen}
        onClose={() => setModalImportarOpen(false)}
      />
    </div>
  );
}
