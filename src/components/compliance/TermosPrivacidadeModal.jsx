import React, { useState } from 'react';
import { Shield, FileText, Lock, UserCheck, Trash2, CheckCircle2, ChevronRight, Mail, Scale } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';

export function TermosPrivacidadeModal({ isOpen, onClose, initialTab = 'privacidade' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'privacidade' | 'termos'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Governança, Privacidade & Termos"
      description="Conformidade com a LGPD (Lei nº 13.709/2018) e Diretrizes da Google Play Store."
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-400">
            Atualizado em 2026 • Versão 1.2
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Entendido
          </Button>
        </div>
      }
    >
      {/* Seletor de Abas */}
      <div className="flex border-b border-[#1e2f52] mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('privacidade')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'privacidade'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Política de Privacidade (LGPD)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('termos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'termos'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-400" />
          <span>Termos de Uso & Assinaturas</span>
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-4">
        {activeTab === 'privacidade' ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-white text-xs sm:text-sm">Compromisso com a sua Privacidade</h5>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  O aplicativo <strong>Conquiste - Gestor de Estudos</strong> foi construído com respeito absoluto à sua privacidade. Seus dados de estudo pertencem exclusivamente a você e jamais serão comercializados ou compartilhados com terceiros para fins publicitários.
                </p>
              </div>
            </div>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                1. Quais Dados Coletamos
              </h5>
              <p className="text-slate-300 text-xs">
                Para viabilizar a funcionalidade de planejamento e sincronização entre aparelhos, coletamos apenas:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs pl-2">
                <li><strong>Identificação básica:</strong> Nome e endereço de e-mail fornecidos no login com a conta Google (Firebase Authentication).</li>
                <li><strong>Dados de estudo:</strong> Provas cadastradas, disciplinas, tópicos, metas semanais, contagem de tempo de cronômetro, percentuais de acertos e datas de revisões.</li>
                <li><strong>Identificadores técnicos:</strong> Tipo de dispositivo (computador ou celular) utilizado para sincronização de última alteração.</li>
              </ul>
              <p className="text-emerald-400 font-medium text-xs pt-1">
                Importante: Não coletamos nem armazenamos números de cartão de crédito ou dados bancários. Todos os pagamentos e assinaturas são intermediados diretamente pelos sistemas oficiais e seguros do Google Play Billing ou Apple App Store.
              </p>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                2. Finalidade e Base Legal (LGPD Art. 7º)
              </h5>
              <p className="text-slate-300 text-xs">
                O tratamento de seus dados ocorre sob as bases legais de <strong>Execução de Contrato</strong> (prestação do serviço de gestão de estudos contratado) e <strong>Legítimo Interesse</strong> (para garantir a integridade da sincronização em tempo real e proteção contra abusos).
              </p>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                3. Seus Direitos como Titular (LGPD Art. 18)
              </h5>
              <p className="text-slate-300 text-xs">
                Você possui total controle sobre seus dados pessoais:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1e2f52]">
                  <p className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Exportação / Portabilidade
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você pode baixar a qualquer momento um arquivo JSON completo com todo o seu histórico em Configurações &gt; Backup.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1e2f52]">
                  <p className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Direito ao Esquecimento
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você pode excluir sua conta e apagar permanentemente todos os seus dados do banco de dados na tela de Configurações com um clique.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                4. Canal de Contato e DPO
              </h5>
              <p className="text-slate-300 text-xs">
                Para esclarecer dúvidas sobre privacidade ou exercer seus direitos de titular, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail de suporte institucional indicado na página do app na Google Play Store.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3">
              <Scale className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-white text-xs sm:text-sm">Termos de Uso e Assinatura</h5>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Ao utilizar o Conquiste, você concorda com estes termos. O serviço foi projetado para auxiliar candidatos e estudantes no gerenciamento de suas rotinas de estudo.
                </p>
              </div>
            </div>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                1. Teste Gratuito de 14 Dias (Trial)
              </h5>
              <p className="text-slate-300 text-xs">
                Oferecemos aos novos usuários um período de teste gratuito de <strong>14 (quatorze) dias</strong> para explorar todos os recursos premium do aplicativo sem cobrança imediata.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs pl-2">
                <li>Durante os primeiros 14 dias, o valor cobrado é de <strong>R$ 0,00</strong>.</li>
                <li>Você pode cancelar o teste a qualquer momento durante esse período diretamente na sua conta da Google Play Store (ou App Store) sem que ocorra nenhuma cobrança.</li>
                <li>Caso não haja cancelamento até o 14º dia, a assinatura escolhida será iniciada automaticamente no 15º dia.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                2. Planos Disponíveis e Valores
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1e2f52] text-center">
                  <p className="font-bold text-white">Plano Mensal</p>
                  <p className="text-sm font-extrabold text-blue-400 mt-1">R$ 14,00</p>
                  <p className="text-[10px] text-slate-400">Cobrado a cada mês</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1e2f52] text-center">
                  <p className="font-bold text-white">Plano Trimestral</p>
                  <p className="text-sm font-extrabold text-blue-400 mt-1">R$ 32,00</p>
                  <p className="text-[10px] text-slate-400">Equivale a R$ 10,67/mês</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121c33] border border-blue-500/40 text-center">
                  <p className="font-bold text-emerald-400">Plano Anual</p>
                  <p className="text-sm font-extrabold text-emerald-400 mt-1">R$ 97,00</p>
                  <p className="text-[10px] text-slate-400">Equivale a R$ 8,08/mês</p>
                </div>
              </div>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                3. Cancelamento e Renovação Automática
              </h5>
              <p className="text-slate-300 text-xs">
                Todas as assinaturas possuem renovação automática ao término de cada período, garantindo a continuidade ininterrupta de seus dados e sincronizações.
              </p>
              <p className="text-slate-400 text-xs">
                Para cancelar, acesse a <strong>Google Play Store &gt; Perfil &gt; Pagamentos e Assinaturas &gt; Assinaturas</strong> e selecione o aplicativo Conquiste. O cancelamento interrompe cobranças futuras e mantém seu acesso premium até o final do período já faturado.
              </p>
            </section>

            <section className="space-y-1.5">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                4. Disponibilidade e Isenção de Responsabilidade
              </h5>
              <p className="text-slate-300 text-xs">
                O aplicativo é uma ferramenta de apoio educacional e organizacional. Não garantimos aprovação em concursos nem vinculação com quaisquer bancas examinadoras.
              </p>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
}
