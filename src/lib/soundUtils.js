/**
 * Utilitários de áudio (Web Audio API), notificações (Notification API) e controle de tela (Wake Lock API).
 * 100% autônomo sem dependência de arquivos externos ou assets remotos.
 */

let wakeLockSentinel = null;

/**
 * Toca o alarme de encerramento de bloco usando a Web Audio API sintetizada.
 * Produz um toque melódico harmônico com decay suave.
 *
 * @param {boolean} alarmeAtivo Se o som está habilitado nas configurações do app
 */
export function tocarAlarmeFimDeBloco(alarmeAtivo = true) {
  if (!alarmeAtivo) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Sequência de notas harmônicas (C5, E5, G5, C6) com repetição rítmica suave
    const notas = [
      { freq: 523.25, time: 0.0, dur: 0.22 }, // C5
      { freq: 659.25, time: 0.18, dur: 0.22 }, // E5
      { freq: 783.99, time: 0.36, dur: 0.22 }, // G5
      { freq: 1046.5, time: 0.54, dur: 0.45 }, // C6
      // Segundo eco
      { freq: 659.25, time: 0.95, dur: 0.2 },
      { freq: 1046.5, time: 1.15, dur: 0.5 },
    ];

    notas.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + time;
      const stopTime = startTime + dur;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope ADSR suave para evitar estalo
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);
    });

    // Fecha o contexto após o término
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // Ignora
      }
    }, 2000);
  } catch (err) {
    console.warn('Não foi possível reproduzir o áudio sintetizado:', err);
  }
}

/**
 * Toca um sinal sonoro curto de confirmação
 */
export function tocarBeepSimples(alarmeAtivo = true) {
  if (!alarmeAtivo) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);

    setTimeout(() => ctx.close().catch(() => {}), 300);
  } catch {
    // Silencioso em caso de restrição do navegador
  }
}

/**
 * Solicita permissão para a API de Notificações nativa do navegador
 */
export async function pedirPermissaoNotificacao() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  try {
    const status = await Notification.requestPermission();
    return status;
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificação:', err);
    return 'default';
  }
}

/**
 * Dispara uma notificação nativa do sistema
 */
export function dispararNotificacao(titulo, opcoes = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(titulo, {
      body: opcoes.body || 'Seu bloco de estudos chegou ao fim.',
      icon: '/assets/aistudio/image_494e89eb.png',
      badge: '/assets/aistudio/image_494e89eb.png',
      tag: 'estudaqui-sessao',
      renotify: true,
      silent: false,
      ...opcoes,
    });
    return notif;
  } catch (err) {
    console.warn('Erro ao exibir notificação:', err);
    return null;
  }
}

/**
 * Mantém a tela ligada durante a sessão de foco (Screen Wake Lock API)
 */
export async function ativarWakeLock() {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      return true;
    }
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn('Wake Lock não pôde ser ativado:', err);
    return false;
  }
}

/**
 * Libera a trava de tela (Wake Lock)
 */
export async function desativarWakeLock() {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignora erro ao liberar
    }
    wakeLockSentinel = null;
  }
}
