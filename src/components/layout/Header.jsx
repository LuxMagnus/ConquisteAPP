import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  Target,
  Cloud,
  CloudCheck,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Crown,
} from 'lucide-react';
import { useStudyStore } from '../../store/StudyContext.jsx';
import { SyncStatusModal } from '../common/SyncStatusModal.jsx';

export function Header({ onOpenSettings, onOpenAssinatura }) {
  const {
    state,
    provaAtiva,
    currentUser,
    syncStatus,
    syncMessage,
    ultimaSincronizacao,
    dispositivoAtual,
    loginComGoogle,
    logoutFirebase,
  } = useStudyStore();

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [bannerFechado, setBannerFechado] = useState(() => {
    try {
      return localStorage.getItem('conquiste:banner-nuvem-fechado') === '1';
    } catch {
      return false;
    }
  });

  function fecharBanner() {
    setBannerFechado(true);
    try {
      localStorage.setItem('conquiste:banner-nuvem-fechado', '1');
    } catch {
      /* armazenamento indisponível: apenas fecha nesta sessão */
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#0d1527]/90 backdrop-blur-md border-b border-[#1d2c4c] px-3.5 sm:px-6 lg:px-8 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
            <div className="relative shrink-0">
              <img
                src="/assets/aistudio/Icone_afd7a14f.png"
                alt="Ícone Conquiste"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-md hover:scale-105 transition-transform"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
                  Conquiste
                </span>
              </div>
              {provaAtiva ? (
                <p className="text-[11px] text-slate-400 truncate max-w-[150px] min-[400px]:max-w-[190px] sm:max-w-xs flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{provaAtiva.nome}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">Nenhum concurso ativo</p>
              )}
            </div>
          </div>

          {/* Concurso ativo (somente com sidebar, >= lg) */}
          <div className="hidden lg:flex items-center gap-2 min-w-0 text-sm text-slate-300">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate font-semibold">
              {provaAtiva ? provaAtiva.nome : 'Nenhum concurso ativo'}
            </span>
          </div>

          {/* Actions & Cloud Sync Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão de Status da Nuvem / Sincronização */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                  syncStatus === 'sincronizado'
                    ? 'bg-[#121c33] border-emerald-500/30 hover:border-emerald-500/60 text-slate-200'
                    : syncStatus === 'sincronizando'
                    ? 'bg-[#121c33] border-blue-500/40 text-blue-300 animate-pulse'
                    : 'bg-[#121c33] border-amber-500/30 text-amber-300'
                }`}
                title="Clique para ver detalhes de sincronização entre computador e celular"
              >
                <div className="flex items-center gap-1.5">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Usuário'}
                      className="w-5 h-5 rounded-full object-cover border border-emerald-400/50"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold flex items-center justify-center text-white">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-bold text-white max-w-[100px] md:max-w-[130px] truncate leading-tight">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
                      {syncStatus === 'sincronizado' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Sincronizado</span>
                        </>
                      )}
                      {syncStatus === 'sincronizando' && (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 text-blue-400 animate-spin" />
                          <span className="text-blue-300">Atualizando...</span>
                        </>
                      )}
                      {syncStatus === 'erro' && (
                        <>
                          <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                          <span className="text-rose-300">Erro na nuvem</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* No mobile: exibe um ícone e badge compacto */}
                  <div className="sm:hidden flex items-center">
                    {syncStatus === 'sincronizado' && (
                      <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {syncStatus === 'sincronizando' && (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    )}
                    {syncStatus === 'erro' && (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer shrink-0"
                title="Entrar com conta Google para sincronizar entre computador e celular"
                aria-label="Sincronizar Nuvem"
              >
                <Cloud className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Sincronizar Nuvem</span>
              </button>
            )}

            {/* Botão de Assinatura & 14 Dias Grátis */}
            <button
              type="button"
              onClick={onOpenAssinatura}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 transition-all text-xs font-bold cursor-pointer shadow-sm shrink-0"
              title="14 Dias de Teste Grátis nos Planos Mensal, Trimestral e Anual"
              aria-label="Planos de Assinatura"
            >
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden md:inline">14 Dias Grátis</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#172440] hover:bg-[#1e2f52] border border-[#23355b] text-slate-200 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm shrink-0"
              title="Configurações e Backup"
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="hidden md:inline">Configurações</span>
            </button>
          </div>
        </div>

      </header>

      {/* Banner de Aviso de Sincronização (fora da barra fixa, para não roubar altura da tela) */}
      {!currentUser && !bannerFechado && (
        <div className="px-3.5 sm:px-6 lg:px-8 pt-3">
          <div className="max-w-7xl mx-auto px-3 py-2 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-3 text-xs text-blue-200">
            <div className="flex items-center gap-2 min-w-0">
              <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="min-w-0">
                <span className="sm:hidden">Conecte sua conta Google para sincronizar seus dados.</span>
                <span className="hidden sm:inline">
                  Para acessar no <strong>computador</strong> e no <strong>celular</strong> com as mesmas matérias e cronômetro, conecte sua conta Google.
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loginComGoogle}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm whitespace-nowrap"
              >
                Conectar
              </button>
              <button
                type="button"
                onClick={fecharBanner}
                className="p-1.5 text-slate-400 hover:text-white rounded"
                title="Fechar aviso"
                aria-label="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhado de Sincronização em Nuvem */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </>
  );
}
