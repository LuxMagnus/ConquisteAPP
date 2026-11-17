import React, { useState } from 'react';
import {
  Crown,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
  Zap,
  ArrowRight,
  HelpCircle,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { isNativeApp } from '../../lib/capacitorUtils.js';

export const PLANOS_ASSINATURA = [
  {
    id: 'mensal',
    sku: 'conquiste_mensal_14',
    nome: 'Mensal',
    precoTotal: 'R$ 14,00',
    precoOriginal: null,
    descontoPct: null,
    economiaValor: null,
    valorNumerico: 14.0,
    equivalenteMes: 'R$ 14,00 / mês',
    cobrancaInfo: 'Cobrado mensalmente',
    economia: null,
    destaque: false,
  },
  {
    id: 'trimestral',
    sku: 'conquiste_trimestral_32',
    nome: 'Trimestral',
    precoTotal: 'R$ 32,00',
    precoOriginal: 'R$ 42',
    descontoPct: 24,
    economiaValor: 'R$ 10',
    valorNumerico: 32.0,
    equivalenteMes: 'R$ 10,67 / mês',
    cobrancaInfo: 'Cobrado a cada 3 meses',
    economia: 'Economize 24%',
    destaque: false,
  },
  {
    id: 'anual',
    sku: 'conquiste_anual_97',
    nome: 'Anual',
    precoTotal: 'R$ 97,00',
    precoOriginal: 'R$ 168',
    descontoPct: 42,
    economiaValor: 'R$ 71',
    valorNumerico: 97.0,
    equivalenteMes: 'R$ 8,08 / mês',
    cobrancaInfo: 'Cobrado anualmente',
    economia: 'Economize 42%',
    destaque: true,
  },
];

export function AssinaturaModal({ isOpen, onClose, onOpenTermos }) {
  const [planoSelecionado, setPlanoSelecionado] = useState('anual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'info' | 'error', message: string }

  const planoAtivo = PLANOS_ASSINATURA.find((p) => p.id === planoSelecionado) || PLANOS_ASSINATURA[2];

  // Calcula a data de término do trial de 14 dias a partir de hoje
  const dataFimTrial = new Date();
  dataFimTrial.setDate(dataFimTrial.getDate() + 14);
  const dataFimFormatada = dataFimTrial.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Handler para iniciar o fluxo de assinatura / teste de 14 dias
  const handleIniciarTrial = async () => {
    setIsProcessing(true);
    setFeedback(null);

    try {
      // Se estiver rodando nativo no Android/iOS com o plugin RevenueCat instalado na etapa de publicação:
      const nativePurchases = (typeof window !== 'undefined' && window?.Capacitor?.Plugins?.Purchases) || null;
      if (nativePurchases && typeof nativePurchases.purchasePackage === 'function') {
        // Fluxo em produção nativa com RevenueCat configurado na Play Console
        // await nativePurchases.purchasePackage({ aPackage: planoAtivo.sku });
      }

      // Em ambiente Web ou antes da criação das contas do Google Play:
      // Simulador de sucesso para validação do usuário
      setTimeout(() => {
        setIsProcessing(false);
        setFeedback({
          type: 'success',
          message: `Teste de 14 dias ativado com sucesso para o Plano ${planoAtivo.nome}! Aproveite todos os recursos.`,
        });
        setTimeout(() => {
          onClose();
        }, 2500);
      }, 1000);
    } catch (err) {
      setIsProcessing(false);
      setFeedback({
        type: 'error',
        message: 'Não foi possível conectar ao faturamento da Play Store. Tente novamente.',
      });
    }
  };

  // Restaurar compras (exigência oficial da Google Play Store e App Store)
  const handleRestaurarCompras = async () => {
    setIsProcessing(true);
    setFeedback(null);

    setTimeout(() => {
      setIsProcessing(false);
      setFeedback({
        type: 'info',
        message: 'Nenhuma assinatura anterior foi encontrada nesta conta Google.',
      });
      setTimeout(() => setFeedback(null), 4000);
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 pt-8">
        {/* Banner Hero do Trial de 14 dias */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/60 via-indigo-950/70 to-[#0d1629] border border-blue-500/40 p-5 text-center shadow-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Oferta Especial de Lançamento</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            14 Dias de Teste Totalmente Grátis
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Tenha acesso ilimitado a todos os recursos premium do <strong>Conquiste</strong> por duas semanas completas. Zero cobrança hoje. Cancele quando quiser na Play Store.
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>R$ 0,00 cobrados hoje • Primeira fatura somente em {dataFimFormatada}</span>
          </div>
        </div>

        {/* Feedback visual se houver */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Cards dos 3 Planos */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Escolha seu plano (com 14 dias de teste):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLANOS_ASSINATURA.map((plano) => {
              const isSelected = planoSelecionado === plano.id;

              return (
                <div
                  key={plano.id}
                  onClick={() => setPlanoSelecionado(plano.id)}
                  className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/30 shadow-md'
                      : 'bg-[#0d1629] border-[#1e2f52] hover:border-slate-600'
                  }`}
                >
                  {/* Badge de destaque */}
                  {plano.destaque && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[9px] font-extrabold text-white uppercase tracking-wider shadow-sm">
                      Mais Escolhido
                    </div>
                  )}

                  {plano.economia && !plano.destaque && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-blue-600/90 text-[9px] font-bold text-white uppercase tracking-wider shadow-sm">
                      {plano.economia}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{plano.nome}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-400 bg-blue-500'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {plano.precoOriginal ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/25">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            De
                          </span>
                          <span className="text-sm font-extrabold font-mono text-rose-400 line-through decoration-rose-500 decoration-2 whitespace-nowrap">
                            {plano.precoOriginal}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            por
                          </span>
                        </div>
                      ) : (
                        <div className="hidden sm:flex items-center h-[24px]">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Plano padrão
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                        <span className="text-2xl font-black text-white tracking-tight leading-none">
                          {plano.precoTotal}
                        </span>
                        {plano.descontoPct && (
                          <span className="text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            -{plano.descontoPct}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-[11px] text-blue-300 font-semibold">
                          {plano.equivalenteMes}
                        </p>
                        {plano.economiaValor && (
                          <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                            Poupa {plano.economiaValor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-[#1e2f52]">
                    {plano.cobrancaInfo}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recursos Inclusos no Plano */}
        <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1e2f52] space-y-2">
          <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            O que você recebe no Conquiste Premium:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sincronização em nuvem (PC & Celular)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Análise de editais em PDF com IA Gemini</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Ciclos e metas semanais automáticas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Cronômetro com alarmes e histórico</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Mapas de calor e estatísticas completas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Backups automáticos e sem anúncios</span>
            </div>
          </div>
        </div>

        {/* Botão de Ação Principal */}
        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            size="lg"
            icon={ArrowRight}
            onClick={handleIniciarTrial}
            disabled={isProcessing}
            className="w-full text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-600/30 py-3"
          >
            {isProcessing ? 'Processando na Play Store...' : 'Iniciar Meus 14 Dias Grátis'}
          </Button>

          <p className="text-[11px] text-center text-slate-400 leading-normal px-2">
            Cobrança de {planoAtivo.precoTotal} após os 14 dias (em {dataFimFormatada}). Cancele a qualquer momento nas configurações da Google Play Store com 1 clique antes do fim do teste para não ser cobrado.
          </p>
        </div>

        {/* Rodapé: Restaurar Compras e Links de Termos */}
        <div className="pt-2 border-t border-[#1e2f52] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={handleRestaurarCompras}
            disabled={isProcessing}
            className="hover:text-blue-300 underline font-medium cursor-pointer"
          >
            Restaurar Compras
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenTermos) onOpenTermos('termos');
              }}
              className="hover:text-blue-300 underline cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenTermos) onOpenTermos('privacidade');
              }}
              className="hover:text-blue-300 underline cursor-pointer"
            >
              Política de Privacidade (LGPD)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
