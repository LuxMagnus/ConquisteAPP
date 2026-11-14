/**
 * Utilitários de integração com Capacitor (Android e iOS)
 * Fornece inicialização segura de plugins, suporte ao botão Voltar do Android e controle da StatusBar.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Verifica se o aplicativo está rodando como app nativo (Android/iOS empacotado)
 */
export function isNativeApp() {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
}

/**
 * Inicializa configurações visuais nativas no Android/iOS (StatusBar, Splash, etc.)
 */
export async function inicializarCapacitor() {
  if (!isNativeApp()) return;

  try {
    // Configura StatusBar com estilo escuro e cor de fundo correspondente ao tema
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0d1527' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('StatusBar Capacitor não pôde ser inicializada:', err);
  }
}

/**
 * Registra um callback para interceptar o botão físico/virtual "Voltar" do Android.
 * Retorna uma função de desinscrição para ser usada em useEffect.
 * 
 * @param {Function} onBackPress Função executada quando o usuário pressiona "Voltar"
 */
export function registrarBotaoVoltarAndroid(onBackPress) {
  if (!isNativeApp()) {
    return () => {};
  }

  let handlerSubscription = null;

  try {
    const subPromise = CapacitorApp.addListener('backButton', (event) => {
      if (typeof onBackPress === 'function') {
        const interceptado = onBackPress(event);
        // Se a função retornar true ou event.canGoBack, não fecha o app
        if (interceptado) {
          return;
        }
      }
    });

    subPromise.then((handle) => {
      handlerSubscription = handle;
    });
  } catch (err) {
    console.warn('Erro ao registrar botão voltar do Capacitor:', err);
  }

  return () => {
    if (handlerSubscription && typeof handlerSubscription.remove === 'function') {
      handlerSubscription.remove();
    }
  };
}
