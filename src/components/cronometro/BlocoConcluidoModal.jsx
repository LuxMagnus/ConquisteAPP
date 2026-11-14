import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Play,
  Coffee,
  Save,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function BlocoConcluidoModal({
  isOpen,
  onClose,
  sessaoAtiva,
  disciplina,
  topico,
  blocoCiclo,
  onFinalizar,
  onPausar,
  onContinuarLivre,
}) {
  if (!isOpen) return null;

  const duracaoMin = sessaoAtiva?.duracaoBlocoMinutos || 25;
  const metaCicloMinutos = blocoCiclo?.minutosMeta || 60;
  const feitosCicloMinutos = (blocoCiclo?.minutosFeitos || 0) + duracaoMin;
  const pctCiclo = Math.min(100, Math.round((feitosCicloMinutos / metaCicloMinutos) * 100));
  const faltamCiclo = Math.max(0, metaCicloMinutos - feitosCicloMinutos);
  const isMetaCicloAtingida = Boolean(blocoCiclo?.concluido) || feitosCicloMinutos >= metaCicloMinutos;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      title="Temporizador de Foco Finalizado"
      description={`Sessão planejada de ${duracaoMin} min concluída.`}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onContinuarLivre}
            className="w-full sm:w-auto text-xs"
          >
            Continuar no Modo Livre
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Coffee}
            onClick={onPausar}
            className="w-full sm:w-auto text-xs"
          >
            Fazer uma Pausa
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={onFinalizar}
            className="w-full sm:w-auto text-xs shadow-lg shadow-blue-600/30"
          >
            Salvar Sessão
          </Button>
        </div>
      }
    >
      <div className="text-center py-2 space-y-4">
        {/* Animated Celebration Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-emerald-500/20 border-2 border-blue-500/40 text-blue-400 shadow-xl shadow-blue-500/10 animate-bounce">
          <Award className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-white">
            Excelente foco!
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Você completou <strong className="text-blue-400 font-bold">{duracaoMin} minutos</strong> de estudo nesta sessão.
          </p>
        </div>

        {/* Card da Matéria e Tópico */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] text-left space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: disciplina?.cor || '#38bdf8' }}
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {disciplina?.nome || 'Disciplina'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {topico ? topico.nome : 'Sem tópico específico (Geral)'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25 shrink-0">
              Sessão Concluída
            </span>
          </div>

          {/* Progresso Real do Ciclo de Estudos */}
          {blocoCiclo && (
            <div className="pt-2 border-t border-[#1e2f52] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" /> Progresso no Ciclo:
                </span>
                <span className="font-semibold text-slate-200">
                  {isMetaCicloAtingida ? (
                    <span className="text-emerald-400 font-bold">Meta Cumprida (100%) 🎉</span>
                  ) : (
                    <span>{feitosCicloMinutos}m de {metaCicloMinutos}m ({pctCiclo}%)</span>
                  )}
                </span>
              </div>

              {/* Barra de Progresso da Matéria no Ciclo */}
              <div className="w-full bg-[#0a101d] h-2 rounded-full overflow-hidden p-0.5 border border-[#1b2b4d]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pctCiclo}%`,
                    backgroundColor: isMetaCicloAtingida ? '#10b981' : (disciplina?.cor || '#38bdf8'),
                  }}
                />
              </div>

              {faltamCiclo > 0 && !isMetaCicloAtingida && (
                <p className="text-[10px] text-amber-400/90 text-right font-medium">
                  Faltam {faltamCiclo} minutos para fechar esta matéria no ciclo
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Você pode salvar esta sessão agora, fazer uma pausa programada ou seguir estudando no modo livre sem interrupções.
        </p>
      </div>
    </Modal>
  );
}
