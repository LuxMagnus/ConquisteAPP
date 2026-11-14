/**
 * Utilitários e algoritmos para Gestão e Distribuição do Ciclo de Estudos e Agenda Semanal (Fase 3).
 * 
 * Regras do Modelo:
 * - Ciclo: id, provaId, voltaAtual, blocos [{disciplinaId, minutosMeta, minutosFeitos}]
 * - Distribuição proporcional à prioridade: peso × dificuldade × (1 − dominio/100)
 * - Mínimo de 30 min por disciplina
 * - Máximo de 25% do ciclo por disciplina (quando houver >= 4 disciplinas)
 * - Tamanho da volta configurável (padrão 20h = 1200 min)
 * - Quando todos os blocos fecham, avança a volta e recalcula a prioridade
 */

import { calcularPrioridade } from './materiaUtils.js';
import { getSemanaAtualInfo, isSessaoNaSemana, getDataYMD } from './dateUtils.js';

export const TAMANHO_VOLTA_PADRAO_MINUTOS = 1200; // 20 horas
export const DURACAO_SESSAO_PADRAO_MINUTOS = 60; // 60 minutos (1 hora por sessão)

export const PRESETS_VOLTA_HORAS = [
  { horas: 10, minutos: 600, label: '10 horas' },
  { horas: 15, minutos: 900, label: '15 horas' },
  { horas: 20, minutos: 1200, label: '20 horas (Padrão)' },
  { horas: 25, minutos: 1500, label: '25 horas' },
  { horas: 30, minutos: 1800, label: '30 horas' },
  { horas: 40, minutos: 2400, label: '40 horas' },
];

export const PRESETS_SESSAO_MINUTOS = [
  { minutos: 30, label: '30 min' },
  { minutos: 45, label: '45 min' },
  { minutos: 50, label: '50 min' },
  { minutos: 60, label: '60 min (Padrão)' },
  { minutos: 90, label: '90 min (1h30)' },
  { minutos: 120, label: '120 min (2h)' },
];

/**
 * Algoritmo de intercalação para evitar que a mesma disciplina apareça em blocos consecutivos no ciclo
 * @param {Array<Array>} filasPorDisciplina 
 * @returns {Array} Blocos intercalados
 */
function intercalarBlocos(filasPorDisciplina) {
  const totalBlocos = filasPorDisciplina.reduce((acc, f) => acc + f.length, 0);
  const resultado = [];
  const filas = filasPorDisciplina.map((f) => [...f]);

  let ultimaDiscId = null;

  while (resultado.length < totalBlocos) {
    let melhorIdx = -1;
    let maxRestantes = -1;

    // Prioriza disciplinas que tenham blocos pendentes e sejam diferentes da última adicionada
    for (let i = 0; i < filas.length; i++) {
      if (filas[i].length > 0 && filas[i][0].disciplinaId !== ultimaDiscId) {
        if (filas[i].length > maxRestantes) {
          maxRestantes = filas[i].length;
          melhorIdx = i;
        }
      }
    }

    // Se só restaram blocos da mesma disciplina, usa o que sobrou
    if (melhorIdx === -1) {
      for (let i = 0; i < filas.length; i++) {
        if (filas[i].length > 0) {
          melhorIdx = i;
          break;
        }
      }
    }

    if (melhorIdx !== -1) {
      const proximoBloco = filas[melhorIdx].shift();
      resultado.push(proximoBloco);
      ultimaDiscId = proximoBloco.disciplinaId;
    } else {
      break;
    }
  }

  return resultado;
}

/**
 * Transfere o progresso já estudado da volta anterior para os novos blocos do ciclo de forma contínua
 * @param {Array} novosBlocos 
 * @param {Array} blocosAnteriores 
 * @returns {Array} Blocos com minutosFeitos e concluido preenchidos
 */
export function transferirProgressoCiclo(novosBlocos, blocosAnteriores = []) {
  if (!Array.isArray(blocosAnteriores) || blocosAnteriores.length === 0) {
    return novosBlocos;
  }

  // Agrupa o total de minutos já estudados por cada disciplina na volta atual
  const minutosFeitosPorDisc = {};
  blocosAnteriores.forEach((b) => {
    minutosFeitosPorDisc[b.disciplinaId] =
      (minutosFeitosPorDisc[b.disciplinaId] || 0) + (Number(b.minutosFeitos) || 0);
  });

  const saldoPorDisc = { ...minutosFeitosPorDisc };

  return novosBlocos.map((bloco) => {
    const saldo = saldoPorDisc[bloco.disciplinaId] || 0;
    if (saldo <= 0) {
      return {
        ...bloco,
        minutosFeitos: 0,
        concluido: false,
      };
    }

    const alocar = Math.min(bloco.minutosMeta, saldo);
    saldoPorDisc[bloco.disciplinaId] -= alocar;
    const isConcluido = alocar >= bloco.minutosMeta;

    return {
      ...bloco,
      minutosFeitos: alocar,
      concluido: isConcluido,
    };
  });
}

/**
 * Calcula a distribuição de tempo do ciclo entre as disciplinas proporcionalmente à prioridade
 * e divide em sessões padrão de estudo (ex: 60 minutos), intercalando as matérias na sequência do ciclo.
 * 
 * @param {Object} params
 * @param {Array} params.disciplinas Lista de disciplinas da prova
 * @param {number} params.tamanhoVoltaMinutos Tempo total da volta em minutos (ex: 1200 = 20h)
 * @param {number} params.duracaoSessaoMinutos Duração de cada bloco de sessão (padrão 60 min)
 * @param {boolean} params.modoFracionado Se true (padrão), divide o tempo da matéria pelo tempo da sessão e intercala. Se false, mantém 1 bloco único por matéria.
 * @param {Object} [params.porcentagensManuais] Mapa opcional { [disciplinaId]: number } para sobrepor manualmente a fórmula da distribuição
 * @returns {Array} Lista de blocos do ciclo
 */
export function calcularDistribuicaoCiclo({
  disciplinas = [],
  tamanhoVoltaMinutos = TAMANHO_VOLTA_PADRAO_MINUTOS,
  duracaoSessaoMinutos = DURACAO_SESSAO_PADRAO_MINUTOS,
  modoFracionado = true,
  porcentagensManuais = null,
}) {
  if (!Array.isArray(disciplinas) || disciplinas.length === 0) {
    return [];
  }

  const n = disciplinas.length;
  const minMinutos = 30;

  // Garante que o total da volta comporte ao menos o piso de 30 min por disciplina
  const totalMinutos = Math.max(n * minMinutos, Number(tamanhoVoltaMinutos) || TAMANHO_VOLTA_PADRAO_MINUTOS);

  // Mapeia disciplinas para acesso rápido
  const discMap = {};
  disciplinas.forEach((d) => {
    discMap[d.id] = d;
  });

  // Verifica se há porcentagens manuais válidas fornecidas pelo usuário
  const temManual =
    porcentagensManuais &&
    typeof porcentagensManuais === 'object' &&
    disciplinas.some((d) => Number(porcentagensManuais[d.id]) > 0);

  let totaisPorMateria = [];

  if (temManual) {
    // ==========================================
    // RECURSO: SOBREPOSIÇÃO MANUAL DE % DO CICLO
    // ==========================================
    const somaManuais = disciplinas.reduce((acc, d) => {
      const pct = Number(porcentagensManuais[d.id]);
      return acc + (isNaN(pct) || pct < 0 ? 0 : pct);
    }, 0);

    const somaEfetiva = somaManuais > 0 ? somaManuais : 100;

    totaisPorMateria = disciplinas.map((d) => {
      const pctManual = Number(porcentagensManuais[d.id]);
      const valorPct = !isNaN(pctManual) && pctManual > 0 ? pctManual : 100 / n;
      const fracao = valorPct / somaEfetiva;
      const rawMinutos = fracao * totalMinutos;
      // Arredonda para múltiplos de 5 min respeitando mínimo de 15 minutos
      const arredondado = Math.max(15, Math.round(rawMinutos / 5) * 5);

      return {
        disciplinaId: d.id,
        minutosMetaTotal: arredondado,
        prioridade: valorPct,
        disciplina: d,
      };
    });

    // Ajusta a diferença residual para fechar com exatidão em totalMinutos
    let somaAtual = totaisPorMateria.reduce((acc, b) => acc + b.minutosMetaTotal, 0);
    let residuo = totalMinutos - somaAtual;
    let passos = 0;

    while (residuo !== 0 && passos < 50) {
      passos++;
      const step = residuo > 0 ? 5 : -5;
      if (residuo > 0) {
        totaisPorMateria[0].minutosMetaTotal += step;
        residuo -= step;
      } else {
        const canReduce = totaisPorMateria.find((b) => b.minutosMetaTotal - 5 >= 15);
        if (canReduce) {
          canReduce.minutosMetaTotal -= 5;
          residuo += 5;
        } else {
          totaisPorMateria[0].minutosMetaTotal += residuo;
          residuo = 0;
        }
      }
    }
  } else {
    // ==========================================
    // MODO PADRÃO: FÓRMULA AUTOMÁTICA
    // peso × dificuldade × (1 − domínio/100)
    // ==========================================
    const maxMinutos = n >= 5
      ? Math.floor(totalMinutos * 0.25)
      : n === 4
      ? Math.floor(totalMinutos * 0.40)
      : n === 3
      ? Math.floor(totalMinutos * 0.50)
      : totalMinutos;

    // 1. Calcula prioridade individual de cada disciplina
    const listaPrioridades = disciplinas.map((d) => {
      let prio = calcularPrioridade(d.peso, d.dificuldade, d.dominio);
      if (prio <= 0) {
        prio = (Number(d.peso) || 1) * (Number(d.dificuldade) || 1) * 0.05;
      }
      return {
        disciplinaId: d.id,
        peso: Number(d.peso) || 1,
        dificuldade: Number(d.dificuldade) || 1,
        dominio: Number(d.dominio) || 0,
        prioridade: Math.max(0.01, prio),
        disciplina: d,
      };
    });

    // 2. Algoritmo iterativo de fixação de limites (bounded proportional distribution)
    let alocados = {};
    let livres = [...listaPrioridades];
    let tempoRestante = totalMinutos;

    let convergiu = false;
    let iteracoes = 0;

    while (!convergiu && livres.length > 0 && iteracoes < 20) {
      iteracoes++;
      convergiu = true;
      const somaPrioLivres = livres.reduce((acc, item) => acc + item.prioridade, 0);
      const toFix = [];

      for (const item of livres) {
        const fracao = somaPrioLivres > 0 ? item.prioridade / somaPrioLivres : 1 / livres.length;
        const proposta = fracao * tempoRestante;

        if (proposta < minMinutos) {
          alocados[item.disciplinaId] = minMinutos;
          tempoRestante -= minMinutos;
          toFix.push(item.disciplinaId);
          convergiu = false;
        } else if (proposta > maxMinutos) {
          alocados[item.disciplinaId] = maxMinutos;
          tempoRestante -= maxMinutos;
          toFix.push(item.disciplinaId);
          convergiu = false;
        }
      }

      if (!convergiu) {
        livres = livres.filter((item) => !toFix.includes(item.disciplinaId));
      }
    }

    // Distribui o saldo restante para os que não bateram nos limites
    if (livres.length > 0) {
      const somaPrioLivres = livres.reduce((acc, item) => acc + item.prioridade, 0);
      for (const item of livres) {
        const fracao = somaPrioLivres > 0 ? item.prioridade / somaPrioLivres : 1 / livres.length;
        alocados[item.disciplinaId] = fracao * tempoRestante;
      }
    }

    // 3. Arredonda para múltiplos de 5 minutos respeitando estritamente [minMinutos, maxMinutos]
    totaisPorMateria = listaPrioridades.map((item) => {
      let raw = alocados[item.disciplinaId] ?? minMinutos;
      let arredondado = Math.round(raw / 5) * 5;
      arredondado = Math.max(minMinutos, Math.min(maxMinutos, arredondado));
      return {
        disciplinaId: item.disciplinaId,
        minutosMetaTotal: arredondado,
        prioridade: item.prioridade,
        disciplina: item.disciplina,
      };
    });

    // 4. Ajusta a diferença residual de arredondamento para fechar exatamente no totalMinutos
    let somaAtual = totaisPorMateria.reduce((acc, b) => acc + b.minutosMetaTotal, 0);
    let residuo = totalMinutos - somaAtual;

    let passos = 0;
    while (residuo !== 0 && passos < 100) {
      passos++;
      const step = residuo > 0 ? 5 : -5;

      if (residuo > 0) {
        const candidatos = totaisPorMateria
          .filter((b) => b.minutosMetaTotal + step <= maxMinutos)
          .sort((a, b) => b.prioridade - a.prioridade);

        if (candidatos.length > 0) {
          candidatos[0].minutosMetaTotal += step;
          residuo -= step;
        } else {
          totaisPorMateria[0].minutosMetaTotal += residuo;
          residuo = 0;
        }
      } else {
        const candidatos = totaisPorMateria
          .filter((b) => b.minutosMetaTotal + step >= minMinutos)
          .sort((a, b) => a.prioridade - b.prioridade);

        if (candidatos.length > 0) {
          candidatos[0].minutosMetaTotal += step;
          residuo -= step;
        } else {
          totaisPorMateria[0].minutosMetaTotal += residuo;
          residuo = 0;
        }
      }
    }
  }

  // Ordena por prioridade decrescente
  totaisPorMateria.sort((a, b) => b.prioridade - a.prioridade);

  // SE MODO FRACIONADO FOR FALSO (OPÇÃO LEGADA): 1 bloco único contínuo por matéria
  if (!modoFracionado) {
    return totaisPorMateria.map((item, idx) => {
      const d = discMap[item.disciplinaId];
      return {
        id: `bloco-${item.disciplinaId}-${idx + 1}-${Date.now()}`,
        disciplinaId: item.disciplinaId,
        disciplinaNome: d?.nome || 'Disciplina',
        cor: d?.cor || '#38bdf8',
        minutosMeta: item.minutosMetaTotal,
        minutosFeitos: 0,
        concluido: false,
        sessaoNumero: 1,
        sessaoTotal: 1,
        minutosMetaTotalMateria: item.minutosMetaTotal,
        prioridade: item.prioridade,
      };
    });
  }

  // MODO FRACIONADO E INTERCALADO (PADRÃO / RECOMENDADO):
  const sessaoMin = Math.max(15, Math.min(240, Number(duracaoSessaoMinutos) || DURACAO_SESSAO_PADRAO_MINUTOS));

  const filasPorDisciplina = totaisPorMateria.map((item) => {
    const total = item.minutosMetaTotal;
    const d = discMap[item.disciplinaId];
    const duracoes = [];
    let remaining = total;

    while (remaining > 0) {
      if (remaining >= sessaoMin * 1.5) {
        duracoes.push(sessaoMin);
        remaining -= sessaoMin;
      } else if (remaining > sessaoMin) {
        const p1 = Math.round((remaining / 2) / 5) * 5;
        const p2 = remaining - p1;
        duracoes.push(p1);
        duracoes.push(p2);
        remaining = 0;
      } else {
        duracoes.push(remaining);
        remaining = 0;
      }
    }

    const totalSessoes = duracoes.length;
    return duracoes.map((dur, sIdx) => ({
      id: `bloco-${item.disciplinaId}-${sIdx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      disciplinaId: item.disciplinaId,
      disciplinaNome: d?.nome || 'Disciplina',
      cor: d?.cor || '#38bdf8',
      minutosMeta: dur,
      minutosFeitos: 0,
      concluido: false,
      sessaoNumero: sIdx + 1,
      sessaoTotal: totalSessoes,
      minutosMetaTotalMateria: total,
      prioridade: item.prioridade,
    }));
  });

  // Intercala os blocos de modo a alternar as matérias harmoniosamente no ciclo
  return intercalarBlocos(filasPorDisciplina);
}

/**
 * Agrupa todas as sessões/blocos de uma mesma matéria no ciclo para fornecer
 * uma visão concisa e a real porcentagem ocupada no ciclo completo.
 * 
 * @param {Object} ciclo Objeto Ciclo de estudos ativo
 * @param {Array} disciplinas Lista de disciplinas da prova
 * @returns {Array} Lista agregada por disciplina ordenada por tempo desc
 */
export function agruparMateriasCiclo(ciclo, disciplinas = []) {
  if (!ciclo || !Array.isArray(ciclo.blocos) || ciclo.blocos.length === 0) {
    return [];
  }

  const totalMinutosCiclo = ciclo.blocos.reduce((acc, b) => acc + (Number(b.minutosMeta) || 0), 0);
  const mapa = {};

  ciclo.blocos.forEach((bloco) => {
    const discId = bloco.disciplinaId;
    const meta = Number(bloco.minutosMeta) || 0;
    const feitos = Number(bloco.minutosFeitos) || 0;
    const isConcluido = Boolean(bloco.concluido) || feitos >= meta;

    if (!mapa[discId]) {
      const disc = disciplinas.find((d) => String(d.id) === String(discId));
      mapa[discId] = {
        disciplinaId: discId,
        nome: disc?.nome || bloco.disciplinaNome || bloco.materiaNome || bloco.nome || 'Disciplina',
        cor: disc?.cor || bloco.cor || '#38bdf8',
        peso: disc?.peso,
        dificuldade: disc?.dificuldade,
        dominio: disc?.dominio,
        ativa: disc ? disc.ativa !== false : true,
        minutosMetaTotal: 0,
        minutosFeitosTotal: 0,
        sessoesTotal: 0,
        sessoesConcluidas: 0,
        sessoes: [],
        isManual: Boolean(
          ciclo?.porcentagensManuais &&
          ciclo.porcentagensManuais[discId] !== undefined &&
          ciclo.porcentagensManuais[discId] !== null
        ),
        percentualManualDefinido: ciclo?.porcentagensManuais?.[discId] ?? null,
      };
    }

    mapa[discId].minutosMetaTotal += meta;
    mapa[discId].minutosFeitosTotal += feitos;
    mapa[discId].sessoesTotal += 1;
    if (isConcluido) {
      mapa[discId].sessoesConcluidas += 1;
    }
    mapa[discId].sessoes.push(bloco);
  });

  return Object.values(mapa).map((item) => {
    const shareCiclo = totalMinutosCiclo > 0
      ? Math.round((item.minutosMetaTotal / totalMinutosCiclo) * 100)
      : 0;
    const shareCicloExato = totalMinutosCiclo > 0
      ? Number(((item.minutosMetaTotal / totalMinutosCiclo) * 100).toFixed(1))
      : 0;
    const pctConcluido = item.minutosMetaTotal > 0
      ? Math.min(100, Math.round((item.minutosFeitosTotal / item.minutosMetaTotal) * 100))
      : 0;
    const isConcluido = item.sessoesConcluidas === item.sessoesTotal && item.sessoesTotal > 0;

    return {
      ...item,
      shareCiclo,
      shareCicloExato,
      pctConcluido,
      isConcluido,
    };
  }).sort((a, b) => b.minutosMetaTotal - a.minutosMetaTotal);
}

/**
 * Identifica a próxima matéria recomendada no ciclo (o primeiro bloco pendente)
 * 
 * @param {Object} ciclo Objeto Ciclo ativo
 * @param {Array} disciplinas Lista de disciplinas
 * @param {Array} topicos Lista de tópicos (opcional para sugerir tópico pendente)
 * @returns {Object|null} { disciplina, bloco, faltamMinutos, percentualConcluido, topicoSugerido }
 */
export function sugerirProximaMateria(ciclo, disciplinas = [], topicos = []) {
  if (!ciclo || !Array.isArray(ciclo.blocos) || ciclo.blocos.length === 0) {
    if (disciplinas.length > 0) {
      return {
        disciplina: disciplinas[0],
        bloco: null,
        faltamMinutos: 60,
        percentualConcluido: 0,
        topicoSugerido: topicos.find((t) => t.disciplinaId === disciplinas[0].id) || null,
        isNovoCiclo: true,
      };
    }
    return null;
  }

  // 1. Procura o primeiro bloco que ainda não fechou sua meta nem foi concluído e cuja disciplina esteja ativa
  let blocoPendente = ciclo.blocos.find((b) => {
    const d = disciplinas.find((disc) => disc.id === b.disciplinaId);
    return d && d.ativa !== false && !b.concluido && (b.minutosFeitos || 0) < b.minutosMeta;
  });

  // Se todos os blocos já estão concluídos, sugere o primeiro bloco ativo para nova volta
  if (!blocoPendente) {
    blocoPendente = ciclo.blocos.find((b) => {
      const d = disciplinas.find((disc) => disc.id === b.disciplinaId);
      return d && d.ativa !== false;
    }) || ciclo.blocos[0];
  }

  const disciplina = disciplinas.find((d) => d.id === blocoPendente?.disciplinaId && d.ativa !== false);
  if (!disciplina) return null;

  const minutosFeitos = blocoPendente.minutosFeitos || 0;
  const minutosMeta = blocoPendente.minutosMeta || 60;
  const faltamMinutos = Math.max(0, minutosMeta - minutosFeitos);
  const percentualConcluido = Math.min(100, Math.round((minutosFeitos / minutosMeta) * 100));

  // Prioriza o último tópico estudado com seu ponto de parada; caso contrário, primeiro tópico pendente
  const topicosDaDisc = topicos.filter((t) => t.disciplinaId === disciplina.id);
  const ultimoTopico = disciplina.ultimoTopicoId
    ? topicosDaDisc.find((t) => t.id === disciplina.ultimoTopicoId)
    : null;
  const topicoSugerido =
    ultimoTopico ||
    topicosDaDisc.find((t) => !t.status?.teoria || !t.status?.questoes || !t.status?.revisao) ||
    topicosDaDisc[0] ||
    null;

  return {
    disciplina,
    bloco: blocoPendente,
    faltamMinutos,
    percentualConcluido,
    topicoSugerido,
    pontoDeParadaSugerido: disciplina.ultimoPontoDeParada || null,
    isCompleto: Boolean(blocoPendente.concluido) || minutosFeitos >= minutosMeta,
  };
}

/**
 * Calcula o progresso quantitativo do ciclo ativo
 * 
 * @param {Object} ciclo Objeto Ciclo
 * @returns {Object} { minutosMetaTotal, minutosFeitosTotal, percentual, totalBlocos, blocosConcluidos, isVoltaCompleta }
 */
export function calcularProgressoCiclo(ciclo) {
  if (!ciclo || !Array.isArray(ciclo.blocos) || ciclo.blocos.length === 0) {
    return {
      minutosMetaTotal: 0,
      minutosFeitosTotal: 0,
      percentual: 0,
      totalBlocos: 0,
      blocosConcluidos: 0,
      isVoltaCompleta: false,
    };
  }

  let minutosMetaTotal = 0;
  let minutosFeitosTotal = 0;
  let blocosConcluidos = 0;

  for (const b of ciclo.blocos) {
    const meta = Number(b.minutosMeta) || 0;
    const feitos = Number(b.minutosFeitos) || 0;
    minutosMetaTotal += meta;
    // O progresso computa o tempo feito (limitado ou total)
    minutosFeitosTotal += feitos;
    if (b.concluido || feitos >= meta) {
      blocosConcluidos += 1;
    }
  }

  const percentual = minutosMetaTotal > 0
    ? Math.min(100, Math.round((minutosFeitosTotal / minutosMetaTotal) * 100))
    : 0;

  const isVoltaCompleta = blocosConcluidos === ciclo.blocos.length && ciclo.blocos.length > 0;

  return {
    minutosMetaTotal,
    minutosFeitosTotal,
    percentual,
    totalBlocos: ciclo.blocos.length,
    blocosConcluidos,
    isVoltaCompleta,
  };
}

/**
 * Consolida as métricas semanais de estudo (SEG–DOM) comparando sessões reais vs metas diárias
 * 
 * @param {Object} params
 * @param {Array} params.sessoes Todas as sessões salvas
 * @param {Object} params.metasDiarias { seg..dom em minutos }
 * @param {Array} params.disciplinas Lista de disciplinas
 * @param {string} params.referenciaISO Data de referência
 * @returns {Object} Informações completas da semana
 */
export function calcularProgressoSemanalDetalhado({
  sessoes = [],
  metasDiarias = {},
  disciplinas = [],
  referenciaISO,
}) {
  const semanaInfo = getSemanaAtualInfo(referenciaISO);
  const { inicioSegunda, fimDomingo, dias, hojeYMD, hojeKey } = semanaInfo;

  // Filtra as sessões pertencentes a esta semana
  const sessoesDaSemana = sessoes.filter((s) =>
    isSessaoNaSemana(s.inicioISO, inicioSegunda, fimDomingo)
  );

  let totalEstudadoMinutos = 0;
  let totalMetaMinutos = 0;

  // Computa métricas para cada um dos 7 dias
  const diasProgresso = dias.map((diaItem) => {
    const metaDoDia = Math.max(0, Number(metasDiarias[diaItem.key]) || 0);
    totalMetaMinutos += metaDoDia;

    // Sessões deste dia específico
    const sessoesDoDia = sessoesDaSemana.filter((s) => {
      const ymd = getDataYMD(s.inicioISO);
      return ymd === diaItem.dataYMD;
    });

    const minutosEstudados = sessoesDoDia.reduce((acc, s) => {
      return acc + Math.round((Number(s.segundosEstudo) || 0) / 60);
    }, 0);

    totalEstudadoMinutos += minutosEstudados;

    const percentual = metaDoDia > 0
      ? Math.round((minutosEstudados / metaDoDia) * 100)
      : minutosEstudados > 0 ? 100 : 0;

    const atingiuMeta = metaDoDia > 0 ? minutosEstudados >= metaDoDia : minutosEstudados > 0;

    return {
      ...diaItem,
      metaMinutos: metaDoDia,
      estudadoMinutos: minutosEstudados,
      percentual,
      atingiuMeta,
      sessoes: sessoesDoDia.map((s) => {
        const disc = disciplinas.find((d) => d.id === s.disciplinaId);
        return {
          ...s,
          disciplinaNome: disc?.nome || 'Disciplina',
          disciplinaCor: disc?.cor || '#38bdf8',
          minutos: Math.round((s.segundosEstudo || 0) / 60),
        };
      }),
    };
  });

  const percentualSemana = totalMetaMinutos > 0
    ? Math.round((totalEstudadoMinutos / totalMetaMinutos) * 100)
    : 0;

  const restanteSemanaMinutos = Math.max(0, totalMetaMinutos - totalEstudadoMinutos);

  // Média diária realizada nos dias da semana
  const mediaDiariaMinutos = Math.round(totalEstudadoMinutos / 7);

  return {
    inicioSegunda,
    fimDomingo,
    diasProgresso,
    hojeKey,
    hojeYMD,
    totalEstudadoMinutos,
    totalMetaMinutos,
    percentualSemana,
    restanteSemanaMinutos,
    mediaDiariaMinutos,
    totalSessoesNaSemana: sessoesDaSemana.length,
  };
}
