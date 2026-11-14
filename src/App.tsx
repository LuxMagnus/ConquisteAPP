import React, { useState, useEffect } from 'react';
import { StudyProvider, useStudyStore } from './store/StudyContext.jsx';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';

import { PlanoPage } from './pages/PlanoPage.jsx';
import { CronometroPage } from './pages/CronometroPage.jsx';
import { MateriasPage } from './pages/MateriasPage.jsx';
import { EstatisticasPage } from './pages/EstatisticasPage.jsx';
import { RevisoesPage } from './pages/RevisoesPage.jsx';
import { ConfiguracoesModal } from './pages/ConfiguracoesModal.jsx';
import { AssinaturaModal } from './components/monetizacao/AssinaturaModal.jsx';
import { TermosPrivacidadeModal } from './components/compliance/TermosPrivacidadeModal.jsx';
import { FloatingTimerBar } from './components/cronometro/FloatingTimerBar.jsx';
import { SalvarSessaoModal } from './components/cronometro/SalvarSessaoModal.jsx';
import { GlobalTimerWatcher } from './components/cronometro/GlobalTimerWatcher.jsx';
import { ACTION_TYPES } from './store/StudyContext.jsx';
import { inicializarCapacitor, registrarBotaoVoltarAndroid } from './lib/capacitorUtils.js';

function MainApp() {
  const { state, dispatch }: any = useStudyStore();
  const [currentTab, setCurrentTab] = useState('cronometro');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAssinaturaOpen, setIsAssinaturaOpen] = useState(false);
  const [isTermosOpen, setIsTermosOpen] = useState(false);
  const [termosTab, setTermosTab] = useState<'privacidade' | 'termos'>('privacidade');
  const [prefilledTimer, setPrefilledTimer] = useState<any>(null);
  const [isGlobalSaveOpen, setIsGlobalSaveOpen] = useState(false);
  const [globalSaveTimes, setGlobalSaveTimes] = useState<any>(null);

  // Inicialização e captura do botão "Voltar" do Android via Capacitor
  useEffect(() => {
    inicializarCapacitor();

    const removerListener = registrarBotaoVoltarAndroid(() => {
      // Fecha modais ativos em cascata se o usuário pressionar o botão Voltar do celular
      if (isTermosOpen) {
        setIsTermosOpen(false);
        return true;
      }
      if (isAssinaturaOpen) {
        setIsAssinaturaOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isGlobalSaveOpen) {
        setIsGlobalSaveOpen(false);
        return true;
      }
      if (currentTab !== 'cronometro') {
        setCurrentTab('cronometro');
        return true;
      }
      return false; // Permite ação padrão se já estiver na tela raiz (Foco)
    });

    return () => {
      if (typeof removerListener === 'function') {
        removerListener();
      }
    };
  }, [isTermosOpen, isAssinaturaOpen, isSettingsOpen, isGlobalSaveOpen, currentTab]);

  function handleFinalizarDaBarraFlutuante(temposCalculados: any) {
    setGlobalSaveTimes(temposCalculados);
    setIsGlobalSaveOpen(true);
  }

  function handleSalvarSessaoGlobal(novaSessao: any) {
    dispatch({ type: ACTION_TYPES.ADD_SESSAO, payload: novaSessao });
    setIsGlobalSaveOpen(false);
    setGlobalSaveTimes(null);
  }

  function handleSwitchToTimer(config?: any) {
    if (config) {
      setPrefilledTimer(config);
    }
    setCurrentTab('cronometro');
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar Lateral para Desktop (>= 768px) */}
      <Sidebar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAssinatura={() => setIsAssinaturaOpen(true)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-12">
        {/* Top Header */}
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAssinatura={() => setIsAssinaturaOpen(true)}
        />

        {/* Monitor Global de Temporizador e Continuidade Cross-Device */}
        <GlobalTimerWatcher
          onOpenTimerPage={() => setCurrentTab('cronometro')}
          onOpenSaveModal={(tempos: any) => {
            setGlobalSaveTimes(tempos);
            setIsGlobalSaveOpen(true);
          }}
        />

        {/* Viewport da Página Ativa */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'plano' && (
            <PlanoPage onSwitchToTimer={handleSwitchToTimer} />
          )}
          {currentTab === 'cronometro' && (
            <CronometroPage
              prefilledConfig={prefilledTimer}
              onClearPrefilled={() => setPrefilledTimer(null)}
            />
          )}
          {currentTab === 'materias' && <MateriasPage />}
          {currentTab === 'estatisticas' && <EstatisticasPage />}
          {currentTab === 'revisoes' && <RevisoesPage />}
        </main>
      </div>

      {/* Mini-Barra Flutuante (visível enquanto houver sessão ativa) */}
      {currentTab !== 'cronometro' && (
        <FloatingTimerBar
          onOpenTimerPage={() => setCurrentTab('cronometro')}
          onFinalizarSessao={handleFinalizarDaBarraFlutuante}
        />
      )}

      {/* Navegação Inferior Mobile (< 768px) */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
      />

      {/* Modal Global de Salvar Sessão acionado pela barra flutuante */}
      <SalvarSessaoModal
        isOpen={isGlobalSaveOpen}
        onClose={() => setIsGlobalSaveOpen(false)}
        sessaoAtiva={state.sessaoAtiva}
        initialTimes={globalSaveTimes}
        onSave={handleSalvarSessaoGlobal}
      />

      {/* Modal Global de Configurações, Backup e Restauração */}
      <ConfiguracoesModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Modal Global de Assinatura & 60 Dias Grátis */}
      <AssinaturaModal
        isOpen={isAssinaturaOpen}
        onClose={() => setIsAssinaturaOpen(false)}
        onOpenTermos={(tab: any) => {
          setTermosTab(tab || 'privacidade');
          setIsTermosOpen(true);
        }}
      />

      {/* Modal Global de Termos de Uso e Política de Privacidade (LGPD) */}
      <TermosPrivacidadeModal
        isOpen={isTermosOpen}
        onClose={() => setIsTermosOpen(false)}
        initialTab={termosTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <StudyProvider>
      <MainApp />
    </StudyProvider>
  );
}
