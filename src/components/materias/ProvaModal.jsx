import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Sparkles, AlertCircle, Check, Trash2, Award, Target } from 'lucide-react';
import { Modal, ConfirmModal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { DIAS_DA_SEMANA, calcularDiasRestantes, formatarMinutosHoras } from '../../lib/dateUtils.js';
import { calcularMetasSemanais } from '../../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function ProvaModal({ isOpen, onClose, provaParaEditar = null }) {
  const { state, dispatch } = useStudyStore();
  const isEditing = Boolean(provaParaEditar);

  const [nome, setNome] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [metaAcertosPercentual, setMetaAcertosPercentual] = useState(80);
  const [metasDiarias, setMetasDiarias] = useState({
    seg: 240,
    ter: 240,
    qua: 240,
    qui: 240,
    sex: 180,
    sab: 300,
    dom: 120,
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [erro, setErro] = useState('');

  // Sincroniza formulário com a prova para editar ou valores padrão
  useEffect(() => {
    if (provaParaEditar) {
      setNome(provaParaEditar.nome || '');
      // Extrai YYYY-MM-DD se vier em ISO completo
      const dataStr = provaParaEditar.dataProva ? String(provaParaEditar.dataProva).slice(0, 10) : '';
      setDataProva(dataStr);
      setMetaAcertosPercentual(provaParaEditar.metaAcertosPercentual || 80);
      setMetasDiarias(
        provaParaEditar.metasDiarias || {
          seg: 240,
          ter: 240,
          qua: 240,
          qui: 240,
          sex: 180,
          sab: 300,
          dom: 120,
        }
      );
    } else {
      setNome('');
      setDataProva('');
      setMetaAcertosPercentual(80);
      setMetasDiarias({
        seg: 240,
        ter: 240,
        qua: 240,
        qui: 240,
        sex: 180,
        sab: 300,
        dom: 120,
      });
    }
    setErro('');
  }, [provaParaEditar, isOpen]);

  // Cálculos reativos em tempo real
  const contagemRegressiva = useMemo(() => {
    return calcularDiasRestantes(dataProva);
  }, [dataProva]);

  const resumoMetas = useMemo(() => {
    return calcularMetasSemanais(metasDiarias);
  }, [metasDiarias]);

  function handleMetaChange(diaKey, minutos) {
    const valor = Math.max(0, Math.min(1440, Number(minutos) || 0));
    setMetasDiarias((prev) => ({
      ...prev,
      [diaKey]: valor,
    }));
  }

  function handleQuickSet(minutos) {
    const novasMetas = {};
    DIAS_DA_SEMANA.forEach((d) => {
      novasMetas[d.key] = minutos;
    });
    setMetasDiarias(novasMetas);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do concurso ou prova.');
      return;
    }
    if (!dataProva) {
      setErro('Informe a data prevista para a realização da prova.');
      return;
    }

    const payload = {
      id: provaParaEditar ? provaParaEditar.id : `prova-${Date.now()}`,
      nome: nome.trim(),
      dataProva,
      metaAcertosPercentual: Math.min(100, Math.max(1, Number(metaAcertosPercentual) || 80)),
      metasDiarias,
    };

    if (isEditing) {
      dispatch({ type: ACTION_TYPES.UPDATE_PROVA, payload });
    } else {
      dispatch({ type: ACTION_TYPES.ADD_PROVA, payload });
      // Define a nova prova criada como ativa
      dispatch({ type: ACTION_TYPES.SET_PROVA_ATIVA, payload: payload.id });
    }

    onClose();
  }

  function handleConfirmDelete() {
    if (provaParaEditar) {
      dispatch({ type: ACTION_TYPES.DELETE_PROVA, payload: provaParaEditar.id });
      setConfirmDeleteOpen(false);
      onClose();
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Editar Concurso / Prova' : 'Novo Concurso / Prova'}
        description="Defina a data-alvo e as metas diárias de horas de estudo por dia da semana."
        maxWidth="max-w-2xl"
        footer={
          <div className="w-full flex items-center justify-between gap-2">
            <div>
              {isEditing && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Excluir Prova
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={Check} onClick={handleSubmit}>
                {isEditing ? 'Salvar Alterações' : 'Criar Concurso'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome da Prova */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome do Concurso ou Prova *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setErro('');
              }}
              placeholder="Ex: Auditor-Fiscal da Receita Federal, TJ-SP Escrevente..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] focus:border-blue-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
            />
          </div>

          {/* Data da Prova & Contagem Regressiva */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Data Prevista da Prova *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dataProva}
                  onChange={(e) => {
                    setDataProva(e.target.value);
                    setErro('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] focus:border-blue-500 focus:outline-none text-white text-sm transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Banner de Contagem Regressiva em Dias */}
            <div className="flex flex-col justify-center p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Contagem Regressiva
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                {contagemRegressiva.dias !== null ? (
                  <>
                    <span
                      className={`text-xl sm:text-2xl font-black font-mono ${
                        contagemRegressiva.status === 'futura'
                          ? contagemRegressiva.dias <= 15
                            ? 'text-orange-400'
                            : 'text-emerald-400'
                          : contagemRegressiva.status === 'hoje'
                          ? 'text-blue-400 animate-pulse'
                          : 'text-slate-400'
                      }`}
                    >
                      {contagemRegressiva.dias >= 0 ? `${contagemRegressiva.dias} dias` : 'Encerrada'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {contagemRegressiva.texto}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Escolha uma data para calcular os dias
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta de Acertos no Concurso (%) */}
          <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label htmlFor="metaAcertosInput" className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Meta de Acertos nos Exercícios (Nota de Corte Alvo)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calibra a linha de corte verde exibida nos gráficos de evolução de desempenho.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <input
                  id="metaAcertosInput"
                  type="number"
                  min="50"
                  max="100"
                  value={metaAcertosPercentual}
                  onChange={(e) => setMetaAcertosPercentual(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 px-2 py-1 rounded-lg bg-[#121c33] border border-emerald-500/40 text-center font-mono font-bold text-emerald-400 text-sm focus:outline-none focus:border-emerald-400"
                />
                <span className="text-xs font-bold text-emerald-400">%</span>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium mr-1">Sugestões:</span>
              {[70, 75, 80, 85, 90].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMetaAcertosPercentual(val)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                    metaAcertosPercentual === val
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-[#172440] text-slate-300 border-[#1d2c4c] hover:border-slate-500'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Metas Diárias de Estudo (seg..dom em minutos) */}
          <div className="pt-2 border-t border-[#1d2c4c]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Metas Diárias de Estudo (Segunda a Domingo)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Defina o tempo diário planejado. O total semanal é calculado automaticamente.
                </p>
              </div>

              {/* Botões de Preenchimento Rápido */}
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <span className="text-[10px] text-slate-500 font-medium mr-1 hidden sm:inline">Rápido:</span>
                <button
                  type="button"
                  onClick={() => handleQuickSet(180)}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#172440] hover:bg-[#1e2f52] rounded-lg text-slate-300 transition-colors"
                >
                  3h/dia
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSet(240)}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#172440] hover:bg-[#1e2f52] rounded-lg text-slate-300 transition-colors"
                >
                  4h/dia
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSet(300)}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#172440] hover:bg-[#1e2f52] rounded-lg text-slate-300 transition-colors"
                >
                  5h/dia
                </button>
              </div>
            </div>

            {/* Grid dos 7 dias da semana (Segunda a Domingo) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {DIAS_DA_SEMANA.map((dia) => {
                const minutos = metasDiarias[dia.key] || 0;
                const horas = Math.floor(minutos / 60);
                const minsRestantes = minutos % 60;

                return (
                  <div
                    key={dia.key}
                    className="p-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">{dia.abrev}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {formatarMinutosHoras(minutos)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={horas + minsRestantes / 60}
                        onChange={(e) => {
                          const valHoras = parseFloat(e.target.value) || 0;
                          handleMetaChange(dia.key, Math.round(valHoras * 60));
                        }}
                        className="w-full text-center px-1.5 py-1 text-xs font-mono font-bold bg-[#14203a] border border-[#23355b] rounded-lg text-white focus:outline-none focus:border-blue-400"
                      />
                      <span className="text-[10px] text-slate-400">h</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card com Total Semanal Calculado */}
            <div className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-emerald-900/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                    Carga Horária Semanal Total
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-white font-mono">
                      {resumoMetas.totalFormatado}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({resumoMetas.totalMinutos} minutos semanais)
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 border-[#1e2f52] pt-2 sm:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Média por Dia
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {resumoMetas.mediaFormatada} / dia
                </span>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão da Prova */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Concurso?"
        message={`Tem certeza que deseja excluir a prova "${nome}"? Todas as disciplinas, tópicos, sessões de estudo, histórico e revisões associadas a esta prova serão permanentemente removidos.`}
        confirmText="Sim, excluir concurso"
        variant="danger"
      />
    </>
  );
}
