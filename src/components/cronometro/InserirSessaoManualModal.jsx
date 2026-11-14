import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  FileText,
  Calendar,
  Bookmark,
  PlusCircle,
  AlertCircle,
  Save,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Tabs } from '../common/Tabs.jsx';
import { Button } from '../common/Button.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';
import { calcularPercentualAcertos } from '../../lib/timerUtils.js';

export function InserirSessaoManualModal({ isOpen, onClose }) {
  const { state, dispatch, disciplinasDaProva } = useStudyStore();

  const [disciplinaId, setDisciplinaId] = useState('');
  const [topicoId, setTopicoId] = useState('');
  const [tipo, setTipo] = useState('teoria');
  const [dataHoraInicio, setDataHoraInicio] = useState('');

  const [horasEstudo, setHorasEstudo] = useState(1);
  const [minutosEstudo, setMinutosEstudo] = useState(0);
  const [segundosEstudo, setSegundosEstudo] = useState(0);

  const [minutosPausa, setMinutosPausa] = useState(0);
  const [segundosPausa, setSegundosPausa] = useState(0);

  const [questoesFeitas, setQuestoesFeitas] = useState(0);
  const [questoesAcertos, setQuestoesAcertos] = useState(0);
  const [pontoDeParada, setPontoDeParada] = useState('');
  const [observacao, setObservacao] = useState('');
  const [marcarComoConcluidoNoCiclo, setMarcarComoConcluidoNoCiclo] = useState(false);
  const [erro, setErro] = useState('');

  const wasOpenRef = useRef(false);

  // Inicializa data/hora e disciplina quando abre pela primeira vez
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const now = new Date();
      // Formata para datetime-local YYYY-MM-DDTHH:mm
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setDataHoraInicio(localISOTime);

      if (disciplinasDaProva.length > 0) {
        const defaultDisc = disciplinasDaProva.find((d) => d.ativa !== false) || disciplinasDaProva[0];
        setDisciplinaId(defaultDisc.id);
        setPontoDeParada(defaultDisc.ultimoPontoDeParada || '');
        setTopicoId(defaultDisc.ultimoTopicoId || '');
      }

      setHorasEstudo(1);
      setMinutosEstudo(0);
      setSegundosEstudo(0);
      setMinutosPausa(0);
      setSegundosPausa(0);
      setQuestoesFeitas(0);
      setQuestoesAcertos(0);
      setObservacao('');
      setErro('');
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, disciplinasDaProva]);

  const prevDiscIdRef = useRef(disciplinaId);

  // Atualiza ponto de parada e tópico estritamente quando o usuário troca a disciplina
  useEffect(() => {
    if (disciplinaId && disciplinaId !== prevDiscIdRef.current) {
      prevDiscIdRef.current = disciplinaId;
      const disc = state.disciplinas.find((d) => d.id === disciplinaId);
      if (disc) {
        setPontoDeParada(disc.ultimoPontoDeParada || '');
        if (disc.ultimoTopicoId) {
          setTopicoId(disc.ultimoTopicoId);
        } else {
          setTopicoId('');
        }
      }
    }
  }, [disciplinaId, state.disciplinas]);

  const disc = useMemo(() => {
    return state.disciplinas.find((d) => d.id === disciplinaId);
  }, [state.disciplinas, disciplinaId]);

  const topicosDaDisc = useMemo(() => {
    return state.topicos.filter((t) => t.disciplinaId === disciplinaId);
  }, [state.topicos, disciplinaId]);

  const cicloAtivo = useMemo(() => {
    const provaId = disc?.provaId || state.config?.provaAtivaId;
    return state.ciclos.find((c) => c.provaId === provaId) || null;
  }, [state.ciclos, disc?.provaId, state.config?.provaAtivaId]);

  const blocoCiclo = useMemo(() => {
    if (!cicloAtivo || !disciplinaId) return null;
    return cicloAtivo.blocos?.find((b) => b.disciplinaId === disciplinaId) || null;
  }, [cicloAtivo, disciplinaId]);

  const totalSegundosFoco = useMemo(() => {
    const h = Math.max(0, parseInt(horasEstudo, 10) || 0);
    const m = Math.max(0, parseInt(minutosEstudo, 10) || 0);
    const s = Math.max(0, parseInt(segundosEstudo, 10) || 0);
    return h * 3600 + m * 60 + s;
  }, [horasEstudo, minutosEstudo, segundosEstudo]);

  const totalSegundosPausa = useMemo(() => {
    const m = Math.max(0, parseInt(minutosPausa, 10) || 0);
    const s = Math.max(0, parseInt(segundosPausa, 10) || 0);
    return m * 60 + s;
  }, [minutosPausa, segundosPausa]);

  const numFeitas = Math.max(0, parseInt(questoesFeitas, 10) || 0);
  const numAcertos = Math.max(0, parseInt(questoesAcertos, 10) || 0);
  const percentualAcerto = useMemo(() => {
    return calcularPercentualAcertos(numFeitas, numAcertos);
  }, [numFeitas, numAcertos]);

  const minutosSessao = Math.round(totalSegundosFoco / 60);
  const minutosTotaisCiclo = (blocoCiclo?.minutosFeitos || 0) + minutosSessao;
  const metaCicloMinutos = blocoCiclo?.minutosMeta || 60;
  const metaAtingida = blocoCiclo ? minutosTotaisCiclo >= metaCicloMinutos : false;

  function handleSubmit(e) {
    e?.preventDefault();

    if (!disciplinaId) {
      setErro('Por favor, selecione uma disciplina.');
      return;
    }

    if (totalSegundosFoco <= 0) {
      setErro('O tempo focado de estudo precisa ser de pelo menos 1 minuto/segundo.');
      return;
    }

    if (numAcertos > numFeitas) {
      setErro('O número de acertos não pode ser maior do que o total de questões feitas.');
      return;
    }

    const isoDate = dataHoraInicio ? new Date(dataHoraInicio).toISOString() : new Date().toISOString();

    const novaSessao = {
      id: `sess-${Date.now()}`,
      disciplinaId,
      topicoId: topicoId || null,
      inicioISO: isoDate,
      segundosEstudo: totalSegundosFoco,
      segundosPausa: totalSegundosPausa,
      tipo,
      questoesFeitas: numFeitas,
      questoesAcertos: numAcertos,
      observacao: observacao.trim(),
      pontoDeParada: pontoDeParada.trim(),
      marcarComoConcluidoNoCiclo: marcarComoConcluidoNoCiclo || metaAtingida,
    };

    dispatch({ type: ACTION_TYPES.ADD_SESSAO, payload: novaSessao });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Sessão Manual de Estudos"
      description="Cadastre estudos realizados fora do aplicativo (livros, videoaulas offline ou dias anteriores)."
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSubmit}>
            Salvar Sessão Manual
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletores de Disciplina e Tópico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Disciplina <span className="text-rose-400">*</span>
            </label>
            <select
              value={disciplinaId}
              onChange={(e) => setDisciplinaId(e.target.value)}
              className="w-full bg-[#121c33] border border-[#23355b] text-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {disciplinasDaProva.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} {d.ativa === false ? '(Pausada do ciclo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tópico do Edital (Opcional)
            </label>
            <select
              value={topicoId}
              onChange={(e) => setTopicoId(e.target.value)}
              className="w-full bg-[#121c33] border border-[#23355b] text-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Estudo Geral / Sem tópico</option>
              {topicosDaDisc.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.parentId ? `↳ ${t.nome}` : t.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data/Hora de Início e Tipo de Estudo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Data e Horário Realizado
            </label>
            <input
              type="datetime-local"
              value={dataHoraInicio}
              onChange={(e) => setDataHoraInicio(e.target.value)}
              className="w-full bg-[#121c33] border border-[#23355b] text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Modalidade de Estudo
            </label>
            <Tabs
              tabs={[
                { id: 'teoria', label: 'Teoria' },
                { id: 'questoes', label: 'Questões' },
                { id: 'revisao', label: 'Revisão' },
              ]}
              activeTab={tipo}
              onChange={setTipo}
            />
          </div>
        </div>

        {/* Bloco de Tempos Líquidos e Pausa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tempo Líquido */}
          <div className="p-3 rounded-2xl bg-[#121c33] border border-[#1e2f52] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Tempo Focado Líquido
              </span>
              <span className="text-[11px] font-mono text-blue-300 font-bold">
                {Math.floor(totalSegundosFoco / 60)}m
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Horas</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={horasEstudo}
                  onChange={(e) => setHorasEstudo(e.target.value)}
                  className="w-full bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Minutos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutosEstudo}
                  onChange={(e) => setMinutosEstudo(e.target.value)}
                  className="w-full bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Segundos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={segundosEstudo}
                  onChange={(e) => setSegundosEstudo(e.target.value)}
                  className="w-full bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tempo de Pausa */}
          <div className="p-3 rounded-2xl bg-[#121c33] border border-[#1e2f52] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                Tempo de Pausa (opcional)
              </span>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                {Math.floor(totalSegundosPausa / 60)}m
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Minutos</label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={minutosPausa}
                  onChange={(e) => setMinutosPausa(e.target.value)}
                  className="w-full bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Segundos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={segundosPausa}
                  onChange={(e) => setSegundosPausa(e.target.value)}
                  className="w-full bg-[#0d1629] border border-[#23355b] text-white text-center rounded-xl py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Exercícios Realizados */}
        <div className="p-3 rounded-2xl bg-[#101b33] border border-[#1e2f52] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Exercícios Resolvidos (Opcional)
            </span>
            {numFeitas > 0 && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {percentualAcerto}% de acertos
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Questões Feitas</label>
              <input
                type="number"
                min="0"
                value={questoesFeitas}
                onChange={(e) => setQuestoesFeitas(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d1629] border border-[#23355b] text-white rounded-xl px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Acertos</label>
              <input
                type="number"
                min="0"
                value={questoesAcertos}
                onChange={(e) => setQuestoesAcertos(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d1629] border border-[#23355b] text-white rounded-xl px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Registro do Ponto de Parada */}
        <div className="p-3 rounded-2xl bg-[#121c33] border border-amber-500/30 space-y-1.5">
          <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Registro do Ponto de Parada (Sugestão para a próxima sessão)
          </label>
          <input
            type="text"
            value={pontoDeParada}
            onChange={(e) => setPontoDeParada(e.target.value)}
            placeholder="Ex: Página 42, questão 15 / Vídeo 03 aos 24min / Início do Capítulo 4..."
            className="w-full bg-[#0d1629] border border-[#23355b] text-slate-100 rounded-xl px-3 py-2 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Concluir Bloco no Ciclo */}
        {blocoCiclo && (
          <div className={`p-3 rounded-2xl border transition-all ${
            marcarComoConcluidoNoCiclo
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-[#121c33] border-[#1d2c4c]'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marcarComoConcluidoNoCiclo}
                onChange={(e) => setMarcarComoConcluidoNoCiclo(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-[#0d1629] border-[#23355b] focus:ring-0 cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">
                  Marcar matéria/bloco como concluído no ciclo de estudos
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Meta: {metaCicloMinutos} min • Tempo com esta inserção: {minutosTotaisCiclo} min
                  {metaAtingida && ' (Meta atingida! 🎉)'}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Observações e Anotações
          </label>
          <textarea
            rows="2"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Anotações sobre a sessão..."
            className="w-full bg-[#0f172a] border border-[#23355b] text-slate-200 rounded-xl p-2.5 text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Erro de validação */}
        {erro && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
