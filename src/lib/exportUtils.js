/**
 * Utilitários de exportação de dados em CSV (compatível com Excel PT-BR) e JSON.
 */

import { formatarSegundos, formatarDataHora, getDataYMD } from './dateUtils.js';

/**
 * Dispara o download de um arquivo gerado no navegador
 * @param {string} content Conteúdo textual
 * @param {string} filename Nome do arquivo para salvar
 * @param {string} mimeType Tipo MIME
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Escapa valores para CSV delimitado por ponto e vírgula (padrão Brasil/Excel)
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta a lista de sessões de estudo em formato CSV com BOM UTF-8
 */
export function exportarSessoesCSV(sessoes = [], disciplinas = [], topicos = [], provaNome = 'Concurso') {
  // BOM UTF-8 para o Excel reconhecer acentuação em português
  let csv = '\uFEFF';

  // Cabeçalho
  const colunas = [
    'Data',
    'Hora Início',
    'Concurso',
    'Disciplina',
    'Tópico',
    'Tipo de Sessão',
    'Tempo Líquido (min)',
    'Tempo Formatado',
    'Tempo Pausa (min)',
    'Questões Feitas',
    'Questões Acertos',
    'Aproveitamento (%)',
    'Observação',
  ];

  csv += colunas.map(escapeCSV).join(';') + '\r\n';

  // Linhas das sessões
  sessoes.forEach((s) => {
    const disc = disciplinas.find((d) => String(d.id) === String(s.disciplinaId));
    const topico = topicos.find((t) => String(t.id) === String(s.topicoId));
    const ymd = s.inicioISO ? getDataYMD(s.inicioISO) : '';
    const hora = s.inicioISO ? s.inicioISO.slice(11, 16) : '';

    const minutosEstudo = Math.round((Number(s.segundosEstudo) || 0) / 60);
    const minutosPausa = Math.round((Number(s.segundosPausa) || 0) / 60);
    const feitas = Number(s.questoesFeitas) || 0;
    const acertos = Number(s.questoesAcertos) || 0;
    const taxa = feitas > 0 ? Math.round((acertos / feitas) * 100) : '';

    const tipoRotulo = {
      teoria: 'Teoria',
      questoes: 'Questões',
      revisao: 'Revisão',
      simulado: 'Simulado',
    }[s.tipo] || s.tipo || 'Geral';

    const linha = [
      ymd,
      hora,
      provaNome || 'Concurso',
      disc?.nome || s.disciplinaNome || 'Disciplina',
      topico?.nome || s.topicoNome || '',
      tipoRotulo,
      minutosEstudo,
      formatarSegundos(s.segundosEstudo || 0),
      minutosPausa,
      feitas,
      acertos,
      taxa !== '' ? `${taxa}%` : '0%',
      s.observacao || '',
    ];

    csv += linha.map(escapeCSV).join(';') + '\r\n';
  });

  const hojeStr = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `conquiste-sessoes-${hojeStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exporta resumo consolidado por disciplina em CSV
 */
export function exportarResumoDisciplinasCSV(disciplinas = [], sessoes = []) {
  let csv = '\uFEFF';

  const colunas = [
    'Disciplina',
    'Peso',
    'Dificuldade',
    'Domínio Atual (%)',
    'Horas Estudadas (min)',
    'Horas Formatadas',
    'Sessões Executadas',
    'Questões Resolvidas',
    'Questões Acertos',
    'Aproveitamento (%)',
  ];

  csv += colunas.map(escapeCSV).join(';') + '\r\n';

  disciplinas.forEach((d) => {
    const sessoesDaDisc = sessoes.filter((s) => String(s.disciplinaId) === String(d.id));
    const segundos = sessoesDaDisc.reduce((acc, s) => acc + (Number(s.segundosEstudo) || 0), 0);
    const minutos = Math.round(segundos / 60);
    const feitas = sessoesDaDisc.reduce((acc, s) => acc + (Number(s.questoesFeitas) || 0), 0);
    const acertos = sessoesDaDisc.reduce((acc, s) => acc + (Number(s.questoesAcertos) || 0), 0);
    const taxa = feitas > 0 ? Math.round((acertos / feitas) * 100) : 0;

    const linha = [
      d.nome,
      d.peso || 1,
      d.dificuldade || 1,
      `${d.dominio || 0}%`,
      minutos,
      formatarSegundos(segundos),
      sessoesDaDisc.length,
      feitas,
      acertos,
      `${taxa}%`,
    ];

    csv += linha.map(escapeCSV).join(';') + '\r\n';
  });

  const hojeStr = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `conquiste-resumo-disciplinas-${hojeStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exporta todos os dados das estatísticas em JSON
 */
export function exportarEstatisticasJSON(dados = {}) {
  const jsonStr = JSON.stringify(dados, null, 2);
  const hojeStr = new Date().toISOString().slice(0, 10);
  downloadFile(jsonStr, `conquiste-backup-estatisticas-${hojeStr}.json`, 'application/json;charset=utf-8;');
}
