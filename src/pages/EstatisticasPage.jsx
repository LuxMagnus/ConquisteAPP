import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Award,
  BookOpen,
  Flame,
  Filter,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';
import { formatarSegundos, formatarDataHora } from '../lib/dateUtils.js';
import {
  calcularDesempenhoQuestoes,
  calcularDistribuicaoTempoPorDisciplina,
  calcularDistribuicaoTempoPorTopico,
  calcularEvolucaoSemanalQuestoes,
  calcularEvolucaoQuestoesFlexivel,
} from '../lib/estatisticasUtils.js';

import { HorasEstudoChart } from '../components/estatisticas/HorasEstudoChart.jsx';
import { MapaCalorAnual } from '../components/estatisticas/MapaCalorAnual.jsx';
import { RankingAssuntos } from '../components/estatisticas/RankingAssuntos.jsx';
import { AcertosDisciplinasTopicos } from '../components/estatisticas/AcertosDisciplinasTopicos.jsx';
import { DistribuicaoTempoRosca } from '../components/estatisticas/DistribuicaoTempoRosca.jsx';
import { EvolucaoAcertosLinha } from '../components/estatisticas/EvolucaoAcertosLinha.jsx';
import { ExportarDadosModal } from '../components/estatisticas/ExportarDadosModal.jsx';

export function EstatisticasPage() {
  const { state, dispatch, provaAtiva } = useStudyStore();
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('tudo');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [mostrarTodasSessoes, setMostrarTodasSessoes] = useState(false);
  const [filtroChutes, setFiltroChutes] = useState('nenhum');

  const sessoes = state.sessoes || [];
  const temSessoes = sessoes.length > 0;

  // Filtragem temporal das sessões
  const sessoesNoPeriodo = useMemo(() => {
    if (!sessoes.length || filtroPeriodo === 'tudo') return sessoes;

    const agora = new Date();

    if (filtroPeriodo === 'hoje') {
      const hojeStr = agora.toISOString().split('T')[0];
      return sessoes.filter((s) => s.inicioISO && s.inicioISO.startsWith(hojeStr));
    }

    if (filtroPeriodo === '7d') {
      const limite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return sessoes.filter((s) => s.inicioISO && new Date(s.inicioISO) >= limite);
    }

    if (filtroPeriodo === '30d') {
      const limite = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
      return sessoes.filter((s) => s.inicioISO && new Date(s.inicioISO) >= limite);
    }

    if (filtroPeriodo === 'mes') {
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return sessoes.filter((s) => s.inicioISO && new Date(s.inicioISO) >= inicioMes);
    }

    if (filtroPeriodo === 'mes_anterior') {
      const ano = agora.getFullYear();
      const mes = agora.getMonth();
      const inicioMesAnt = new Date(ano, mes - 1, 1);
      const fimMesAnt = new Date(ano, mes, 0, 23, 59, 59, 999);
      return sessoes.filter((s) => {
        if (!s.inicioISO) return false;
        const d = new Date(s.inicioISO);
        return d >= inicioMesAnt && d <= fimMesAnt;
      });
    }

    if (filtroPeriodo === 'ano') {
      const inicioAno = new Date(agora.getFullYear(), 0, 1);
      return sessoes.filter((s) => s.inicioISO && new Date(s.inicioISO) >= inicioAno);
    }

    if (filtroPeriodo === 'personalizado') {
      return sessoes.filter((s) => {
        if (!s.inicioISO) return false;
        const sData = s.inicioISO.split('T')[0];
        if (dataInicio && sData < dataInicio) return false;
        if (dataFim && sData > dataFim) return false;
        return true;
      });
    }

    return sessoes;
  }, [sessoes, filtroPeriodo, dataInicio, dataFim]);

  // Filtragem opcional de sessões por disciplina dentro do período
  const sessoesFiltradas = useMemo(() => {
    if (filtroDisciplinaId === 'todas') return sessoesNoPeriodo;
    return sessoesNoPeriodo.filter((s) => s.disciplinaId === filtroDisciplinaId);
  }, [sessoesNoPeriodo, filtroDisciplinaId]);

  // Disciplina ativa selecionada para rótulos
  const disciplinaSelecionada = useMemo(() => {
    return (state.disciplinas || []).find((d) => d.id === filtroDisciplinaId);
  }, [state.disciplinas, filtroDisciplinaId]);

  // Label amigável do filtro de tempo para o modal e header
  const filtroTempoLabel = useMemo(() => {
    switch (filtroPeriodo) {
      case 'hoje':
        return 'Hoje';
      case '7d':
        return 'Últimos 7 dias';
      case '30d':
        return 'Últimos 30 dias';
      case 'mes':
        return 'Este Mês';
      case 'mes_anterior':
        return 'Mês Anterior';
      case 'ano':
        return 'Este Ano';
      case 'personalizado':
        if (dataInicio && dataFim) return `${dataInicio} até ${dataFim}`;
        if (dataInicio) return `A partir de ${dataInicio}`;
        if (dataFim) return `Até ${dataFim}`;
        return 'Período Personalizado';
      default:
        return 'Todo o histórico';
    }
  }, [filtroPeriodo, dataInicio, dataFim]);

  // Cálculos consolidados usando estatisticasUtils
  const desempenho = useMemo(() => {
    return calcularDesempenhoQuestoes(
      sessoesFiltradas,
      state.disciplinas || [],
      state.topicos || [],
      { filtroChutes }
    );
  }, [sessoesFiltradas, state.disciplinas, state.topicos, filtroChutes]);

  // Distribuição de tempo: por disciplina ou por tópico da disciplina selecionada
  const distribuicaoTempo = useMemo(() => {
    if (filtroDisciplinaId !== 'todas') {
      const topicosDaDisc = (state.topicos || []).filter((t) => t.disciplinaId === filtroDisciplinaId);
      return calcularDistribuicaoTempoPorTopico(sessoesFiltradas, topicosDaDisc);
    }
    return calcularDistribuicaoTempoPorDisciplina(sessoesNoPeriodo, state.disciplinas || []);
  }, [sessoesNoPeriodo, sessoesFiltradas, state.disciplinas, state.topicos, filtroDisciplinaId]);

  // Evolução da taxa de acerto com granularidade adaptada (diária ou semanal)
  const relatorioEvolucao = useMemo(() => {
    return calcularEvolucaoQuestoesFlexivel(sessoesFiltradas, filtroPeriodo, { filtroChutes });
  }, [sessoesFiltradas, filtroPeriodo, filtroChutes]);

  const totalSegundos = sessoesFiltradas.reduce((acc, s) => acc + (s.segundosEstudo || 0), 0);
  const totalQuestoes = desempenho.geral.totalQuestoes;
  const totalAcertos = desempenho.geral.totalAcertos;
  const taxaAcerto = desempenho.geral.taxaAcerto;

  // Disciplinas e tópicos que realmente foram estudados no período filtrado
  const disciplinasEstudadasIds = useMemo(() => {
    return new Set(sessoesFiltradas.map((s) => s.disciplinaId).filter(Boolean));
  }, [sessoesFiltradas]);

  const topicosEstudadosIds = useMemo(() => {
    return new Set(sessoesFiltradas.map((s) => s.topicoId).filter(Boolean));
  }, [sessoesFiltradas]);

  const temFiltroAtivo = filtroPeriodo !== 'tudo' || filtroDisciplinaId !== 'todas';

  // Meta de acertos do concurso (editável diretamente pelo usuário)
  const metaAcertosConcurso = provaAtiva?.metaAcertosPercentual ?? state.config?.metaAcertosPercentual ?? 80;

  const handleSalvarMetaAcertos = (novoValor) => {
    const valor = Math.min(100, Math.max(1, Number(novoValor) || 80));
    if (provaAtiva) {
      dispatch({
        type: ACTION_TYPES.UPDATE_PROVA,
        payload: { id: provaAtiva.id, metaAcertosPercentual: valor },
      });
    }
    dispatch({
      type: ACTION_TYPES.UPDATE_CONFIG,
      payload: { metaAcertosPercentual: valor },
    });
  };

  const limparFiltros = () => {
    setFiltroPeriodo('tudo');
    setFiltroDisciplinaId('todas');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      {/* Header da Página de Estatísticas */}
      <div className="flex flex-col gap-4 pb-4 border-b border-[#1d2c4c]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Desempenho & Analytics
              </span>
              {provaAtiva && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#172440] text-slate-300 border border-[#1d2c4c] hidden md:inline">
                  {provaAtiva.nome}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              Painel de Desempenho e Métricas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Horas estudadas, mapa de calor anual, aproveitamento em exercícios e filtros avançados.
            </p>
          </div>

          {/* Botão de Exportar Dados */}
          {temSessoes && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => setIsExportModalOpen(true)}
                className="bg-[#121c33] border-[#1d2c4c] hover:bg-[#1a284a] text-slate-200 hover:text-white font-semibold text-xs py-2 px-3.5 shadow-sm"
              >
                Exportar Dados
              </Button>
            </div>
          )}
        </div>

        {/* Barra de Filtros de Tempo e Matéria */}
        {temSessoes && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {/* Seletor de Período Temporal */}
            <div className="flex items-center gap-1.5 bg-[#121c33] px-2.5 py-1.5 rounded-xl border border-[#1d2c4c] w-full sm:w-auto">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full sm:w-auto bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Filtrar por período temporal"
              >
                <option value="tudo" className="bg-[#0b1120] text-white">Todo o Histórico</option>
                <option value="hoje" className="bg-[#0b1120] text-white">Hoje</option>
                <option value="7d" className="bg-[#0b1120] text-white">Últimos 7 dias</option>
                <option value="30d" className="bg-[#0b1120] text-white">Últimos 30 dias</option>
                <option value="mes" className="bg-[#0b1120] text-white">Este Mês</option>
                <option value="mes_anterior" className="bg-[#0b1120] text-white">Mês Anterior</option>
                <option value="ano" className="bg-[#0b1120] text-white">Este Ano</option>
                <option value="personalizado" className="bg-[#0b1120] text-white">Personalizado...</option>
              </select>
            </div>

            {/* Inputs de Data para Período Personalizado */}
            {filtroPeriodo === 'personalizado' && (
              <div className="flex items-center gap-2 bg-[#121c33] px-2.5 py-1.5 rounded-xl border border-blue-500/40 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-[#0b1120] border border-[#1d2c4c] rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-[#0b1120] border border-[#1d2c4c] rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Filtro por Disciplina */}
            <div className="flex items-center gap-1.5 bg-[#121c33] px-2.5 py-1.5 rounded-xl border border-[#1d2c4c] w-full sm:w-auto sm:max-w-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filtroDisciplinaId}
                onChange={(e) => setFiltroDisciplinaId(e.target.value)}
                className="w-full truncate bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Filtrar por matéria"
              >
                <option value="todas" className="bg-[#0b1120] text-white">
                  Todas as Matérias ({sessoesNoPeriodo.length} sessões)
                </option>
                {state.disciplinas.map((disc) => (
                  <option key={disc.id} value={disc.id} className="bg-[#0b1120] text-white">
                    {disc.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Limpar Filtros quando algum filtro estiver ativo */}
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-[#14213d] hover:bg-[#1a2b50] border border-[#1d2c4c] transition-colors"
                title="Redefinir filtros para o padrão"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </button>
            )}

            {/* Contador de escopo */}
            <div className="text-[11px] text-slate-400 ml-auto hidden sm:block">
              Exibindo <span className="font-mono text-blue-400 font-bold">{sessoesFiltradas.length}</span> de{' '}
              <span className="font-mono text-slate-300">{sessoes.length}</span> sessões
            </div>
            
            {/* Filtro Acertos no Chute */}
            <div className="flex items-center gap-1.5 bg-[#121c33] px-3 py-1.5 rounded-xl border border-[#1d2c4c] w-full sm:w-auto">
              <select
                value={filtroChutes}
                onChange={(e) => setFiltroChutes(e.target.value)}
                className="w-full sm:w-auto bg-transparent text-[11px] font-semibold text-slate-300 focus:outline-none cursor-pointer pr-1"
                aria-label="Filtrar acertos no chute"
              >
                <option value="nenhum">Considerar todos acertos</option>
                <option value="excluir">Excluir acertos no chute</option>
                <option value="considerarErro">Considerar chute como erro</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Exportação */}
      <ExportarDadosModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessoes={sessoesFiltradas}
        disciplinas={state.disciplinas}
        topicos={state.topicos}
        provaAtiva={provaAtiva}
        filtroTempoLabel={
          filtroDisciplinaId !== 'todas'
            ? `${filtroTempoLabel} • ${state.disciplinas.find((d) => d.id === filtroDisciplinaId)?.nome || 'Matéria'}`
            : filtroTempoLabel
        }
      />

      {!temSessoes ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma sessão de estudo registrada"
          description="Complete sessões no cronômetro ou carregue dados de exemplo para visualizar os gráficos de horas líquidas, mapa de calor anual, distribuição por matérias e ranking de tópicos."
          actionLabel="Carregar Dados de Exemplo"
          actionIcon={Sparkles}
          onAction={() => dispatch({ type: ACTION_TYPES.LOAD_SAMPLE_DATA })}
        />
      ) : (
        <div className="space-y-7">
          {/* 1. Cards de Métricas Principais Consolidadas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 bg-[#121c33] border-[#1d2c4c]">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Horas Líquidas</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {formatarSegundos(totalSegundos)}
              </p>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> {sessoesFiltradas.length} sessões{' '}
                {temFiltroAtivo ? 'no período' : 'contabilizadas'}
              </span>
            </Card>

            <Card className="p-4 bg-[#121c33] border-[#1d2c4c]">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Aproveitamento</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                {taxaAcerto}%
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {totalAcertos} acertos em {totalQuestoes} questões
              </span>
            </Card>

            <Card className="p-4 bg-[#121c33] border-[#1d2c4c]">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Exercícios Feitos</span>
                <CheckCircle2 className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {totalQuestoes}
              </p>
              <span className="text-[10px] text-orange-400 font-semibold mt-1 block">
                {totalQuestoes - totalAcertos} erros analisados
              </span>
            </Card>

            <Card className="p-4 bg-[#121c33] border-[#1d2c4c]">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">
                  {temFiltroAtivo ? 'Disciplinas Estudadas' : 'Disciplinas Ativas'}
                </span>
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {temFiltroAtivo ? disciplinasEstudadasIds.size : state.disciplinas.length}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {temFiltroAtivo
                  ? `${topicosEstudadosIds.size} tópicos praticados no período`
                  : `${state.topicos.length} tópicos catalogados`}
              </span>
            </Card>
          </div>

          {/* 2. Horas Estudadas por Dia / Semana / Mês / Ano (Barras Recharts com Linha de Meta) */}
          <section aria-label="Horas estudadas por período">
            <HorasEstudoChart
              sessoes={sessoesFiltradas}
              provaAtiva={provaAtiva}
              filtroPeriodo={filtroPeriodo}
              dataInicio={dataInicio}
              dataFim={dataFim}
              filtroTempoLabel={filtroTempoLabel}
            />
          </section>

          {/* 3. Mapa de Calor Anual Estilo GitHub (Grid 365 dias, regra 15min, streaks) */}
          <section aria-label="Mapa de calor e consistência anual">
            <MapaCalorAnual
              sessoes={sessoesFiltradas}
              filtroPeriodo={filtroPeriodo}
              dataInicio={dataInicio}
              dataFim={dataFim}
              filtroTempoLabel={filtroTempoLabel}
              disciplinaNome={disciplinaSelecionada?.nome}
            />
          </section>

          {/* 4. Distribuição de Tempo por Disciplina (Rosca) & Evolução do % de Acerto (Linha) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section aria-label="Distribuição de tempo por disciplina ou tópico">
              <DistribuicaoTempoRosca
                dadosDistribuicao={distribuicaoTempo}
                filtroTempoLabel={filtroTempoLabel}
                isPorTopico={filtroDisciplinaId !== 'todas'}
                disciplinaNome={disciplinaSelecionada?.nome}
              />
            </section>

            <section aria-label="Evolução do percentual de acerto">
              <EvolucaoAcertosLinha
                dadosLinha={relatorioEvolucao.dadosLinha}
                tipoGranularidade={relatorioEvolucao.tipoGranularidade}
                filtroTempoLabel={filtroTempoLabel}
                metaAcertos={metaAcertosConcurso}
                onSalvarMetaAcertos={handleSalvarMetaAcertos}
              />
            </section>
          </div>

          {/* 5. Ranking de Assuntos (do pior ao melhor) */}
          <section aria-label="Ranking de assuntos gargalos">
            <RankingAssuntos
              rankingAssuntos={desempenho.rankingAssuntos}
              assuntosPendentes={desempenho.assuntosPendentesDeQuestoes}
              todosAssuntos={desempenho.todosAssuntosComQuestoes}
              filtroTempoLabel={filtroTempoLabel}
              filtroPeriodo={filtroPeriodo}
            />
          </section>

          {/* 6. Acertos: % Geral, por Disciplina e por Tópico (Expansível) */}
          <section aria-label="Acertos detalhados por disciplina e tópico">
            <AcertosDisciplinasTopicos
              dadosGerais={desempenho.geral}
              disciplinas={desempenho.disciplinas}
              filtroTempoLabel={filtroTempoLabel}
              filtroDisciplinaId={filtroDisciplinaId}
              temFiltroAtivo={temFiltroAtivo}
            />
          </section>

          {/* 7. Histórico Recente de Sessões */}
          <Card className="bg-[#121c33] border-[#1d2c4c]">
            <CardHeader className="pb-3 border-b border-[#1d2c4c]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm text-white">
                      Histórico de Sessões Filtradas
                    </CardTitle>
                    {temFiltroAtivo && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {filtroTempoLabel}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Sessões executadas correspondentes aos filtros selecionados
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-mono text-slate-400">
                    {sessoesFiltradas.length} {sessoesFiltradas.length === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {sessoesFiltradas.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma sessão registrada no período selecionado
                </div>
              ) : (
                <div className="divide-y divide-[#1d2c4c]/60">
                  {(mostrarTodasSessoes ? sessoesFiltradas : sessoesFiltradas.slice(0, 6)).map((sessao) => {
                    const disc = state.disciplinas.find((d) => d.id === sessao.disciplinaId);
                    const topico = state.topicos.find((t) => t.id === sessao.topicoId);

                    return (
                      <div
                        key={sessao.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full mt-1 shrink-0 shadow-sm"
                            style={{ backgroundColor: disc?.cor || '#38bdf8' }}
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-white">
                              {disc?.nome || 'Disciplina'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {topico ? topico.nome : sessao.tipo?.toUpperCase()} •{' '}
                              {formatarDataHora(sessao.inicioISO)}
                            </p>
                            {sessao.observacao && (
                              <p className="text-[11px] text-slate-400/90 italic mt-0.5 line-clamp-1">
                                "{sessao.observacao}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs sm:self-center">
                          <span className="font-mono text-slate-200 font-semibold bg-[#172440] px-2.5 py-1 rounded-lg border border-[#1d2c4c]">
                            {formatarSegundos(sessao.segundosEstudo)}
                          </span>
                          {sessao.questoesFeitas > 0 && (
                            <span className="text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono">
                              {sessao.questoesAcertos}/{sessao.questoesFeitas} (
                              {Math.round((sessao.questoesAcertos / sessao.questoesFeitas) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botão de Ver Todas as Sessões se houver mais de 6 */}
              {sessoesFiltradas.length > 6 && (
                <div className="pt-3 border-t border-[#1d2c4c]/50 text-center">
                  <button
                    type="button"
                    onClick={() => setMostrarTodasSessoes((v) => !v)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 py-1 px-3 rounded-lg hover:bg-blue-500/10 transition cursor-pointer"
                  >
                    {mostrarTodasSessoes
                      ? 'Mostrar apenas as 6 primeiras'
                      : `Ver todas as ${sessoesFiltradas.length} sessões filtradas`}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
