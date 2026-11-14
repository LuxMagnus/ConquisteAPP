import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Check, Trash2, AlertCircle, Sparkles, Sliders, ShieldAlert } from 'lucide-react';
import { Modal, ConfirmModal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { PALETA_CORES_DISCIPLINA, calcularPrioridade } from '../../lib/materiaUtils.js';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function DisciplinaModal({
  isOpen,
  onClose,
  disciplinaParaEditar = null,
  provaId = null,
}) {
  const { dispatch } = useStudyStore();
  const isEditing = Boolean(disciplinaParaEditar);

  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(PALETA_CORES_DISCIPLINA[0].hex);
  const [peso, setPeso] = useState(8);
  const [dificuldade, setDificuldade] = useState(3);
  const [dominio, setDominio] = useState(50);
  const [ativa, setAtiva] = useState(true);
  const [erro, setErro] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (disciplinaParaEditar) {
      setNome(disciplinaParaEditar.nome || '');
      setCor(disciplinaParaEditar.cor || PALETA_CORES_DISCIPLINA[0].hex);
      setPeso(Number(disciplinaParaEditar.peso) || 8);
      setDificuldade(Number(disciplinaParaEditar.dificuldade) || 3);
      setDominio(Number(disciplinaParaEditar.dominio) || 50);
      setAtiva(disciplinaParaEditar.ativa !== false);
    } else {
      setNome('');
      setCor(PALETA_CORES_DISCIPLINA[Math.floor(Math.random() * PALETA_CORES_DISCIPLINA.length)].hex);
      setPeso(8);
      setDificuldade(3);
      setDominio(50);
      setAtiva(true);
    }
    setErro('');
  }, [disciplinaParaEditar, isOpen]);

  // Prioridade calculada em tempo real para feedback instantâneo
  const prioridadeCalculada = useMemo(() => {
    return calcularPrioridade(peso, dificuldade, dominio);
  }, [peso, dificuldade, dominio]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da disciplina.');
      return;
    }

    const payload = {
      id: disciplinaParaEditar ? disciplinaParaEditar.id : `disc-${Date.now()}`,
      provaId: disciplinaParaEditar ? disciplinaParaEditar.provaId : provaId,
      nome: nome.trim(),
      cor,
      peso: Number(peso),
      dificuldade: Number(dificuldade),
      dominio: Number(dominio),
      ativa: Boolean(ativa),
    };

    if (isEditing) {
      dispatch({ type: ACTION_TYPES.UPDATE_DISCIPLINA, payload });
    } else {
      dispatch({ type: ACTION_TYPES.ADD_DISCIPLINA, payload });
    }

    onClose();
  }

  function handleConfirmDelete() {
    if (disciplinaParaEditar) {
      dispatch({ type: ACTION_TYPES.DELETE_DISCIPLINA, payload: disciplinaParaEditar.id });
      setConfirmDeleteOpen(false);
      onClose();
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Editar Disciplina' : 'Nova Disciplina'}
        description="Calibre o peso no edital, seu nível de dificuldade e o percentual de domínio."
        maxWidth="max-w-lg"
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
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={Check} onClick={handleSubmit}>
                {isEditing ? 'Salvar Alterações' : 'Adicionar Disciplina'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome da Disciplina */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome da Disciplina *
            </label>
            <div className="relative">
              <input
                type="text"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setErro('');
                }}
                placeholder="Ex: Direito Administrativo, Língua Portuguesa..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] focus:border-blue-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Seletor de Cores da Paleta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Cor de Identificação
            </label>
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-[#0d1629] border border-[#1e2f52]">
              {PALETA_CORES_DISCIPLINA.map((item) => (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => setCor(item.hex)}
                  className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                    cor.toLowerCase() === item.hex.toLowerCase()
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1629] scale-110 shadow-lg'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: item.hex }}
                  title={item.nome}
                >
                  {cor.toLowerCase() === item.hex.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                  )}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Custom:</label>
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  title="Escolher cor personalizada"
                />
              </div>
            </div>
          </div>

          {/* Peso (1 a 10) */}
          <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Peso no Edital (1 a 10)
                </span>
                <p className="text-[11px] text-slate-400">
                  Importância / quantidade de questões no edital
                </p>
              </div>
              <span className="text-base font-extrabold font-mono text-blue-400 px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                {peso} / 10
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={peso}
              onChange={(e) => setPeso(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Baixo)</span>
              <span>5 (Médio)</span>
              <span>10 (Crítico)</span>
            </div>
          </div>

          {/* Dificuldade (1 a 5) */}
          <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Dificuldade Pessoal (1 a 5)
                </span>
                <p className="text-[11px] text-slate-400">
                  Quão complexa a matéria é para você aprender
                </p>
              </div>
              <span className="text-base font-extrabold font-mono text-orange-400 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                {dificuldade} / 5
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => setDificuldade(nivel)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    dificuldade === nivel
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-md shadow-orange-950/40'
                      : 'bg-[#121c33] border-[#1e2f52] text-slate-400 hover:text-white hover:bg-[#182542]'
                  }`}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          {/* Domínio (0 a 100%) */}
          <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Domínio da Matéria (0% a 100%)
                </span>
                <p className="text-[11px] text-slate-400">
                  Seu percentual de segurança e acertos no conteúdo
                </p>
              </div>
              <span className="text-base font-extrabold font-mono text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                {dominio}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={dominio}
              onChange={(e) => setDominio(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Iniciante)</span>
              <span>50% (Intermediário)</span>
              <span>100% (Avançado)</span>
            </div>
          </div>

          {/* Ativação no Ciclo de Estudos */}
          <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Incluir no Ciclo de Estudos
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    ativa
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {ativa ? 'Ativa no Ciclo' : 'Pausada'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {ativa
                  ? 'Esta matéria entrará na distribuição de horas e nas metas da volta do ciclo.'
                  : 'A matéria não entrará no ciclo atual, mas seu histórico, tópicos e questões permanecem salvos.'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={ativa}
              onClick={() => setAtiva(!ativa)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                ativa ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  ativa ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Box de Prévia da Prioridade Calculada */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                Prioridade Calculada no Ciclo
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {peso} × {dificuldade} × (1 − {dominio}%) =
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                {prioridadeCalculada.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block">pontos de prioridade</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão da Disciplina */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Disciplina?"
        message={`Tem certeza que deseja excluir "${nome}"? Esta ação removerá permanentemente todos os tópicos do edital verticalizado, sessões de estudo realizadas e revisões agendadas associadas a esta matéria.`}
        confirmText="Sim, excluir disciplina"
        variant="danger"
      />
    </>
  );
}
