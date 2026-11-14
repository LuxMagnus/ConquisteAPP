/**
 * Utilitários de cálculo de tempo para o Cronômetro e Sessões (Fase 2).
 * 
 * Princípio fundamental:
 * Todo cálculo é derivado de timestamps reais (Date.now()) comparados contra
 * os momentos de início e retomada. Nunca depende de ticks de setInterval,
 * garantindo precisão absoluta mesmo quando a aba for suspensa, trocada ou recarregada.
 */

export const PRESETS_BLOCO = [
  { minutos: 15, label: '15 min' },
  { minutos: 25, label: '25 min (Pomodoro)' },
  { minutos: 30, label: '30 min' },
  { minutos: 45, label: '45 min' },
  { minutos: 50, label: '50 min (Padrão)' },
  { minutos: 60, label: '60 min (1 hora)' },
  { minutos: 90, label: '90 min (1h30)' },
];

/**
 * Calcula os tempos da sessão ativa com precisão de milissegundos
 * 
 * @param {Object|null} sessaoAtiva Objeto de sessão ativa do store
 * @param {number} agora Timestamp atual Date.now()
 * @returns {Object}
 */
export function calcularTemposSessao(sessaoAtiva, agora = Date.now()) {
  if (!sessaoAtiva) {
    return {
      segundosEstudo: 0,
      segundosPausa: 0,
      estudoMs: 0,
      pausaMs: 0,
      tempoRestanteMs: 0,
      tempoRestanteSegundos: 0,
      progressoPercentual: 0,
      blocoConcluido: false,
    };
  }

  // 1. Estudo líquido acumulado
  let estudoMs = Number(sessaoAtiva.acumuladoEstudoMs) || 0;
  if (sessaoAtiva.status === 'rodando' && sessaoAtiva.ultimoInicioIntervalo) {
    estudoMs += Math.max(0, agora - sessaoAtiva.ultimoInicioIntervalo);
  }

  // 2. Tempo de pausa acumulado
  let pausaMs = Number(sessaoAtiva.acumuladoPausaMs) || 0;
  if (sessaoAtiva.status === 'pausado' && sessaoAtiva.ultimoInicioPausa) {
    pausaMs += Math.max(0, agora - sessaoAtiva.ultimoInicioPausa);
  }

  const segundosEstudo = Math.floor(estudoMs / 1000);
  const segundosPausa = Math.floor(pausaMs / 1000);

  let tempoRestanteMs = 0;
  let tempoRestanteSegundos = 0;
  let progressoPercentual = 0;
  let blocoConcluido = false;

  if (sessaoAtiva.modo === 'bloco') {
    const metaMs = (Number(sessaoAtiva.duracaoBlocoMinutos) || 25) * 60 * 1000;
    tempoRestanteMs = Math.max(0, metaMs - estudoMs);
    tempoRestanteSegundos = Math.ceil(tempoRestanteMs / 1000);
    progressoPercentual = metaMs > 0 ? Math.min(100, Math.round((estudoMs / metaMs) * 100)) : 0;
    blocoConcluido = estudoMs >= metaMs;
  }

  return {
    segundosEstudo,
    segundosPausa,
    estudoMs,
    pausaMs,
    tempoRestanteMs,
    tempoRestanteSegundos,
    progressoPercentual,
    blocoConcluido,
  };
}

/**
 * Calcula a porcentagem de acertos em questões
 * 
 * @param {number|string} feitas Quantidade de questões resolvidas
 * @param {number|string} acertos Quantidade de acertos
 * @returns {number} Percentual entre 0 e 100
 */
export function calcularPercentualAcertos(feitas, acertos) {
  const f = Math.max(0, Number(feitas) || 0);
  const a = Math.max(0, Number(acertos) || 0);
  if (f === 0) return 0;
  const taxa = (Math.min(a, f) / f) * 100;
  return Math.round(taxa * 10) / 10;
}
