import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  FileText,
  HelpCircle,
  Award,
  AlertCircle,
  Save,
  BookOpen,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Tabs } from '../common/Tabs.jsx';
import { Button } from '../common/Button.jsx';
import { useStudyStore } from '../../store/StudyContext.jsx';
import { calcularPercentualAcertos } from '../../lib/timerUtils.js';

export function SalvarSessaoModal({ isOpen, onClose, sessaoAtiva, initialTimes, onSave }) {
  const { state } = useStudyStore();

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

  // Estados editáveis de tempo
  const [horasEstudo, setHorasEstudo] = useState(0);
  const [minutosEstudo, setMinutosEstudo] = useState(0);
  const [segundosEstudo, setSegundosEstudo] = useState(0);

  const [minutosPausa, setMinutosPausa] = useState(0);
  const [segundosPausa, setSegundosPausa] = useState(0);

  // Demais campos
  const [tipo, setTipo] = useState('teoria');
  const [questoesFeitas, setQuestoesFeitas] = useState(0);
  const [questoesAcertos, setQuestoesAcertos] = useState(0);
  const [questoesChutes, setQuestoesChutes] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [pontoDeParada, setPontoDeParada] = useState('');
  const [marcarComoConcluidoNoCiclo, setMarcarComoConcluidoNoCiclo] = useState(false);
  const [erro, setErro] = useState('');

  // Ref para garantir que os valores iniciais sejam preenchidos estritamente uma única vez ao abrir o modal,
  // impedindo que re-renders ou novos ticks do temporizador apaguem o que o usuário está digitando
  const wasOpenRef = useRef(false);

  // Sincroniza valores iniciais quando o modal é aberto pela primeira vez
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && sessaoAtiva) {
      wasOpenRef.current = true;
      const segFoco = initialTimes?.segundosEstudo ?? 0;
      const segPausa = initialTimes?.segundosPausa ?? 0;

      setHorasEstudo(Math.floor(segFoco / 3600));
      setMinutosEstudo(Math.floor((segFoco % 3600) / 60));
      setSegundosEstudo(segFoco % 60);

      setMinutosPausa(Math.floor(segPausa / 60));
      setSegundosPausa(segPausa % 60);

      setTipo(sessaoAtiva.tipo || 'teoria');
      const qFeitas = initialTimes?.questoesFeitas ?? sessaoAtiva.questoesFeitas ?? 0;
      const qAcertos = initialTimes?.questoesAcertos ?? sessaoAtiva.questoesAcertos ?? 0;
      const qChutes = initialTimes?.questoesChutes ?? sessaoAtiva.questoesChutes ?? sessaoAtiva.questoesDuvida ?? 0;
      setQuestoesFeitas(qFeitas);
      setQuestoesAcertos(qAcertos);
      setQuestoesChutes(qChutes);
      setObservacao(sessaoAtiva.observacao || '');
      setPontoDeParada(disc?.ultimoPontoDeParada || '');

      const minutosEstudoTotal = Math.round(segFoco / 60);
      const minutosFeitosTotal = (blocoCiclo?.minutosFeitos || 0) + minutosEstudoTotal;
      const metaBatida = blocoCiclo ? minutosFeitosTotal >= blocoCiclo.minutosMeta : false;
      setMarcarComoConcluidoNoCiclo(metaBatida || Boolean(blocoCiclo?.concluido));
      setErro('');
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, sessaoAtiva, disc, blocoCiclo, initialTimes]);

  // Cálculos de totais em segundos
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

  // Cálculo automático do percentual de acerto
  const numFeitas = Math.max(0, parseInt(questoesFeitas, 10) || 0);
  const numAcertos = Math.max(0, parseInt(questoesAcertos, 10) || 0);
  const numChutes = Math.max(0, parseInt(questoesChutes, 10) || 0);
  const percentualAcerto = useMemo(() => {
    return calcularPercentualAcertos(numFeitas, numAcertos);
  }, [numFeitas, numAcertos]);

  function handleSalvar(e) {
    e?.preventDefault();

    if (numAcertos > numFeitas) {
      setErro('O número de acertos não pode ser maior do que o total de questões feitas.');
      return;
    }

    if (numChutes > numAcertos) {
      setErro('O número de acertos no chute/dúvida não pode ser maior do que o total de acertos.');
      return;
    }

    if (totalSegundosFoco <= 0) {
      setErro('O tempo focado de estudo precisa ser de pelo menos 1 segundo.');
      return;
    }

    const novaSessao = {
      id: `sess-${Date.now()}`,
      disciplinaId: sessaoAtiva.disciplinaId,
      blocoId: sessaoAtiva.blocoId || blocoCiclo?.id || null,
      topicoId: sessaoAtiva.topicoId || null,
      inicioISO: sessaoAtiva.inicioISO || new Date().toISOString(),
      segundosEstudo: totalSegundosFoco,
      segundosPausa: totalSegundosPausa,
      tipo,
      questoesFeitas: numFeitas,
      questoesAcertos: numAcertos,
      questoesChutes: numChutes,
      observacao: observacao.trim(),
      pontoDeParada: pontoDeParada.trim(),
      marcarComoConcluidoNoCiclo,
    };

    onSave(novaSessao);
  }

  const minutosSessao = Math.round(totalSegundosFoco / 60);
  const minutosTotaisCiclo = (blocoCiclo?.minutosFeitos || 0) + minutosSessao;
  const metaCicloMinutos = blocoCiclo?.minutosMeta || 60;
  const metaAtingida = blocoCiclo ? minutosTotaisCiclo >= metaCicloMinutos : false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salvar Sessão de Estudo"
      description="Revise os tempos líquidos, pausas e exercícios realizados antes de registrar."
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Continuar Estudando
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSalvar}>
            Salvar no Histórico
          </Button>
        </>
      }
    >
      <form onSubmit={handleSalvar} className="space-y-5">
        {/* Identificação da Matéria e Tópico */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full shadow-sm shrink-0"
              style={{ backgroundColor: disc?.cor || '#38bdf8' }}
            />
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{disc?.nome || 'Disciplina Geral'}</span>
                {blocoCiclo?.sessaoTotal > 1 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Sessão {blocoCiclo.sessaoNumero || 1}/{blocoCiclo.sessaoTotal} ({blocoCiclo.minutosMeta}m)
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400">
                {topico ? topico.nome : 'Sem tópico específico (Geral)'}
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {tipo.toUpperCase()}
          </span>
        </div>

        {/* Tipo de Sessão */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tipo de Estudo
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

        {/* Bloco de Tempos Editáveis (Foco e Pausa) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tempo Focado */}
          <div className="p-3.5 rounded-2xl bg-[#172440]/60 border border-[#23355b] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Tempo Focado Líquido
              </span>
              <span className="text-[11px] font-mono text-blue-300 font-bold">
                {Math.floor(totalSegundosFoco / 60)}m {totalSegundosFoco % 60}s
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
          <div className="p-3.5 rounded-2xl bg-[#172440]/60 border border-[#23355b] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                Tempo de Pausa
              </span>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                {Math.floor(totalSegundosPausa / 60)}m {totalSegundosPausa % 60}s
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

        {/* Questões Feitas, Acertos e Chutes com % Automático */}
        <div className="p-4 rounded-2xl bg-[#101b33] border border-[#1e2f52] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Exercícios Resolvidos (Opcional)
            </span>
            {numFeitas > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    percentualAcerto >= 80
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : percentualAcerto >= 60
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {percentualAcerto}% Geral
                </span>
                {numChutes > 0 && (
                  <span className="text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    {numChutes} no chute
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Questões Feitas
              </label>
              <input
                type="number"
                min="0"
                value={questoesFeitas}
                onChange={(e) => {
                  setQuestoesFeitas(e.target.value);
                  setErro('');
                }}
                placeholder="0"
                className="w-full bg-[#0d1629] border border-[#23355b] text-white rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Acertos Totais
              </label>
              <input
                type="number"
                min="0"
                value={questoesAcertos}
                onChange={(e) => {
                  setQuestoesAcertos(e.target.value);
                  setErro('');
                }}
                placeholder="0"
                className="w-full bg-[#0d1629] border border-[#23355b] text-white rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                Acertos no Chute / Dúvida
              </label>
              <input
                type="number"
                min="0"
                value={questoesChutes}
                onChange={(e) => {
                  setQuestoesChutes(e.target.value);
                  setErro('');
                }}
                placeholder="0"
                className="w-full bg-[#0d1629] border border-amber-500/40 text-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {numFeitas > 0 && numAcertos > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              Desse total: <strong className="text-white">{numAcertos - numChutes} acertos com convicção</strong> ({Math.round(((numAcertos - numChutes) / numFeitas) * 100)}% de acerto real) e <strong className="text-amber-400">{numChutes} acertos no chute/sem certeza</strong>.
            </p>
          )}
        </div>

        {/* Registro do Ponto de Parada */}
        <div className="p-4 rounded-2xl bg-[#121c33] border border-amber-500/30 space-y-2">
          <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-400" />
            Registro do Ponto de Parada (Sugestão para a próxima sessão)
          </label>
          <input
            type="text"
            value={pontoDeParada}
            onChange={(e) => setPontoDeParada(e.target.value)}
            placeholder="Ex: Página 42, questão 15 / Vídeo 03 aos 24min / Início do Capítulo 4..."
            className="w-full bg-[#0d1629] border border-[#23355b] text-slate-100 rounded-xl px-3 py-2.5 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <p className="text-[11px] text-slate-400">
            O ponto de parada fica salvo na matéria e será sugerido automaticamente na sua próxima sessão de estudo deste assunto.
          </p>
        </div>

        {/* Opção de Concluir Bloco no Ciclo */}
        {blocoCiclo && (
          <div className={`p-4 rounded-2xl border transition-all ${
            marcarComoConcluidoNoCiclo
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-[#121c33] border-[#1d2c4c]'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marcarComoConcluidoNoCiclo}
                onChange={(e) => setMarcarComoConcluidoNoCiclo(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-emerald-500 bg-[#0d1629] border-[#23355b] focus:ring-0 cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Marcar matéria como concluída no ciclo atual
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Meta do bloco: <strong className="text-slate-200">{metaCicloMinutos} min</strong> • Total com esta sessão: <strong className={metaAtingida ? 'text-emerald-400' : 'text-blue-400'}>{minutosTotaisCiclo} min</strong>
                  {metaAtingida && ' (Meta atingida! 🎉)'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {metaAtingida
                    ? 'A carga horária foi cumprida. O ciclo avançará automaticamente para a próxima matéria da ordem.'
                    : 'Você pode marcar como concluída antecipadamente para avançar para a próxima matéria sem gerar inconsistências.'}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Observações da Sessão */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Observações e Anotações
          </label>
          <textarea
            rows="3"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Dificuldade em memorizar prazos recursais, rever jurisprudência do STJ..."
            className="w-full bg-[#0f172a] border border-[#23355b] text-slate-200 rounded-xl p-3 text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Mensagem de Erro de Validação */}
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
