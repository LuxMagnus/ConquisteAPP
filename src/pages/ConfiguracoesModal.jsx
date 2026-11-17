import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Trash2,
  Key,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  Cloud,
  CloudCheck,
  LogOut,
  RefreshCw,
  Smartphone,
  Laptop,
  Crown,
  Shield,
  Scale,
  UserX,
} from 'lucide-react';
import { Modal, ConfirmModal } from '../components/common/Modal.jsx';
import { Button } from '../components/common/Button.jsx';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';
import { exportBackup, importBackup, clearAllData } from '../lib/storage.js';
import { tocarAlarmeFimDeBloco } from '../lib/soundUtils.js';
import { excluirContaUsuario } from '../lib/firebase.js';
import { AssinaturaModal } from '../components/monetizacao/AssinaturaModal.jsx';
import { TermosPrivacidadeModal } from '../components/compliance/TermosPrivacidadeModal.jsx';

export function ConfiguracoesModal({ isOpen, onClose }) {
  const {
    state,
    dispatch,
    currentUser,
    syncStatus,
    syncMessage,
    ultimaSincronizacao,
    ultimaAlteracaoLocal,
    ultimaAlteracaoRemota,
    dispositivoRemoto,
    dispositivoAtual,
    forcarSincronizacao,
    isSyncingManual,
    loginComGoogle,
    logoutFirebase,
  } = useStudyStore();
  const fileInputRef = useRef(null);

  // Estados locais
  const [geminiKey, setGeminiKey] = useState(state.config?.geminiApiKey || '');
  const [alarmeAtivo, setAlarmeAtivo] = useState(state.config?.alarmeAtivo ?? true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmSampleOpen, setIsConfirmSampleOpen] = useState(false);
  const [isConfirmDeleteAccountOpen, setIsConfirmDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isAssinaturaOpen, setIsAssinaturaOpen] = useState(false);
  const [isTermosOpen, setIsTermosOpen] = useState(false);
  const [termosTab, setTermosTab] = useState('privacidade');

  // Exclusão definitiva de conta e dados (LGPD & Google Play)
  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setFeedback(null);

    try {
      if (currentUser) {
        await excluirContaUsuario();
      }
      clearAllData();
      dispatch({ type: ACTION_TYPES.RESET_STATE });
      setIsConfirmDeleteAccountOpen(false);
      setFeedback({
        type: 'success',
        message: 'Sua conta e todos os seus dados foram permanentemente excluídos do sistema.',
      });
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 3500);
    } catch (err) {
      console.error('Erro na exclusão de conta:', err);
      setIsConfirmDeleteAccountOpen(false);
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao processar exclusão de conta. Tente novamente.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Salva alterações na configuração (chave Gemini e alarme)
  const handleSaveConfig = () => {
    dispatch({
      type: ACTION_TYPES.UPDATE_CONFIG,
      payload: {
        geminiApiKey: geminiKey.trim(),
        alarmeAtivo,
      },
    });
    setFeedback({ type: 'success', message: 'Configurações salvas com sucesso!' });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Exportar Backup JSON
  const handleExport = () => {
    const res = exportBackup(state);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Backup JSON gerado e baixado com sucesso!' });
    } else {
      setFeedback({ type: 'error', message: `Falha ao exportar backup: ${res.error}` });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Disparar seletor de arquivo para importar
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Processar arquivo de backup selecionado
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = importBackup(content);
        if (result.success) {
          dispatch({ type: ACTION_TYPES.SET_STATE, payload: result.state });
          setGeminiKey(result.state.config?.geminiApiKey || '');
          setAlarmeAtivo(result.state.config?.alarmeAtivo ?? true);
          setFeedback({
            type: 'success',
            message: `Backup restaurado com sucesso! (${result.state.disciplinas.length} disciplinas carregadas)`,
          });
        } else {
          setFeedback({ type: 'error', message: `Erro ao importar: ${result.error}` });
        }
        setTimeout(() => setFeedback(null), 5000);
      }
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Erro ao ler arquivo do disco.' });
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.readAsText(file);
  };

  // Apagar todos os dados
  const handleConfirmClear = () => {
    dispatch({ type: ACTION_TYPES.RESET_STATE });
    setGeminiKey('');
    setAlarmeAtivo(true);
    setIsConfirmClearOpen(false);
    setFeedback({ type: 'success', message: 'Todos os dados foram apagados com sucesso!' });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Carregar dados de exemplo
  const handleLoadSample = () => {
    dispatch({ type: ACTION_TYPES.LOAD_SAMPLE_DATA });
    setIsConfirmSampleOpen(false);
    setFeedback({
      type: 'success',
      message: 'Dados de exemplo carregados (4 disciplinas, tópicos, sessões e revisões)!',
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Configurações & Backup"
        description="Gerenciamento de persistência local, chaves de API e restauração de dados."
        maxWidth="max-w-xl"
        footer={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        {/* Banner de Feedback */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm font-medium animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Input file invisível para importação */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Seção 0: Banco de Dados & Sincronização em Nuvem (Multi-Dispositivo) */}
        <div className="space-y-3 bg-[#0d1629] p-4 rounded-2xl border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Sincronização em Nuvem (Computador & Celular)</span>
            </h4>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                currentUser
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {currentUser ? 'Conectado ao Firestore' : 'Somente Offline (Local)'}
            </span>
          </div>

          {currentUser ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121c33] border border-[#1e2f52]">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-9 h-9 rounded-full border border-emerald-400/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser.displayName || 'Estudante'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="xs"
                    icon={isSyncingManual ? RefreshCw : CloudCheck}
                    onClick={forcarSincronizacao}
                    disabled={isSyncingManual}
                    className="text-xs"
                  >
                    {isSyncingManual ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </Button>

                  <Button
                    variant="outline"
                    size="xs"
                    icon={LogOut}
                    onClick={logoutFirebase}
                    className="text-slate-300 hover:text-rose-400"
                  >
                    Sair
                  </Button>
                </div>
              </div>

              {/* Detalhes de Timestamps e Aparelhos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1d2c4c] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      {dispositivoAtual === 'Celular' ? (
                        <Smartphone className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-blue-400" />
                      )}
                      Este {dispositivoAtual}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-medium">
                      Local
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px]">Última alteração:</p>
                  <p className="text-slate-200 font-mono text-[10px]">
                    {ultimaAlteracaoLocal
                      ? new Date(ultimaAlteracaoLocal).toLocaleString('pt-BR')
                      : 'Sem registro'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#121c33] border border-[#1d2c4c] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      Nuvem (Firestore)
                    </span>
                    {dispositivoRemoto && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-medium">
                        {dispositivoRemoto}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[10px]">Última gravação:</p>
                  <p className="text-slate-200 font-mono text-[10px]">
                    {ultimaAlteracaoRemota || ultimaSincronizacao
                      ? new Date(ultimaAlteracaoRemota || ultimaSincronizacao).toLocaleString('pt-BR')
                      : 'Sem registro'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {syncMessage || 'Sincronização por última alteração no tempo ativa'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecte sua conta Google no <strong>computador</strong> e no <strong>celular</strong> para sincronizar automaticamente seus estudos. O sistema mantém as duas telas atualizadas de acordo com a última alteração realizada.
              </p>

              <Button
                variant="primary"
                size="sm"
                icon={Cloud}
                onClick={loginComGoogle}
                className="w-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                Conectar com Google e Ativar Nuvem
              </Button>
            </div>
          )}
        </div>

        {/* Seção 1: Chave do Gemini e Alarmes */}
        <div className="space-y-4 bg-[#0d1629] p-4 rounded-2xl border border-[#1d2c4c]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span>Configurações do Sistema</span>
          </h4>

          {/* Campo Chave Gemini */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chave da API Gemini (Opcional)
            </label>
            <div className="relative">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Insira sua chave AIzaSy... (para recursos inteligentes)"
                className="w-full bg-[#121c33] border border-[#23355b] focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 font-mono transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Armazenada exclusivamente no seu navegador (localStorage).
            </p>
          </div>

          {/* Alarme Ativo */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1d2c4c]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-white">Alarme Sonoro de Ciclo</p>
                <p className="text-[11px] text-slate-400">Tocar alerta ao concluir um bloco de estudo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => tocarAlarmeFimDeBloco(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer transition-all"
                title="Ouvir demonstração do alarme Web Audio API"
              >
                Testar Som
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alarmeAtivo}
                  onChange={(e) => setAlarmeAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="xs" onClick={handleSaveConfig}>
              Salvar Configurações
            </Button>
          </div>
        </div>

        {/* Seção 2: Backup & Restauração (Exportar / Importar) */}
        <div className="space-y-3 bg-[#0d1629] p-4 rounded-2xl border border-[#1d2c4c]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup e Sincronização</span>
          </h4>
          <p className="text-xs text-slate-400">
            Exporte seus dados em JSON para garantir cópias de segurança ou migrar entre dispositivos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExport}
              className="w-full text-xs"
            >
              Exportar Backup (JSON)
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={handleTriggerFileInput}
              className="w-full text-xs text-blue-300 hover:text-white"
            >
              Importar Backup (JSON)
            </Button>
          </div>
        </div>

        {/* Seção 3: Assinatura e Planos (Google Play & 14 Dias Trial) */}
        <div className="space-y-3 bg-gradient-to-br from-blue-950/40 to-[#0d1629] p-4 rounded-2xl border border-blue-500/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Assinatura & Planos (14 Dias Grátis)</span>
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              14 Dias Trial
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Experimente o <strong>Conquiste Premium</strong> por 14 dias sem custos: sincronização em tempo real entre celular e computador, extração com IA de editais, mapas de calor e ciclos ilimitados.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              icon={Crown}
              onClick={() => setIsAssinaturaOpen(true)}
              className="w-full sm:w-auto text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950"
            >
              Ver Planos & Ativar 14 Dias Grátis
            </Button>

            <span className="text-[11px] text-slate-400">
              A partir de R$ 8,08/mês no plano anual
            </span>
          </div>
        </div>

        {/* Seção 4: Dados de Teste & Redefinição */}
        <div className="space-y-3 bg-[#0d1629] p-4 rounded-2xl border border-[#1d2c4c]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Dados de Demonstração e Reset</span>
          </h4>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={() => setIsConfirmSampleOpen(true)}
              className="flex-1 text-xs text-amber-300 hover:text-amber-200"
            >
              Carregar Dados de Exemplo
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex-1 text-xs"
            >
              Apagar Tudo Localmente
            </Button>
          </div>
        </div>

        {/* Seção 5: Governança, LGPD e Exclusão de Conta (Mandatório Google Play) */}
        <div className="space-y-3 bg-[#0d1629] p-4 rounded-2xl border border-[#1d2c4c]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacidade, LGPD & Exclusão de Conta</span>
          </h4>

          <p className="text-xs text-slate-400 leading-relaxed">
            Seus dados são protegidos conforme a Lei Geral de Proteção de Dados (LGPD) e diretrizes de transparência do Google Play.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="xs"
              icon={Scale}
              onClick={() => {
                setTermosTab('privacidade');
                setIsTermosOpen(true);
              }}
              className="text-slate-300 hover:text-white"
            >
              Política de Privacidade (LGPD)
            </Button>

            <Button
              variant="outline"
              size="xs"
              icon={Scale}
              onClick={() => {
                setTermosTab('termos');
                setIsTermosOpen(true);
              }}
              className="text-slate-300 hover:text-white"
            >
              Termos de Uso
            </Button>
          </div>

          {/* Botão de Exclusão de Conta (Requisito Google Play / Apple) */}
          <div className="pt-2 border-t border-[#1e2f52]">
            <button
              type="button"
              onClick={() => setIsConfirmDeleteAccountOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Excluir minha conta e todos os meus dados definitivamente</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Remove permanentemente seu perfil, sessões, matérias e histórico do Firestore e do Firebase Auth.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação: Apagar Tudo */}
      <ConfirmModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        title="Apagar Todos os Dados?"
        message="Atenção: Esta ação apagará permanentemente todas as suas provas, matérias cadastradas, sessões gravadas no cronômetro e revisões pendentes. Recomendamos exportar um backup antes de confirmar."
        confirmText="Sim, Apagar Tudo"
        variant="danger"
      />

      {/* Modal de confirmação: Carregar Dados de Exemplo */}
      <ConfirmModal
        isOpen={isConfirmSampleOpen}
        onClose={() => setIsConfirmSampleOpen(false)}
        onConfirm={handleLoadSample}
        title="Carregar Dados de Exemplo?"
        message="Isto carregará uma prova completa (Auditor-Fiscal da Receita Federal) com 4 disciplinas (Direito Constitucional, Direito Administrativo, Português, RLM), tópicos estruturados, histórico de sessões e revisões para testes."
        confirmText="Carregar Exemplo"
        variant="primary"
      />

      {/* Modal de confirmação: Excluir Conta e Dados (Google Play / LGPD) */}
      <ConfirmModal
        isOpen={isConfirmDeleteAccountOpen}
        onClose={() => setIsConfirmDeleteAccountOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Excluir Definitivamente Sua Conta?"
        message="ATENÇÃO: Conforme a LGPD e as políticas do Google Play, esta ação apagará permanentemente todos os seus dados no banco de dados Firestore, seu histórico de estudos, disciplinas, revisões e excluirá sua conta no Firebase Auth. Esta ação é irreversível."
        confirmText={isDeletingAccount ? 'Excluindo dados...' : 'Sim, Excluir Minha Conta'}
        variant="danger"
      />

      {/* Modal de Assinatura & Planos (60 dias de Trial) */}
      <AssinaturaModal
        isOpen={isAssinaturaOpen}
        onClose={() => setIsAssinaturaOpen(false)}
        onOpenTermos={(tab) => {
          setTermosTab(tab || 'termos');
          setIsTermosOpen(true);
        }}
      />

      {/* Modal de Governança, Termos e Privacidade (LGPD) */}
      <TermosPrivacidadeModal
        isOpen={isTermosOpen}
        onClose={() => setIsTermosOpen(false)}
        initialTab={termosTab}
      />
    </>
  );
}

