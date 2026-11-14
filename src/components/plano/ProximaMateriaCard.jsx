import React from 'react';
import { Play, Sparkles, Clock, BookOpen, CheckCircle2, Flame, ArrowRight, BookmarkCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function ProximaMateriaCard({ sugestao, onEstudarAgora }) {
  if (!sugestao || !sugestao.disciplina) {
    return (
      <Card className="bg-[#121c33]/80 border-[#1f2f54]">
        <CardContent className="p-5 text-center text-xs text-slate-400">
          Nenhuma matéria disponível para recomendação.
        </CardContent>
      </Card>
    );
  }

  const { disciplina, bloco, faltamMinutos, percentualConcluido, topicoSugerido, isCompleto } = sugestao;

  const handleClickEstudar = () => {
    // Abre o cronômetro pré-selecionado para a matéria recomendada
    if (onEstudarAgora) {
      onEstudarAgora({
        disciplinaId: disciplina.id,
        blocoId: bloco?.id || null,
        topicoId: topicoSugerido?.id || null,
        duracaoBloco: faltamMinutos > 0 ? faltamMinutos : bloco?.minutosMeta || 60,
        sessaoNumero: bloco?.sessaoNumero,
        sessaoTotal: bloco?.sessaoTotal,
      });
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-[#121e38] via-[#0f182c] to-[#0a1120] border-blue-500/30 shadow-xl shadow-blue-950/30">
      {/* Luz sutil de destaque no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: disciplina.cor }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Próxima Matéria Sugerida
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {bloco?.sessaoTotal > 1 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Sessão {bloco.sessaoNumero || 1}/{bloco.sessaoTotal}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Ordem do Ciclo
            </span>
          </div>
        </div>

        <CardTitle className="text-base sm:text-lg flex items-center gap-2 mt-1">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
            style={{ backgroundColor: disciplina.cor }}
          />
          <span className="text-white truncate">{disciplina.nome}</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Peso {disciplina.peso}/10 • Dificuldade {disciplina.dificuldade}/5 • Domínio {disciplina.dominio || 0}%
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Status do Bloco Atual */}
        {bloco && (
          <div className="p-3 rounded-xl bg-[#172545]/70 border border-[#223660] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Meta do bloco atual:
              </span>
              <span className="font-mono font-bold text-white">
                {bloco.minutosFeitos || 0} / {bloco.minutosMeta} min ({percentualConcluido}%)
              </span>
            </div>

            {/* Mini Barra de Progresso do Bloco */}
            <div className="w-full bg-[#0c1424] h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentualConcluido}%`,
                  backgroundColor: disciplina.cor,
                }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {faltamMinutos > 0 ? (
                <span>
                  Faltam <strong className="text-emerald-400">{faltamMinutos} min</strong> para concluir este bloco no ciclo.
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bloco 100% concluído nesta volta!
                </span>
              )}
            </p>
          </div>
        )}

        {/* Sugestão de Tópico do Edital */}
        {topicoSugerido && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[#142038] border border-[#1e2f52] text-xs">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Tópico Recomendado
              </span>
              <p className="text-slate-200 font-medium truncate">
                {topicoSugerido.nome}
              </p>
            </div>
          </div>
        )}

        {/* Ponto de Parada da Última Sessão */}
        {disciplina.ultimoPontoDeParada && (
          <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
            <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-bold">
                Ponto de Parada Anterior
              </span>
              <p className="text-amber-200 font-medium truncate">
                {disciplina.ultimoPontoDeParada}
              </p>
            </div>
          </div>
        )}

        {/* Botão de Estudar Agora */}
        <Button
          variant="primary"
          size="lg"
          icon={Play}
          onClick={handleClickEstudar}
          className="w-full text-xs sm:text-sm shadow-lg shadow-blue-600/30 font-bold bg-blue-600 hover:bg-blue-500 cursor-pointer"
        >
          Estudar agora
        </Button>
      </CardContent>
    </Card>
  );
}
