import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Play,
  Coffee,
  Save,
  Layers,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';

export function CrossDevicePomodoroModal({
  isOpen,
  onClose,
  sessaoAtiva,
  disciplina,
  topico,
  blocoCiclo,
  dispositivoAtual,
  onFinalizarESalvar,
  onContinuarLivre,
  onPausar,
  onDescartar,
}) {
  if (!isOpen || !sessaoAtiva) return null;

  const duracaoMin = Number(sessaoAtiva?.duracaoBlocoMinutos) || 25;
  const origem = sessaoAtiva?.origemDispositivo || 'Celular';
  const isFromOtherDevice = sessaoAtiva?.origemDispositivo && sessaoAtiva.origemDispositivo !== dispositivoAtual;

  const metaCicloMinutos = blocoCiclo?.minutosMeta || 60;
  const feitosCicloMinutos = (blocoCiclo?.minutosFeitos || 0) + duracaoMin;
  const pctCiclo = Math.min(100, Math.round((feitosCicloMinutos / metaCicloMinutos) * 100));
  const isMetaCicloAtingida = Boolean(blocoCiclo?.concluido) || feitosCicloMinutos >= metaCicloMinutos;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title="Sessão Pomodoro Concluída!"
      description={`Temporizador de ${duracaoMin} min finalizado com sucesso.`}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full">
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={onDescartar}
            className="w-full sm:w-auto text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 order-last sm:order-first"
          >
            Descartar
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={Play}
              onClick={onContinuarLivre}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Continuar no Modo Livre
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={onFinalizarESalvar}
              className="w-full sm:w-auto text-xs font-bold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30"
            >
              Salvar no Histórico
            </Button>
          </div>
        </div>
      }
    >
      <div className="text-center py-2 space-y-4">
        {/* Animated Celebration Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-blue-500/20 to-indigo-500/20 border-2 border-emerald-400/40 text-emerald-400 shadow-xl shadow-emerald-500/10">
          <Award className="w-8 h-8 animate-bounce" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meta Cumprida com Sucesso</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Excelente foco nos estudos!
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Sua sessão de foco de <strong className="text-emerald-400 font-extrabold">{duracaoMin} minutos</strong> foi concluída e o tempo líquido foi rigorosamente preservado.
          </p>
        </div>

        {/* Banner de Sincronização Cross-Device (se veio de outro dispositivo, ex: Celular) */}
        {isFromOtherDevice && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 text-left flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-300 leading-relaxed min-w-0">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>Iniciado pelo {origem}</span>
                <span className="text-[10px] px-2 py-0.2 bg-blue-500/20 text-blue-300 rounded font-semibold">
                  Sincronizado na Nuvem
                </span>
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Mesmo que o seu {origem.toLowerCase()} tenha descarregado ou você tenha mudado para este {dispositivoAtual.toLowerCase()}, o temporizador encerrou exatamente aos {duracaoMin} min sem ultrapassar sua meta.
              </p>
            </div>
          </div>
        )}

        {/* Card com a Disciplina, Tópico e Progresso no Ciclo */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e2f52] text-left space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: disciplina?.cor || '#38bdf8' }}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {disciplina?.nome || 'Disciplina'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {topico ? topico.nome : 'Sem tópico específico (Geral)'}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shrink-0">
              {duracaoMin} min cumpridos
            </span>
          </div>

          {/* Progresso do Ciclo */}
          {blocoCiclo && (
            <div className="pt-2.5 border-t border-[#1e2f52] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> Progresso no Ciclo:
                </span>
                <span className="font-semibold text-slate-200">
                  {isMetaCicloAtingida ? (
                    <span className="text-emerald-400 font-bold">Meta Cumprida (100%) 🎉</span>
                  ) : (
                    <span>{feitosCicloMinutos}m de {metaCicloMinutos}m ({pctCiclo}%)</span>
                  )}
                </span>
              </div>

              <div className="w-full bg-[#0a101d] h-2 rounded-full overflow-hidden p-0.5 border border-[#1b2b4d]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pctCiclo}%`,
                    backgroundColor: isMetaCicloAtingida ? '#10b981' : (disciplina?.cor || '#38bdf8'),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Você pode salvar este estudo no seu histórico agora, continuar no modo livre ou fazer uma pausa.
        </p>
      </div>
    </Modal>
  );
}
