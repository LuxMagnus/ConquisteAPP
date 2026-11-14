/**
 * Gerador de dados de exemplo para demonstração e testes do Estudaqui.
 * Popula exatamente 1 prova modelo, 4 disciplinas com cores da paleta,
 * tópicos estruturados, sessões de estudo com questões e revisões programadas.
 */

import { SCHEMA_VERSION } from './storage.js';

export function getSampleData() {
  const provaId = 'prova-auditor-rfb';

  // 1. Prova
  const prova = {
    id: provaId,
    nome: 'Auditor-Fiscal da Receita Federal',
    dataProva: '2026-11-20', // Data futura
    metasDiarias: {
      seg: 240, // 4h
      ter: 240, // 4h
      qua: 240, // 4h
      qui: 240, // 4h
      sex: 180, // 3h
      sab: 300, // 5h
      dom: 120, // 2h
    },
  };

  // 2. Quatro Disciplinas
  const disciplinas = [
    {
      id: 'disc-const',
      provaId,
      nome: 'Direito Constitucional',
      cor: '#38bdf8', // Azul claro
      peso: 8,
      dificuldade: 3,
      dominio: 75,
    },
    {
      id: 'disc-admin',
      provaId,
      nome: 'Direito Administrativo',
      cor: '#10b981', // Verde esmeralda
      peso: 9,
      dificuldade: 4,
      dominio: 62,
    },
    {
      id: 'disc-port',
      provaId,
      nome: 'Língua Portuguesa',
      cor: '#f97316', // Laranja vibrante
      peso: 8,
      dificuldade: 3,
      dominio: 80,
    },
    {
      id: 'disc-rlm',
      provaId,
      nome: 'Raciocínio Lógico & Matemática',
      cor: '#a855f7', // Roxo / Violeta
      peso: 6,
      dificuldade: 5,
      dominio: 48,
    },
  ];

  // 3. Tópicos
  const topicos = [
    // Direito Constitucional
    {
      id: 'top-const-1',
      disciplinaId: 'disc-const',
      parentId: null,
      nome: 'Direitos e Garantias Fundamentais (Art. 5º)',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-const-1-1',
      disciplinaId: 'disc-const',
      parentId: 'top-const-1',
      nome: 'Remédios Constitucionais (Habeas Corpus, MS e Mandado de Injunção)',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-const-1-2',
      disciplinaId: 'disc-const',
      parentId: 'top-const-1',
      nome: 'Direito de Propriedade e Desapropriação',
      status: { teoria: true, questoes: false, revisao: false },
    },
    {
      id: 'top-const-2',
      disciplinaId: 'disc-const',
      parentId: null,
      nome: 'Organização do Estado e Repartição de Competências',
      status: { teoria: true, questoes: true, revisao: false },
    },
    {
      id: 'top-const-3',
      disciplinaId: 'disc-const',
      parentId: null,
      nome: 'Controle de Constitucionalidade (Difuso e Concentrado)',
      status: { teoria: true, questoes: false, revisao: false },
    },

    // Direito Administrativo
    {
      id: 'top-admin-1',
      disciplinaId: 'disc-admin',
      parentId: null,
      nome: 'Regime Jurídico dos Atos Administrativos',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-admin-2',
      disciplinaId: 'disc-admin',
      parentId: null,
      nome: 'Nova Lei de Licitações (Lei nº 14.133/2021)',
      status: { teoria: true, questoes: true, revisao: false },
    },
    {
      id: 'top-admin-3',
      disciplinaId: 'disc-admin',
      parentId: null,
      nome: 'Poderes Administrativos e Responsabilidade Civil do Estado',
      status: { teoria: false, questoes: false, revisao: false },
    },

    // Língua Portuguesa
    {
      id: 'top-port-1',
      disciplinaId: 'disc-port',
      parentId: null,
      nome: 'Sintaxe: Concordância Verbal e Nominal',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-port-2',
      disciplinaId: 'disc-port',
      parentId: null,
      nome: 'Emprego do Sinal Indicativo de Crase',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-port-3',
      disciplinaId: 'disc-port',
      parentId: null,
      nome: 'Interpretação e Tipologia Textual',
      status: { teoria: true, questoes: true, revisao: false },
    },

    // RLM
    {
      id: 'top-rlm-1',
      disciplinaId: 'disc-rlm',
      parentId: null,
      nome: 'Lógica Proposicional, Conectivos e Tabelas-Verdade',
      status: { teoria: true, questoes: true, revisao: true },
    },
    {
      id: 'top-rlm-2',
      disciplinaId: 'disc-rlm',
      parentId: null,
      nome: 'Equivalências e Negações Lógicas',
      status: { teoria: true, questoes: true, revisao: false },
    },
    {
      id: 'top-rlm-3',
      disciplinaId: 'disc-rlm',
      parentId: null,
      nome: 'Análise Combinatória e Probabilidade',
      status: { teoria: false, questoes: false, revisao: false },
    },
  ];

  // 4. Sessões de Estudo
  const sessoes = [
    {
      id: 'sess-001',
      disciplinaId: 'disc-const',
      topicoId: 'top-const-1',
      inicioISO: '2026-10-28T09:00:00-03:00',
      segundosEstudo: 4500, // 1h15m
      segundosPausa: 600,
      tipo: 'teoria',
      questoesFeitas: 0,
      questoesAcertos: 0,
      observacao: 'Leitura comentada do Art. 5º da CF/88, incisos I a XXX.',
    },
    {
      id: 'sess-002',
      disciplinaId: 'disc-const',
      topicoId: 'top-const-1',
      inicioISO: '2026-10-28T14:30:00-03:00',
      segundosEstudo: 3600, // 1h
      segundosPausa: 300,
      tipo: 'questoes',
      questoesFeitas: 30,
      questoesAcertos: 26,
      observacao: 'Bateria Cebraspe sobre direitos individuais e remédios constitucionais.',
    },
    {
      id: 'sess-003',
      disciplinaId: 'disc-admin',
      topicoId: 'top-admin-1',
      inicioISO: '2026-10-29T10:15:00-03:00',
      segundosEstudo: 5400, // 1h30m
      segundosPausa: 900,
      tipo: 'teoria',
      questoesFeitas: 0,
      questoesAcertos: 0,
      observacao: 'Atributos e requisitos de validade dos atos administrativos.',
    },
    {
      id: 'sess-004',
      disciplinaId: 'disc-admin',
      topicoId: 'top-admin-1',
      inicioISO: '2026-10-29T15:00:00-03:00',
      segundosEstudo: 3600,
      segundosPausa: 400,
      tipo: 'questoes',
      questoesFeitas: 25,
      questoesAcertos: 21,
      observacao: 'Questões FGV - revogação vs anulação.',
    },
    {
      id: 'sess-005',
      disciplinaId: 'disc-port',
      topicoId: 'top-port-1',
      inicioISO: '2026-10-30T09:30:00-03:00',
      segundosEstudo: 4800, // 1h20m
      segundosPausa: 600,
      tipo: 'questoes',
      questoesFeitas: 40,
      questoesAcertos: 35,
      observacao: 'Concordância verbal com verbos impessoais e sujeito composto.',
    },
    {
      id: 'sess-006',
      disciplinaId: 'disc-rlm',
      topicoId: 'top-rlm-1',
      inicioISO: '2026-10-31T11:00:00-03:00',
      segundosEstudo: 3600,
      segundosPausa: 300,
      tipo: 'revisao',
      questoesFeitas: 20,
      questoesAcertos: 16,
      observacao: 'Revisão das leis de De Morgan e condicional (Se... então).',
    },
  ];

  // 5. Revisões programadas (Espaçadas)
  const revisoes = [
    {
      id: 'rev-001',
      topicoId: 'top-const-1',
      sessaoOrigemId: 'sess-002',
      numero: 1,
      total: 4,
      dataPrevista: '2026-10-29',
      status: 'concluida',
      concluidaEm: '2026-10-29T18:00:00-03:00',
    },
    {
      id: 'rev-002',
      topicoId: 'top-const-1',
      sessaoOrigemId: 'sess-002',
      numero: 2,
      total: 4,
      dataPrevista: '2026-11-05',
      status: 'pendente',
      concluidaEm: null,
    },
    {
      id: 'rev-003',
      topicoId: 'top-admin-1',
      sessaoOrigemId: 'sess-004',
      numero: 1,
      total: 4,
      dataPrevista: '2026-10-30',
      status: 'concluida',
      concluidaEm: '2026-10-30T19:20:00-03:00',
    },
    {
      id: 'rev-004',
      topicoId: 'top-admin-1',
      sessaoOrigemId: 'sess-004',
      numero: 2,
      total: 4,
      dataPrevista: '2026-11-06',
      status: 'pendente',
      concluidaEm: null,
    },
    {
      id: 'rev-005',
      topicoId: 'top-port-1',
      sessaoOrigemId: 'sess-005',
      numero: 1,
      total: 4,
      dataPrevista: '2026-11-02',
      status: 'pendente',
      concluidaEm: null,
    },
  ];

  // 6. Ciclo de Estudos
  const ciclo = {
    id: 'ciclo-principal',
    provaId,
    voltaAtual: 2,
    blocos: [
      { disciplinaId: 'disc-const', minutosMeta: 90, minutosFeitos: 90 },
      { disciplinaId: 'disc-admin', minutosMeta: 90, minutosFeitos: 60 },
      { disciplinaId: 'disc-port', minutosMeta: 75, minutosFeitos: 0 },
      { disciplinaId: 'disc-rlm', minutosMeta: 60, minutosFeitos: 0 },
    ],
  };

  return {
    provas: [prova],
    disciplinas,
    topicos,
    sessoes,
    revisoes,
    ciclos: [ciclo],
    config: {
      schemaVersion: SCHEMA_VERSION,
      geminiApiKey: '',
      alarmeAtivo: true,
      provaAtivaId: provaId,
    },
  };
}
