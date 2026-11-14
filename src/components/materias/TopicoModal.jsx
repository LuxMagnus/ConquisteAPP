import React, { useState, useEffect } from 'react';
import { Layers, Check, AlertCircle, CheckSquare, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';

export function TopicoModal({
  isOpen,
  onClose,
  disciplinaId,
  topicoParaEditar = null,
  parentTopico = null,
}) {
  const { dispatch } = useStudyStore();
  const isEditing = Boolean(topicoParaEditar);
  const isSubtopico = Boolean(parentTopico);

  const [nome, setNome] = useState('');
  const [teoria, setTeoria] = useState(false);
  const [questoes, setQuestoes] = useState(false);
  const [revisao, setRevisao] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (topicoParaEditar) {
      setNome(topicoParaEditar.nome || '');
      setTeoria(Boolean(topicoParaEditar.status?.teoria));
      setQuestoes(Boolean(topicoParaEditar.status?.questoes));
      setRevisao(Boolean(topicoParaEditar.status?.revisao));
    } else {
      setNome('');
      setTeoria(false);
      setQuestoes(false);
      setRevisao(false);
    }
    setErro('');
  }, [topicoParaEditar, parentTopico, isOpen]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o título do tópico.');
      return;
    }

    if (isEditing) {
      dispatch({
        type: ACTION_TYPES.UPDATE_TOPICO,
        payload: {
          ...topicoParaEditar,
          nome: nome.trim(),
          status: {
            teoria,
            questoes,
            revisao,
          },
        },
      });
    } else {
      const novoTopico = {
        id: `top-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        disciplinaId: disciplinaId,
        parentId: isSubtopico ? parentTopico.id : null,
        nome: nome.trim(),
        status: {
          teoria,
          questoes,
          revisao,
        },
      };
      dispatch({ type: ACTION_TYPES.ADD_TOPICO, payload: novoTopico });
    }

    onClose();
  }

  const modalTitle = isEditing
    ? 'Editar Tópico'
    : isSubtopico
    ? `Novo Subtópico em "${parentTopico.nome}"`
    : 'Novo Tópico Principal (Nível 1)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={
        isSubtopico
          ? 'Adicione um item específico subordinado a este ponto do edital (Nível 2).'
          : 'Adicione um eixo temático ou capítulo principal da disciplina.'
      }
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" icon={Check} onClick={handleSubmit}>
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
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

        {isSubtopico && (
          <div className="p-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] text-xs text-slate-300 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10">
              Tópico Pai (Nível 1)
            </span>
            <span className="font-semibold truncate">{parentTopico.nome}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Título do Tópico do Edital *
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro('');
            }}
            placeholder="Ex: Artigo 5º da CF/88, Concordância Verbal..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] focus:border-blue-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
            autoFocus
          />
        </div>

        {/* Status Inicial do Edital Verticalizado */}
        <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Status do Edital Verticalizado
          </span>
          <p className="text-[11px] text-slate-400">
            Você também pode marcar ou desmarcar esses checkboxes diretamente na visualização da tabela.
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                teoria
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-[#121c33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={teoria}
                onChange={(e) => setTeoria(e.target.checked)}
                className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold">Teoria</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                questoes
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#121c33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={questoes}
                onChange={(e) => setQuestoes(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold">Questões</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                revisao
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                  : 'bg-[#121c33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={revisao}
                onChange={(e) => setRevisao(e.target.checked)}
                className="rounded accent-orange-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold">Revisão</span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
