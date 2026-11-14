import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Target,
  Edit2,
  Plus,
  ChevronDown,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { DIAS_DA_SEMANA, calcularDiasRestantes, formatarMinutosHoras, formatarData } from '../../lib/dateUtils.js';
import { calcularMetasSemanais, calcularProgressoEditalGeral } from '../../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function MetasSemanaisCard({ onEditarProva, onNovaProva }) {
  const { state, dispatch, provaAtiva, disciplinasDaProva } = useStudyStore();

  const contagemRegressiva = useMemo(() => {
    return calcularDiasRestantes(provaAtiva?.dataProva);
  }, [provaAtiva?.dataProva]);

  const resumoMetas = useMemo(() => {
    return calcularMetasSemanais(provaAtiva?.metasDiarias);
  }, [provaAtiva?.metasDiarias]);

  const progressoGeral = useMemo(() => {
    return calcularProgressoEditalGeral(disciplinasDaProva, state.topicos);
  }, [disciplinasDaProva, state.topicos]);

  function handleSelectProva(e) {
    const selectedId = e.target.value;
    if (selectedId) {
      dispatch({ type: ACTION_TYPES.SET_PROVA_ATIVA, payload: selectedId });
    }
  }

  if (!provaAtiva) {
    return (
      <div className="p-6 rounded-2xl bg-[#121c33] border border-[#1e2f52] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Nenhum concurso cadastrado</h3>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre seu primeiro concurso com a data da prova e metas de estudo para calibrar o plano.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={onNovaProva}>
          Criar Concurso
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#121c33] via-[#10192e] to-[#0d1629] border border-[#1e2f52] shadow-xl overflow-hidden">
      {/* Header do Card de Prova */}
      <div className="p-4 sm:p-5 border-b border-[#1d2c4c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-blue-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Concurso Alvo Ativo
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit2}
                  onClick={() => onEditarProva(provaAtiva)}
                  className="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-white"
                  title="Editar concurso e metas"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={onNovaProva}
                  className="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-white"
                  title="Cadastrar outro concurso"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {state.provas.length > 1 && (
                <div className="relative inline-flex items-center">
                  <select
                    value={provaAtiva.id}
                    onChange={handleSelectProva}
                    className="text-[11px] font-semibold bg-[#172440] hover:bg-[#1e2f52] border border-[#23355b] text-slate-300 rounded-lg px-2 py-0.5 cursor-pointer focus:outline-none focus:border-blue-500 max-w-[140px] sm:max-w-[180px] truncate"
                    title="Alternar entre concursos cadastrados"
                  >
                    {state.provas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                {provaAtiva.nome}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Data da Prova: {formatarData(provaAtiva.dataProva)}</span>
            </p>
          </div>
        </div>

        {/* Contagem Regressiva e Botões */}
        <div className="w-full">
          {/* Badge de Contagem Regressiva em Dias */}
          <div className="px-3.5 py-3 rounded-xl bg-[#0b1222] border border-[#1e2f52] flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Contagem Regressiva
            </span>
            <span
              className={`text-lg font-black font-mono ${
                contagemRegressiva.status === 'futura'
                  ? contagemRegressiva.dias <= 15
                    ? 'text-orange-400'
                    : 'text-emerald-400'
                  : contagemRegressiva.status === 'hoje'
                  ? 'text-blue-400 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {contagemRegressiva.dias !== null && contagemRegressiva.dias >= 0
                ? `${contagemRegressiva.dias} dias`
                : 'Finalizada'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Metas Diárias (Seg a Dom) + Progresso Geral do Edital */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Metas Semanais Seg..Dom */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Metas Diárias de Estudo
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Média: {resumoMetas.mediaFormatada} / dia
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {DIAS_DA_SEMANA.map((dia) => {
              const minutos = provaAtiva.metasDiarias?.[dia.key] || 0;
              return (
                <div
                  key={dia.key}
                  className="p-2 rounded-xl bg-[#0d1629] border border-[#1e2f52] text-center flex-1 min-w-[3rem]"
                >
                  <span className="text-[11px] font-bold text-slate-400 block">{dia.abrev}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block whitespace-nowrap">
                    {formatarMinutosHoras(minutos)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-400">
              Total Semanal: {resumoMetas.totalFormatado}
            </span>
            <Button
              variant="ghost"
              size="xs"
              icon={Edit2}
              onClick={() => onEditarProva(provaAtiva)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Editar metas
            </Button>
          </div>
        </div>

        {/* Conclusão Geral do Edital Verticalizado */}
        <div className="lg:col-span-4 p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Edital Geral da Prova
              </span>
              <span className="text-base font-black font-mono text-white">
                {progressoGeral.percentual}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {progressoGeral.concluidas} de {progressoGeral.totalEtapas} tópicos estudados (teoria) no edital
            </p>
          </div>

          <div className="mt-3">
            <ProgressBar
              value={progressoGeral.concluidas}
              max={progressoGeral.totalEtapas || 1}
              color="gradient"
              height="h-2.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
