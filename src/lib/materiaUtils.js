/**
 * Utilitários de cálculo para o modelo de Matérias, Provas e Edital Verticalizado (Fase 1).
 * 
 * Regras:
 * - Prioridade por disciplina: peso × dificuldade × (1 − dominio/100)
 * - Edital verticalizado: cada tópico tem 3 etapas (Teoria, Questões, Revisão).
 * - Total semanal de metas: soma dos minutos de seg a dom.
 */

export const PALETA_CORES_DISCIPLINA = [
  { hex: '#38bdf8', nome: 'Azul Claro' },
  { hex: '#10b981', nome: 'Verde Esmeralda' },
  { hex: '#f97316', nome: 'Laranja' },
  { hex: '#a855f7', nome: 'Roxo / Violeta' },
  { hex: '#06b6d4', nome: 'Ciano' },
  { hex: '#ec4899', nome: 'Rosa' },
  { hex: '#f59e0b', nome: 'Âmbar' },
  { hex: '#6366f1', nome: 'Índigo' },
  { hex: '#14b8a6', nome: 'Turquesa' },
  { hex: '#84cc16', nome: 'Lima' },
  { hex: '#e11d48', nome: 'Rubi' },
  { hex: '#94a3b8', nome: 'Ardósia' },
];

/**
 * Calcula a prioridade da disciplina para o ciclo de estudos
 * Fórmula: peso × dificuldade × (1 − dominio/100)
 * 
 * @param {number} peso 1 a 10
 * @param {number} dificuldade 1 a 5
 * @param {number} dominio 0 a 100 (%)
 * @returns {number} Valor numérico com 2 casas decimais
 */
export function calcularPrioridade(peso, dificuldade, dominio) {
  const p = Math.max(1, Math.min(10, Number(peso) || 1));
  const d = Math.max(1, Math.min(5, Number(dificuldade) || 1));
  const dom = Math.max(0, Math.min(100, Number(dominio) || 0));

  const fatorDeficit = 1 - (dom / 100);
  const prioridade = p * d * fatorDeficit;

  return Math.round(prioridade * 100) / 100;
}

/**
 * Calcula o progresso do edital verticalizado para um conjunto de tópicos
 * Cada tópico tem 3 checkboxes: teoria, questões, revisão.
 * 
 * @param {Array} topicos Lista de tópicos (nível 1 e nível 2)
 * @returns {Object} { totalTopicos, totalEtapas, concluidas, percentual, teoriaConcluidas, questoesConcluidas, revisaoConcluidas }
 */
export function calcularProgressoEdital(topicos = []) {
  const totalTopicos = topicos.length;
  if (totalTopicos === 0) {
    return {
      totalTopicos: 0,
      totalEtapas: 0,
      concluidas: 0,
      percentual: 0,
      teoriaConcluidas: 0,
      questoesConcluidas: 0,
      revisaoConcluidas: 0,
    };
  }

  let teoriaConcluidas = 0;
  let questoesConcluidas = 0;
  let revisaoConcluidas = 0;

  for (const t of topicos) {
    if (t.status?.teoria) teoriaConcluidas += 1;
    if (t.status?.questoes) questoesConcluidas += 1;
    if (t.status?.revisao) revisaoConcluidas += 1;
  }

  // Conclusão oficial do edital leva em conta apenas a TEORIA dos tópicos
  const totalEtapas = totalTopicos;
  const concluidas = teoriaConcluidas;
  const percentual = totalTopicos > 0 ? Math.round((teoriaConcluidas / totalTopicos) * 1000) / 10 : 0;

  return {
    totalTopicos,
    totalEtapas,
    concluidas,
    percentual,
    teoriaConcluidas,
    questoesConcluidas,
    revisaoConcluidas,
  };
}

/**
 * Calcula o progresso geral do edital de uma prova inteira
 */
export function calcularProgressoEditalGeral(disciplinas = [], todosTopicos = []) {
  const discIds = new Set(disciplinas.map((d) => d.id));
  const topicosDaProva = todosTopicos.filter((t) => discIds.has(t.disciplinaId));

  return calcularProgressoEdital(topicosDaProva);
}

/**
 * Calcula o total semanal de minutos de estudo e a média diária
 * 
 * @param {Object} metasDiarias { seg..dom em minutos }
 * @returns {Object} { totalMinutos, totalFormatado, mediaDiariaMinutos, mediaFormatada }
 */
export function calcularMetasSemanais(metasDiarias = {}) {
  const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  let totalMinutos = 0;

  dias.forEach((d) => {
    totalMinutos += Math.max(0, Number(metasDiarias[d]) || 0);
  });

  const horas = Math.floor(totalMinutos / 60);
  const mins = totalMinutos % 60;
  const totalFormatado = mins > 0 ? `${horas}h${String(mins).padStart(2, '0')}` : `${horas}h`;

  const mediaMinutos = Math.round(totalMinutos / 7);
  const mediaHoras = Math.floor(mediaMinutos / 60);
  const mediaMins = mediaMinutos % 60;
  const mediaFormatada = mediaMins > 0 ? `${mediaHoras}h${String(mediaMins).padStart(2, '0')}` : `${mediaHoras}h`;

  return {
    totalMinutos,
    totalFormatado,
    mediaDiariaMinutos: mediaMinutos,
    mediaFormatada,
  };
}
