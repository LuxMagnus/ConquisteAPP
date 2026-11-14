import React from 'react';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Sparkles,
  ShieldCheck,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import { useStudyStore } from '../../store/StudyContext.jsx';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export function formatFriendlyTime(isoStr) {
  if (!isoStr) return 'Nenhuma alteração registrada';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Horário não disponível';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Data inválida';
  }
}

export function SyncStatusModal({ isOpen, onClose }) {
  const {
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

  const isMobile = dispositivoAtual === 'Celular';
  const DeviceIcon = isMobile ? Smartphone : Laptop;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronização em Nuvem (Multi-Aparelho)"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Status Header Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            syncStatus === 'sincronizado'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : syncStatus === 'sincronizando'
              ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
              : syncStatus === 'erro'
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="p-2 rounded-xl bg-[#0d1629] border border-white/10 shrink-0">
            {syncStatus === 'sincronizado' && <CloudCheck className="w-5 h-5 text-emerald-400" />}
            {syncStatus === 'sincronizando' && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
            {syncStatus === 'erro' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {syncStatus === 'local' && <Cloud className="w-5 h-5 text-amber-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider">
                {syncStatus === 'sincronizado' && 'Sincronizado em Tempo Real'}
                {syncStatus === 'sincronizando' && 'Sincronizando Alterações...'}
                {syncStatus === 'erro' && 'Atenção na Conexão'}
                {syncStatus === 'local' && 'Modo Local (Offline)'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/10 border border-white/10">
                Regra: Último Tempo
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-300 leading-relaxed">
              {syncMessage ||
                'Os dados de estudos são atualizados automaticamente priorizando a última alteração realizada no tempo.'}
            </p>
          </div>
        </div>

        {/* User Account Info */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Conta Vinculada
            </span>
            {currentUser && (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="w-10 h-10 rounded-full border border-emerald-400/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {currentUser.displayName || 'Estudante'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="xs"
                icon={LogOut}
                onClick={logoutFirebase}
                className="text-slate-300 hover:text-rose-400 shrink-0"
              >
                Sair
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <p className="text-xs text-slate-300 leading-relaxed">
                Para que o computador e o celular conversem entre si, entre com a sua conta Google em ambos os aparelhos.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Cloud}
                onClick={loginComGoogle}
                className="w-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/30"
              >
                Conectar com Google
              </Button>
            </div>
          )}
        </div>

        {/* Timestamps & Devices Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Aparelho Atual */}
          <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <DeviceIcon className="w-3.5 h-3.5 text-blue-400" />
                Este {dispositivoAtual}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-medium">
                Ativo agora
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Última alteração local:</p>
            <p className="text-xs font-mono font-medium text-slate-200">
              {formatFriendlyTime(ultimaAlteracaoLocal)}
            </p>
          </div>

          {/* Servidor Nuvem */}
          <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Nuvem (Firestore)
              </span>
              {dispositivoRemoto && (
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-medium">
                  via {dispositivoRemoto}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Última gravação remota:</p>
            <p className="text-xs font-mono font-medium text-slate-200">
              {formatFriendlyTime(ultimaAlteracaoRemota || ultimaSincronizacao)}
            </p>
          </div>
        </div>

        {/* Informative explanation of "Última Alteração de Tempo" */}
        <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1d2c4c] text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <p className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            Como funciona a sincronização por tempo:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
            <li>
              Cada estudo, matéria concluída ou alteração de ciclo gera um registro temporal exato.
            </li>
            <li>
              <strong>Continuidade de Sessão Ativa:</strong> Se você der play em uma sessão no celular e ele descarregar, ao abrir o computador o cronômetro continua rodando normalmente, ou terá sido encerrado na meta correta no caso de Pomodoro!
            </li>
            <li>
              Nenhuma sessão de estudo feita no celular é perdida ao abrir o computador, e vice-versa.
            </li>
          </ul>
        </div>

        {/* Action Button: Force Sync Now */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          {currentUser && (
            <Button
              variant="primary"
              size="sm"
              icon={isSyncingManual ? RefreshCw : CloudCheck}
              onClick={forcarSincronizacao}
              disabled={isSyncingManual}
              className={`text-xs font-semibold ${
                isSyncingManual ? 'animate-pulse' : ''
              }`}
            >
              {isSyncingManual ? 'Verificando nuvem...' : 'Sincronizar Agora'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
