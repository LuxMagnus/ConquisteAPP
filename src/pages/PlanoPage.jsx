import React, { useState, useMemo } from 'react';
import {
  Compass,
  Calendar,
  Layers,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sliders,
  Award,
  Play,
  RefreshCw,
  PauseCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { ProgressBar } from '../components/common/ProgressBar.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Button } from '../components/common/Button.jsx';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';
import { formatarMinutosHoras } from '../lib/dateUtils.js';
import {
  calcularProgressoCiclo,
  sugerirProximaMateria,
  calcularProgressoSemanalDetalhado,
  TAMANHO_VOLTA_PADRAO_MINUTOS,
} from '../lib/cicloUtils.js';

import { CicloRoscaChart } from '../components/plano/CicloRoscaChart.jsx';
import { ProximaMateriaCard } from '../components/plano/ProximaMateriaCard.jsx';
import { BlocosCicloLista } from '../components/plano/BlocosCicloLista.jsx';
import { ConfigurarCicloModal } from '../components/plano/ConfigurarCicloModal.jsx';
import { AgendaSemanalView } from '../components/plano/AgendaSemanalView.jsx';

export function PlanoPage({ onSwitchToTimer }) {
  const {
    state,
    dispatch,
    provaAtiva,
    disciplinasDaProva,
    disciplinasAtivasDaProva,
    disciplinasInativasDaProva,
  } = useStudyStore();
  const [viewMode, setViewMode] = useState('ciclo'); // 'ciclo' ou 'agenda'
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Identifica o ciclo correspondente à prova ativa
  const cicloAtivo = useMemo(() => {
    if (!provaAtiva) return state.ciclos[0] || null;
    return state.ciclos.find((c) => c.provaId === provaAtiva.id) || state.ciclos[0] || null;
  }, [state.ciclos, provaAtiva]);

  const temDisciplinas = disciplinasDaProva.length > 0;
  const temDisciplinasAtivas = disciplinasAtivasDaProva.length > 0;

  // Cálculos do ciclo ativo
  const progressoCiclo = useMemo(() => {
    return calcularProgressoCiclo(cicloAtivo);
  }, [cicloAtivo]);

  // Próxima matéria recomendada pelo ciclo
  const sugestaoMateria = useMemo(() => {
    return sugerirProximaMateria(cicloAtivo, disciplinasDaProva, state.topicos);
  }, [cicloAtivo, disciplinasDaProva, state.topicos]);

  // Progresso consolidado da semana corrente (SEG–DOM)
  const progressoSemana = useMemo(() => {
    return calcularProgressoSemanalDetalhado({
      sessoes: state.sessoes,
      metasDiarias: provaAtiva?.metasDiarias || {},
      disciplinas: state.disciplinas,
    });
  }, [state.sessoes, provaAtiva?.metasDiarias, state.disciplinas]);

  // Handler para regenerar o ciclo com a distribuição proporcional das matérias ativas
  const handleRegenerarCiclo = () => {
    if (!provaAtiva) return;
    dispatch({
      type: ACTION_TYPES.REGENERATE_CICLO,
      payload: {
        provaId: provaAtiva.id,
        tamanhoVoltaMinutos: cicloAtivo?.tamanhoVoltaMinutos || TAMANHO_VOLTA_PADRAO_MINUTOS,
        resetarProgresso: false,
      },
    });
  };

  const handleSalvarConfigCiclo = ({
    tamanhoVoltaMinutos,
    duracaoSessaoMinutos,
    modoFracionado,
    porcentagensManuais,
    resetarProgresso,
    ativasMap,
  }) => {
    if (!provaAtiva) return;
    if (ativasMap) {
      dispatch({
        type: ACTION_TYPES.SET_DISCIPLINAS_ATIVAS,
        payload: {
          provaId: provaAtiva.id,
          ativasMap,
          tamanhoVoltaMinutos,
          duracaoSessaoMinutos,
          modoFracionado,
          porcentagensManuais,
          resetarProgresso,
        },
      });
    } else {
      dispatch({
        type: ACTION_TYPES.REGENERATE_CICLO,
        payload: {
          provaId: provaAtiva.id,
          tamanhoVoltaMinutos,
          duracaoSessaoMinutos,
          modoFracionado,
          porcentagensManuais,
          resetarProgresso,
        },
      });
    }
  };


  const handleEstudarConfig = (config) => {
    if (onSwitchToTimer) {
      onSwitchToTimer(config);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Tela com Seletor Ciclo / Agenda e Ações do Ciclo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#1d2c4c]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Plano de Estudos
            </span>
            {cicloAtivo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Volta {cicloAtivo.voltaAtual || 1}
              </span>
            )}
            {temDisciplinas && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#15233e] text-slate-300 border border-[#23355c]">
                {disciplinasAtivasDaProva.length} de {disciplinasDaProva.length} no ciclo
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            {provaAtiva ? provaAtiva.nome : 'Nenhum Concurso Selecionado'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Meta semanal: <strong className="text-slate-200">{formatarMinutosHoras(progressoSemana.totalMetaMinutos)}</strong> • Estudado nesta semana: <strong className="text-emerald-400">{formatarMinutosHoras(progressoSemana.totalEstudadoMinutos)}</strong>
          </p>
        </div>

        {/* Botões de Ação e Alternador de Visão */}
        <div className="flex flex-wrap items-center gap-2.5">
          {temDisciplinas && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Sliders}
                onClick={() => setIsConfigModalOpen(true)}
                className="text-xs font-semibold"
                title="Configurar tamanho da volta do ciclo"
              >
                Ajustar Ciclo
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={RotateCw}
                onClick={handleRegenerarCiclo}
                className="text-xs font-semibold hover:border-blue-500/40"
                title="Recalcula a distribuição de acordo com os pesos atuais"
              >
                Regenerar
              </Button>
            </div>
          )}

          {/* Alternador Ciclo vs Agenda */}
          <Tabs
            tabs={[
              { id: 'ciclo', label: 'Ciclo de Estudos', icon: RotateCw },
              { id: 'agenda', label: 'Agenda Semanal', icon: Calendar },
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {!temDisciplinas ? (
        <EmptyState
          icon={Compass}
          title="Seu plano de estudos ainda está vazio"
          description="Cadastre disciplinas para gerar seu ciclo de estudos balanceado por peso e dificuldade, ou carregue dados de demonstração."
          actionLabel="Carregar Dados de Exemplo"
          actionIcon={Sparkles}
          onAction={() => dispatch({ type: ACTION_TYPES.LOAD_SAMPLE_DATA })}
        />
      ) : !temDisciplinasAtivas ? (
        <EmptyState
          icon={PauseCircle}
          title="Todas as matérias desta prova estão pausadas"
          description="Você desativou todas as disciplinas do ciclo de estudos. Elas continuam salvas no seu edital e histórico. Ative ao menos uma matéria para gerar seu ciclo de estudos."
          actionLabel="Ajustar Ciclo e Ativar Matérias"
          actionIcon={Sliders}
          onAction={() => setIsConfigModalOpen(true)}
        />
      ) : viewMode === 'agenda' ? (
        /* VISÃO 2: Agenda Semanal (visão alternativa) */
        <AgendaSemanalView
          progressoSemana={progressoSemana}
          ciclo={cicloAtivo}
          disciplinas={disciplinasDaProva}
          onEstudarAgora={() => {
            if (sugestaoMateria) {
              handleEstudarConfig({
                disciplinaId: sugestaoMateria.disciplina.id,
                topicoId: sugestaoMateria.topicoSugerido?.id || null,
                duracaoBloco: sugestaoMateria.faltamMinutos || 25,
              });
            } else {
              onSwitchToTimer();
            }
          }}
        />
      ) : (
        /* VISÃO 1: Ciclo de Estudos (Rosca, Sugestão, Blocos e Metas) */
        <div className="space-y-6">
          {/* Aviso se houver matérias pausadas fora do ciclo */}
          {disciplinasInativasDaProva.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#101828] to-[#121c33] border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Info className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-amber-300 block">
                    {disciplinasInativasDaProva.length} matéria(s) pausada(s) fora do ciclo
                  </span>
                  <span className="text-slate-400 block text-[11px] truncate">
                    {disciplinasInativasDaProva.map((d) => d.nome).join(', ')} • Todo o histórico de sessões e edital verticalizado continuam preservados.
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="xs"
                icon={Sliders}
                onClick={() => setIsConfigModalOpen(true)}
                className="text-xs shrink-0 hover:border-amber-500/40"
              >
                Gerenciar Ciclo
              </Button>
            </div>
          )}

          {/* Barra de Comparação Rápida: Horas da semana vs Meta */}
          <Card className="p-4 sm:p-5 bg-gradient-to-r from-[#111c33] via-[#0f172a] to-[#0e1628] border-[#1d2c4c]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Ritmo Semanal: Horas Estudadas vs Meta
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Segunda a Domingo da semana corrente ({progressoSemana.diasProgresso[0]?.diaMesFmt} a {progressoSemana.diasProgresso[6]?.diaMesFmt})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  {progressoSemana.percentualSemana}% cumprido
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {formatarMinutosHoras(progressoSemana.totalEstudadoMinutos)} de {formatarMinutosHoras(progressoSemana.totalMetaMinutos)}
                </span>
              </div>
            </div>

            <ProgressBar
              value={progressoSemana.totalEstudadoMinutos}
              max={progressoSemana.totalMetaMinutos || 100}
              showPercentage={false}
              color="emerald"
            />
          </Card>

          {/* Grid Principal do Ciclo de Estudos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 & 2: Gráfico de Rosca Recharts e Lista de Blocos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card do Gráfico de Rosca */}
              <Card className="bg-gradient-to-br from-[#121c33] to-[#0f172a] border-[#1f2f54] shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <span>Ciclo de Estudos — Volta {cicloAtivo?.voltaAtual || 1}</span>
                    </CardTitle>
                    <CardDescription>
                      Fatias proporcionais a peso × dificuldade × (1 − domínio/100)
                    </CardDescription>
                  </div>

                  <span className="shrink-0 whitespace-nowrap self-start text-xs font-mono font-bold px-3 py-1 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30">
                    {progressoCiclo.percentual}% da volta
                  </span>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Gráfico Donut / Rosca Recharts */}
                  <CicloRoscaChart
                    ciclo={cicloAtivo}
                    disciplinas={disciplinasDaProva}
                    progressoCiclo={progressoCiclo}
                  />

                  {/* Barra de Progresso Geral da Volta */}
                  <div className="pt-2">
                    <ProgressBar
                      value={progressoCiclo.minutosFeitosTotal}
                      max={progressoCiclo.minutosMetaTotal || 100}
                      label="Tempo Total da Volta Atual"
                      sublabel={`${formatarMinutosHoras(progressoCiclo.minutosFeitosTotal)} de ${formatarMinutosHoras(progressoCiclo.minutosMetaTotal)}`}
                      showPercentage
                      color="gradient"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Lista Detalhada de Blocos na Volta */}
              <Card className="bg-[#0e1628] border-[#1d2c4c] p-4 sm:p-5">
                <BlocosCicloLista
                  ciclo={cicloAtivo}
                  disciplinas={disciplinasDaProva}
                  onEstudarBloco={handleEstudarConfig}
                />
              </Card>
            </div>

            {/* Coluna 3: Próxima Matéria Recomendada e Resumos */}
            <div className="space-y-6">
              {/* Card Destaque: Próxima Matéria Sugerida */}
              <ProximaMateriaCard
                sugestao={sugestaoMateria}
                onEstudarAgora={handleEstudarConfig}
              />

              {/* Resumo da Volta Atual */}
              <Card className="bg-[#121c33]/70 border-[#1e2f52]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Resumo da Volta</span>
                    <Award className="w-4 h-4 text-blue-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-1 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1d2c4c]/60">
                    <span className="text-slate-400">Volta Atual:</span>
                    <span className="font-mono font-bold text-white">
                      Volta {cicloAtivo?.voltaAtual || 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1d2c4c]/60">
                    <span className="text-slate-400">Tamanho da Volta:</span>
                    <span className="font-mono font-bold text-white">
                      {formatarMinutosHoras(progressoCiclo.minutosMetaTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1d2c4c]/60">
                    <span className="text-slate-400">Blocos Concluídos:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {progressoCiclo.blocosConcluidos} de {progressoCiclo.totalBlocos}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400">Restante na Volta:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatarMinutosHoras(Math.max(0, progressoCiclo.minutosMetaTotal - progressoCiclo.minutosFeitosTotal))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Metas Diárias SEG-DOM da Prova */}
              <Card className="bg-[#121c33]/70 border-[#1e2f52]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Metas Diárias</span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Planejamento semanal fixado no concurso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-1 text-xs">
                  {progressoSemana.diasProgresso.map((dia) => (
                    <div
                      key={dia.key}
                      className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                        dia.isHoje ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-[#16233f]/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{dia.label}</span>
                        {dia.isHoje && (
                          <span className="text-[9px] font-bold text-blue-400 uppercase">
                            (Hoje)
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-slate-200">
                        {formatarMinutosHoras(dia.metaMinutos)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração e Regeneração do Ciclo */}
      <ConfigurarCicloModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        cicloAtual={cicloAtivo}
        disciplinas={disciplinasDaProva}
        onSalvarCiclo={handleSalvarConfigCiclo}
      />
    </div>
  );
}
