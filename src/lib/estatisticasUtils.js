/**
 * Utilitários de cálculo e agregação para a tela de Estatísticas (Fase 5).
 * 
 * Regras:
 * - Datas no modelo sempre em ISO 8601, fuso America/Fortaleza (UTC-3).
 * - A semana começa na segunda-feira.
 * - Dia estudado para o mapa de calor = pelo menos 15 minutos (900 segundos).
 * - Ranking de assuntos do pior para o melhor com filtro mínimo de 10 questões.
 */

import { getDataYMD, getDiaSemanaKey, formatarMinutosHoras, TIMEZONE } from './dateUtils.js';

const SEGUNDOS_MINIMOS_DIA_ESTUDADO = 15 * 60; // 15 minutos = 900s

/**
 * Converte data ISO ou string YMD para número de dia do ano
 */
function getDiasNoMes(ano, mes) {
  // mes de 0 a 11
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * Retorna o número da semana ISO (1 a 53) e o ano da semana
 */
export function getISOWeek(dateObj) {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

/**
 * Agrupa sessões por dia, semana, mês ou ano com linha de meta e flag de superação
 * 
 * @param {Array} sessoes Lista de sessões
 * @param {string} periodo 'dia' | 'semana' | 'mes' | 'ano'
 * @param {Object} metasDiarias { seg..dom em minutos }
 * @param {Date} dataReferencia Data base (default hoje)
 * @returns {Object} { dados, metaReferencia, metaMedia, periodoInfo, totalSegundos, totalHoras }
 */
export function calcularDadosHorasPeriodo(
  sessoes = [],
  periodo = 'semana',
  metasDiarias = {},
  dataReferencia = new Date(),
  options = {}
) {
  const metaSegunda = metasDiarias?.seg ?? 240;
  const metaTerca = metasDiarias?.ter ?? 240;
  const metaQuarta = metasDiarias?.qua ?? 240;
  const metaQuinta = metasDiarias?.qui ?? 240;
  const metaSexta = metasDiarias?.sex ?? 180;
  const metaSabado = metasDiarias?.sab ?? 300;
  const metaDomingo = metasDiarias?.dom ?? 120;

  const metaSemanalMinutos =
    metaSegunda + metaTerca + metaQuarta + metaQuinta + metaSexta + metaSabado + metaDomingo;
  const metaDiariaMediaMinutos = Math.round(metaSemanalMinutos / 7);
  const metaDiariaMediaHoras = Number((metaDiariaMediaMinutos / 60).toFixed(1));

  // Mapa rápido de sessões por YYYY-MM-DD
  const segundosPorDia = {};
  const questoesPorDia = {};
  const sessoesPorDia = {};

  sessoes.forEach((s) => {
    const ymd = getDataYMD(s.inicioISO);
    segundosPorDia[ymd] = (segundosPorDia[ymd] || 0) + (s.segundosEstudo || 0);
    questoesPorDia[ymd] = (questoesPorDia[ymd] || 0) + (s.questoesFeitas || 0);
    sessoesPorDia[ymd] = (sessoesPorDia[ymd] || 0) + 1;
  });

  // Ano e Mês de referência
  const refYMD = getDataYMD(dataReferencia.toISOString());
  const [refAno, refMes, refDia] = refYMD.split('-').map(Number);

  const nomesAbrev = {
    seg: 'Seg',
    ter: 'Ter',
    qua: 'Qua',
    qui: 'Qui',
    sex: 'Sex',
    sab: 'Sáb',
    dom: 'Dom',
  };

  // Se período for '7d' ou options.filtroPeriodo === '7d' quando em modo dia
  if (periodo === '7d') {
    // Últimos 7 dias terminando hoje (ou na dataReferencia)
    const hojeUtc = new Date(Date.UTC(refAno, refMes - 1, refDia));
    const dados = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hojeUtc.getTime() - i * 86400000);
      const ymd = d.toISOString().slice(0, 10);
      const [y, m, dia] = ymd.split('-');
      const dayKey = getDiaSemanaKey(d.toISOString());
      const segundos = segundosPorDia[ymd] || 0;
      const horas = Number((segundos / 3600).toFixed(2));
      const minutos = Math.round(segundos / 60);
      const metaMin = Number(metasDiarias?.[dayKey]) || 0;
      const metaH = Number((metaMin / 60).toFixed(2));
      const superou = metaH > 0 && horas >= metaH;

      dados.push({
        key: ymd,
        dataYMD: ymd,
        label: `${nomesAbrev[dayKey] || ''} ${dia}/${m}`,
        labelCurto: `${dia}/${m}`,
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaH,
        metaMinutos: metaMin,
        superou,
        questoes: questoesPorDia[ymd] || 0,
        sessoesQtd: sessoesPorDia[ymd] || 0,
      });
    }

    const totalSegundos = dados.reduce((acc, d) => acc + d.minutos * 60, 0);

    return {
      periodo: '7d',
      dados,
      metaReferenciaHoras: metaDiariaMediaHoras,
      metaLabel: `Média diária (${metaDiariaMediaHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: `${dados[0].label} a ${dados[6].label}`,
    };
  }

  // Se período for '30d'
  if (periodo === '30d') {
    // Últimos 30 dias terminando hoje
    const hojeUtc = new Date(Date.UTC(refAno, refMes - 1, refDia));
    const dados = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(hojeUtc.getTime() - i * 86400000);
      const ymd = d.toISOString().slice(0, 10);
      const [y, m, dia] = ymd.split('-');
      const dayKey = getDiaSemanaKey(d.toISOString());
      const segundos = segundosPorDia[ymd] || 0;
      const horas = Number((segundos / 3600).toFixed(2));
      const minutos = Math.round(segundos / 60);
      const metaMin = Number(metasDiarias?.[dayKey]) || 0;
      const metaH = Number((metaMin / 60).toFixed(2));
      const superou = metaH > 0 && horas >= metaH;

      dados.push({
        key: ymd,
        dataYMD: ymd,
        label: `${dia}/${m}`,
        labelCurto: `${dia}/${m}`,
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaH,
        metaMinutos: metaMin,
        superou,
        questoes: questoesPorDia[ymd] || 0,
        sessoesQtd: sessoesPorDia[ymd] || 0,
      });
    }

    const totalSegundos = dados.reduce((acc, d) => acc + d.minutos * 60, 0);

    return {
      periodo: '30d',
      dados,
      metaReferenciaHoras: metaDiariaMediaHoras,
      metaLabel: `Média diária (${metaDiariaMediaHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: `Últimos 30 dias (${dados[0].label} a ${dados[29].label})`,
    };
  }

  // Se período for 'personalizado' e tiver datas
  if (periodo === 'personalizado' && (options.dataInicio || options.dataFim)) {
    const dInicio = options.dataInicio
      ? new Date(`${options.dataInicio}T00:00:00Z`)
      : new Date(Date.UTC(refAno, refMes - 1, 1));
    const dFim = options.dataFim
      ? new Date(`${options.dataFim}T00:00:00Z`)
      : new Date(Date.UTC(refAno, refMes - 1, refDia));

    const dados = [];
    let cur = new Date(dInicio.getTime());
    const limit = Math.min(dFim.getTime(), dInicio.getTime() + 90 * 86400000); // max 90 dias

    while (cur.getTime() <= limit) {
      const ymd = cur.toISOString().slice(0, 10);
      const [y, m, dia] = ymd.split('-');
      const dayKey = getDiaSemanaKey(cur.toISOString());
      const segundos = segundosPorDia[ymd] || 0;
      const horas = Number((segundos / 3600).toFixed(2));
      const minutos = Math.round(segundos / 60);
      const metaMin = Number(metasDiarias?.[dayKey]) || 0;
      const metaH = Number((metaMin / 60).toFixed(2));
      const superou = metaH > 0 && horas >= metaH;

      dados.push({
        key: ymd,
        dataYMD: ymd,
        label: `${dia}/${m}`,
        labelCurto: `${dia}/${m}`,
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaH,
        metaMinutos: metaMin,
        superou,
        questoes: questoesPorDia[ymd] || 0,
        sessoesQtd: sessoesPorDia[ymd] || 0,
      });

      cur = new Date(cur.getTime() + 86400000);
    }

    const totalSegundos = dados.reduce((acc, d) => acc + d.minutos * 60, 0);

    return {
      periodo: 'personalizado',
      dados,
      metaReferenciaHoras: metaDiariaMediaHoras,
      metaLabel: `Média diária (${metaDiariaMediaHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: `${options.dataInicio || ''} a ${options.dataFim || ''}`,
    };
  }

  if (periodo === 'dia') {
    // Exibe os 7 dias da semana de dataReferencia (Segunda a Domingo)
    const refUtc = new Date(Date.UTC(refAno, refMes - 1, refDia));
    const dayOfWeek = getDiaSemanaKey(dataReferencia.toISOString());
    const diasKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const idxDay = diasKeys.indexOf(dayOfWeek);

    const segUtc = new Date(refUtc.getTime() - idxDay * 86400000);

    const dados = diasKeys.map((key, i) => {
      const d = new Date(segUtc.getTime() + i * 86400000);
      const ymd = d.toISOString().slice(0, 10);
      const [y, m, dia] = ymd.split('-');
      const segundos = segundosPorDia[ymd] || 0;
      const horas = Number((segundos / 3600).toFixed(2));
      const minutos = Math.round(segundos / 60);
      const metaMin = Number(metasDiarias?.[key]) || 0;
      const metaH = Number((metaMin / 60).toFixed(2));
      const superou = metaH > 0 && horas >= metaH;

      return {
        key,
        dataYMD: ymd,
        label: `${nomesAbrev[key]} ${dia}/${m}`,
        labelCurto: nomesAbrev[key],
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaH,
        metaMinutos: metaMin,
        superou,
        questoes: questoesPorDia[ymd] || 0,
        sessoesQtd: sessoesPorDia[ymd] || 0,
      };
    });

    const totalSegundos = dados.reduce((acc, d) => acc + d.minutos * 60, 0);

    return {
      periodo: 'dia',
      dados,
      metaReferenciaHoras: metaDiariaMediaHoras,
      metaLabel: `Média diária (${metaDiariaMediaHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: `${dados[0].label} a ${dados[6].label}`,
    };
  }

  if (periodo === 'semana') {
    // Exibe as 8 semanas terminando na semana da dataReferencia
    const semanas = [];
    const hojeUtc = new Date(Date.UTC(refAno, refMes - 1, refDia));
    const dayOfWeek = getDiaSemanaKey(dataReferencia.toISOString());
    const diasKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const idxDay = diasKeys.indexOf(dayOfWeek);
    // Segunda-feira da semana de referência
    const segAtual = new Date(hojeUtc.getTime() - idxDay * 86400000);

    const metaSemanalHoras = Number((metaSemanalMinutos / 60).toFixed(1));

    for (let w = 7; w >= 0; w--) {
      const segSemana = new Date(segAtual.getTime() - w * 7 * 86400000);
      const domSemana = new Date(segSemana.getTime() + 6 * 86400000);

      const inicioYMD = segSemana.toISOString().slice(0, 10);
      const fimYMD = domSemana.toISOString().slice(0, 10);

      let segundosSemana = 0;
      let questoesSemana = 0;
      let sessoesSemana = 0;

      for (let d = 0; d < 7; d++) {
        const cur = new Date(segSemana.getTime() + d * 86400000);
        const ymd = cur.toISOString().slice(0, 10);
        segundosSemana += segundosPorDia[ymd] || 0;
        questoesSemana += questoesPorDia[ymd] || 0;
        sessoesSemana += sessoesPorDia[ymd] || 0;
      }

      const horas = Number((segundosSemana / 3600).toFixed(2));
      const minutos = Math.round(segundosSemana / 60);
      const superou = metaSemanalHoras > 0 && horas >= metaSemanalHoras;
      const isoW = getISOWeek(segSemana);

      const iniFmt = `${inicioYMD.slice(8, 10)}/${inicioYMD.slice(5, 7)}`;
      const fimFmt = `${fimYMD.slice(8, 10)}/${fimYMD.slice(5, 7)}`;

      semanas.push({
        key: `sem-${isoW.week}`,
        label: `Sem ${isoW.week} (${iniFmt})`,
        labelCurto: `S${isoW.week}`,
        intervalo: `${iniFmt} a ${fimFmt}`,
        inicioYMD,
        fimYMD,
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaSemanalHoras,
        superou,
        questoes: questoesSemana,
        sessoesQtd: sessoesSemana,
      });
    }

    const totalSegundos = semanas.reduce((acc, s) => acc + s.minutos * 60, 0);

    return {
      periodo: 'semana',
      dados: semanas,
      metaReferenciaHoras: metaSemanalHoras,
      metaLabel: `Meta semanal (${metaSemanalHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: 'Últimas 8 semanas',
    };
  }

  if (periodo === 'mes') {
    // Exibe os 12 meses do ano de dataReferencia
    const mesesNomes = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const mesesCompletos = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    const metaMediaMensalMin = (metaSemanalMinutos / 7) * 30.4;
    const metaMediaMensalHoras = Number((metaMediaMensalMin / 60).toFixed(1));

    const meses = mesesNomes.map((mesAbrev, mIdx) => {
      const mesStr = String(mIdx + 1).padStart(2, '0');
      const prefixo = `${refAno}-${mesStr}`;
      const diasMes = getDiasNoMes(refAno, mIdx);

      // Meta proporcional aos dias do mês
      const metaMesHoras = Number((((metaSemanalMinutos / 7) * diasMes) / 60).toFixed(1));

      let segundosMes = 0;
      let questoesMes = 0;
      let sessoesMes = 0;

      Object.keys(segundosPorDia).forEach((ymd) => {
        if (ymd.startsWith(prefixo)) {
          segundosMes += segundosPorDia[ymd] || 0;
          questoesMes += questoesPorDia[ymd] || 0;
          sessoesMes += sessoesPorDia[ymd] || 0;
        }
      });

      const horas = Number((segundosMes / 3600).toFixed(2));
      const minutos = Math.round(segundosMes / 60);
      const superou = metaMesHoras > 0 && horas >= metaMesHoras;

      return {
        key: prefixo,
        label: mesAbrev,
        nomeCompleto: `${mesesCompletos[mIdx]} de ${refAno}`,
        horas,
        minutos,
        minutosFormatados: formatarMinutosHoras(minutos),
        metaHoras: metaMesHoras,
        superou,
        questoes: questoesMes,
        sessoesQtd: sessoesMes,
      };
    });

    const totalSegundos = meses.reduce((acc, m) => acc + m.minutos * 60, 0);

    return {
      periodo: 'mes',
      dados: meses,
      metaReferenciaHoras: metaMediaMensalHoras,
      metaLabel: `Meta média mensal (~${metaMediaMensalHoras}h)`,
      totalSegundos,
      totalHoras: Number((totalSegundos / 3600).toFixed(1)),
      periodoRotulo: `Ano de ${refAno}`,
    };
  }

  // periodo === 'ano'
  // Exibe anos presentes nas sessões ou os últimos 3 anos
  const anosSet = new Set([refAno, refAno - 1, refAno + 1]);
  sessoes.forEach((s) => {
    if (s.inicioISO) {
      const a = parseInt(s.inicioISO.slice(0, 4), 10);
      if (!isNaN(a)) anosSet.add(a);
    }
  });

  const anosOrdenados = Array.from(anosSet).sort((a, b) => a - b);
  const metaAnualHoras = Number(((metaSemanalMinutos * 52) / 60).toFixed(0));

  const dadosAno = anosOrdenados.map((ano) => {
    const prefixo = `${ano}-`;
    let segundosAno = 0;
    let questoesAno = 0;
    let sessoesAno = 0;

    Object.keys(segundosPorDia).forEach((ymd) => {
      if (ymd.startsWith(prefixo)) {
        segundosAno += segundosPorDia[ymd] || 0;
        questoesAno += questoesPorDia[ymd] || 0;
        sessoesAno += sessoesPorDia[ymd] || 0;
      }
    });

    const horas = Number((segundosAno / 3600).toFixed(2));
    const minutos = Math.round(segundosAno / 60);
    const superou = metaAnualHoras > 0 && horas >= metaAnualHoras;

    return {
      key: String(ano),
      label: String(ano),
      horas,
      minutos,
      minutosFormatados: formatarMinutosHoras(minutos),
      metaHoras: metaAnualHoras,
      superou,
      questoes: questoesAno,
      sessoesQtd: sessoesAno,
    };
  });

  const totalSegundos = dadosAno.reduce((acc, a) => acc + a.minutos * 60, 0);

  return {
    periodo: 'ano',
    dados: dadosAno,
    metaReferenciaHoras: metaAnualHoras,
    metaLabel: `Meta anual (~${metaAnualHoras}h)`,
    totalSegundos,
    totalHoras: Number((totalSegundos / 3600).toFixed(1)),
    periodoRotulo: 'Histórico anual',
  };
}

/**
 * Calcula mapa de calor anual estilo GitHub (365/366 dias)
 * Regra: dia estudado = pelo menos 15 minutos (900s)
 * 
 * @param {Array} sessoes Lista de sessões
 * @param {number} ano Ano desejado (default 2026)
 * @returns {Object} { semanas, diasEstudados, totalDiasAno, streakAtual, streakRecorde, totalMinutosAno, mesesHeader }
 */
export function calcularMapaCalorAnual(sessoes = [], ano = 2026) {
  // Mapa de segundos por data YYYY-MM-DD
  const mapaSegundos = {};
  const mapaQuestoes = {};

  sessoes.forEach((s) => {
    const ymd = getDataYMD(s.inicioISO);
    mapaSegundos[ymd] = (mapaSegundos[ymd] || 0) + (s.segundosEstudo || 0);
    mapaQuestoes[ymd] = (mapaQuestoes[ymd] || 0) + (s.questoesFeitas || 0);
  });

  const isBissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const totalDiasAno = isBissexto ? 366 : 365;

  // Monta lista de todos os dias do ano
  const todosDias = [];
  const startUtc = new Date(Date.UTC(ano, 0, 1)); // 01 de Jan
  const endUtc = new Date(Date.UTC(ano, 11, 31)); // 31 de Dez

  let curUtc = new Date(startUtc.getTime());
  while (curUtc <= endUtc) {
    const ymd = curUtc.toISOString().slice(0, 10);
    const segundos = mapaSegundos[ymd] || 0;
    const minutos = Math.round(segundos / 60);
    const questoes = mapaQuestoes[ymd] || 0;
    const estudadoValido = segundos >= SEGUNDOS_MINIMOS_DIA_ESTUDADO;

    // Nível de intensidade visual:
    // 0: sem estudo (0 min)
    // 1: < 15 min (estudou, mas não atinge a regra do dia válido)
    // 2: 15 a 59 min
    // 3: 60 a 119 min (1h a 2h)
    // 4: 120 a 239 min (2h a 4h)
    // 5: >= 240 min (4h+)
    let nivel = 0;
    if (minutos > 0 && minutos < 15) nivel = 1;
    else if (minutos >= 15 && minutos < 60) nivel = 2;
    else if (minutos >= 60 && minutos < 120) nivel = 3;
    else if (minutos >= 120 && minutos < 240) nivel = 4;
    else if (minutos >= 240) nivel = 5;

    // Dia da semana: 0 = Segunda, 6 = Domingo
    // JS getUTCDay: 0 = Dom, 1 = Seg, 2 = Ter, ..., 6 = Sab
    const dayOfWeek = (curUtc.getUTCDay() + 6) % 7; // 0=Seg, 1=Ter, ..., 6=Dom

    todosDias.push({
      dataYMD: ymd,
      dia: curUtc.getUTCDate(),
      mes: curUtc.getUTCMonth(),
      ano,
      dayOfWeek,
      segundos,
      minutos,
      questoes,
      estudadoValido,
      nivel,
    });

    curUtc = new Date(curUtc.getTime() + 86400000);
  }

  // Contagem de dias estudados
  const diasEstudados = todosDias.filter((d) => d.estudadoValido).length;
  const totalMinutosAno = todosDias.reduce((acc, d) => acc + d.minutos, 0);

  // Cálculo de Streak Recorde e Streak Atual
  // Percorre cronologicamente
  let streakMax = 0;
  let streakCorrente = 0;

  todosDias.forEach((d) => {
    if (d.estudadoValido) {
      streakCorrente += 1;
      if (streakCorrente > streakMax) streakMax = streakCorrente;
    } else {
      streakCorrente = 0;
    }
  });

  // Streak atual considerando a data de "hoje"
  const hojeYMD = getDataYMD(new Date().toISOString());
  let streakAtual = 0;

  // Encontra o índice de hoje ou o último dia com dados
  const idxHoje = todosDias.findIndex((d) => d.dataYMD === hojeYMD);
  if (idxHoje !== -1) {
    // Se hoje bateu a meta de 15m, conta hoje e volta
    // Se hoje ainda não bateu, verifica se ontem bateu para não zerar a sequência do dia ainda em curso
    let startIdx = idxHoje;
    if (!todosDias[idxHoje].estudadoValido) {
      startIdx = idxHoje - 1;
    }
    while (startIdx >= 0 && todosDias[startIdx].estudadoValido) {
      streakAtual += 1;
      startIdx -= 1;
    }
  } else {
    // Se hoje está fora do ano selecionado, pega o streak do final do ano
    let startIdx = todosDias.length - 1;
    while (startIdx >= 0 && todosDias[startIdx].estudadoValido) {
      streakAtual += 1;
      startIdx -= 1;
    }
  }

  // Agrupamento em colunas de semanas (grid estilo GitHub)
  // Semana começa na segunda (linha 0). Se 01 de Jan cair numa Quarta (dia 2), os dias anteriores ficam vazios (null).
  const semanas = [];
  let semanaAtual = new Array(7).fill(null);

  const mesesHeader = [];
  let ultimoMesVisto = -1;

  todosDias.forEach((diaInfo) => {
    // Se for o primeiro dia de um novo mês, registra a coluna
    if (diaInfo.mes !== ultimoMesVisto) {
      mesesHeader.push({
        mes: diaInfo.mes,
        coluna: semanas.length,
        nomeAbrev: [
          'Jan',
          'Fev',
          'Mar',
          'Abr',
          'Mai',
          'Jun',
          'Jul',
          'Ago',
          'Set',
          'Out',
          'Nov',
          'Dez',
        ][diaInfo.mes],
      });
      ultimoMesVisto = diaInfo.mes;
    }

    semanaAtual[diaInfo.dayOfWeek] = diaInfo;

    // Se for domingo (linha 6), fecha a coluna da semana
    if (diaInfo.dayOfWeek === 6) {
      semanas.push(semanaAtual);
      semanaAtual = new Array(7).fill(null);
    }
  });

  // Se restaram dias na última semana
  if (semanaAtual.some((d) => d !== null)) {
    semanas.push(semanaAtual);
  }

  return {
    ano,
    totalDiasAno,
    diasEstudados,
    percentualDiasEstudados: Math.round((diasEstudados / totalDiasAno) * 100),
    streakAtual,
    streakRecorde: streakMax,
    totalMinutosAno,
    totalHorasAno: Number((totalMinutosAno / 60).toFixed(1)),
    semanas,
    mesesHeader,
  };
}

/**
 * Consolida o desempenho de acertos: % geral, por disciplina, por tópico expansível
 * e calcula o ranking de assuntos do pior para o melhor (mínimo de 10 questões).
 * 
 * @param {Array} sessoes 
 * @param {Array} disciplinas 
 * @param {Array} topicos 
 * @returns {Object}
 */
export function calcularDesempenhoQuestoes(
  sessoes = [],
  disciplinas = [],
  topicos = [],
  options = {}
) {
  const minQuestoesRanking = Number(options?.minQuestoesRanking) || 10;

  // 1. Estatísticas Gerais
  let totalQuestoesGeral = 0;
  let totalAcertosGeral = 0;
  let totalSegundosGeral = 0;

  // Índices para agregação rápida
  const porDisciplina = {};
  const porTopico = {};

  disciplinas.forEach((d) => {
    porDisciplina[d.id] = {
      id: d.id,
      nome: d.nome,
      cor: d.cor || '#38bdf8',
      peso: d.peso,
      dificuldade: d.dificuldade,
      dominio: d.dominio,
      questoesFeitas: 0,
      questoesAcertos: 0,
      segundosEstudo: 0,
      sessoesQtd: 0,
      topicosIds: new Set(),
    };
  });

  topicos.forEach((t) => {
    porTopico[t.id] = {
      id: t.id,
      disciplinaId: t.disciplinaId,
      parentId: t.parentId,
      nome: t.nome,
      questoesFeitas: 0,
      questoesAcertos: 0,
      segundosEstudo: 0,
      sessoesQtd: 0,
    };
    if (porDisciplina[t.disciplinaId]) {
      porDisciplina[t.disciplinaId].topicosIds.add(t.id);
    }
  });

  sessoes.forEach((s) => {
    const feitas = Number(s.questoesFeitas) || 0;
    const acertos = Number(s.questoesAcertos) || 0;
    const chutes = Number(s.questoesChutes) || 0;
    const segundos = Number(s.segundosEstudo) || 0;

    // Lógica para filtrar chutes
    let feitasParaCalculo = feitas;
    let acertosParaCalculo = acertos;
    if (options?.filtroChutes === 'excluir') {
      feitasParaCalculo = Math.max(0, feitas - chutes);
      acertosParaCalculo = Math.max(0, acertos - chutes);
    } else if (options?.filtroChutes === 'considerarErro') {
      acertosParaCalculo = Math.max(0, acertos - chutes);
    }

    totalQuestoesGeral += feitasParaCalculo;
    totalAcertosGeral += acertosParaCalculo;
    totalSegundosGeral += segundos;

    if (s.disciplinaId && porDisciplina[s.disciplinaId]) {
      porDisciplina[s.disciplinaId].questoesFeitas += feitasParaCalculo;
      porDisciplina[s.disciplinaId].questoesAcertos += acertosParaCalculo;
      porDisciplina[s.disciplinaId].segundosEstudo += segundos;
      porDisciplina[s.disciplinaId].sessoesQtd += 1;
    }

    if (s.topicoId && porTopico[s.topicoId]) {
      porTopico[s.topicoId].questoesFeitas += feitasParaCalculo;
      porTopico[s.topicoId].questoesAcertos += acertosParaCalculo;
      porTopico[s.topicoId].segundosEstudo += segundos;
      porTopico[s.topicoId].sessoesQtd += 1;
    }
  });

  const taxaGeral =
    totalQuestoesGeral > 0
      ? Math.round((totalAcertosGeral / totalQuestoesGeral) * 100)
      : 0;

  // 2. Lista formatada por disciplina e seus tópicos (expansível)
  const listaDisciplinas = Object.values(porDisciplina).map((d) => {
    const discTaxa =
      d.questoesFeitas > 0
        ? Math.round((d.questoesAcertos / d.questoesFeitas) * 100)
        : 0;

    const topicosDaDisc = topicos
      .filter((t) => t.disciplinaId === d.id)
      .map((t) => {
        const tDados = porTopico[t.id] || {
          questoesFeitas: 0,
          questoesAcertos: 0,
          segundosEstudo: 0,
          sessoesQtd: 0,
        };
        const taxa =
          tDados.questoesFeitas > 0
            ? Math.round((tDados.questoesAcertos / tDados.questoesFeitas) * 100)
            : 0;

        return {
          id: t.id,
          nome: t.nome,
          parentId: t.parentId,
          questoesFeitas: tDados.questoesFeitas,
          questoesAcertos: tDados.questoesAcertos,
          questoesErros: tDados.questoesFeitas - tDados.questoesAcertos,
          taxa,
          segundosEstudo: tDados.segundosEstudo,
          sessoesQtd: tDados.sessoesQtd,
        };
      });

    return {
      id: d.id,
      nome: d.nome,
      cor: d.cor,
      peso: d.peso,
      dificuldade: d.dificuldade,
      dominio: d.dominio,
      questoesFeitas: d.questoesFeitas,
      questoesAcertos: d.questoesAcertos,
      questoesErros: d.questoesFeitas - d.questoesAcertos,
      taxa: discTaxa,
      segundosEstudo: d.segundosEstudo,
      sessoesQtd: d.sessoesQtd,
      topicos: topicosDaDisc,
    };
  });

  // 3. Ranking de Assuntos do pior para o melhor
  const topicosQualificados = [];
  const topicosPendentesDeQuestoes = [];
  const todosAssuntosComQuestoes = [];

  Object.values(porTopico).forEach((t) => {
    const disc = porDisciplina[t.disciplinaId];
    const taxa =
      t.questoesFeitas > 0
        ? Math.round((t.questoesAcertos / t.questoesFeitas) * 1000) / 10
        : 0;

    const item = {
      id: t.id,
      topicoNome: t.nome,
      disciplinaId: t.disciplinaId,
      disciplinaNome: disc?.nome || 'Disciplina',
      disciplinaCor: disc?.cor || '#38bdf8',
      questoesFeitas: t.questoesFeitas,
      questoesAcertos: t.questoesAcertos,
      questoesErros: t.questoesFeitas - t.questoesAcertos,
      taxa: Math.round(taxa),
      taxaExata: taxa,
      segundosEstudo: t.segundosEstudo,
    };

    if (t.questoesFeitas > 0) {
      todosAssuntosComQuestoes.push(item);
    }

    if (t.questoesFeitas >= minQuestoesRanking) {
      topicosQualificados.push(item);
    } else if (t.questoesFeitas > 0) {
      topicosPendentesDeQuestoes.push(item);
    }
  });

  // Ordena do PIOR (% menor) para o MELHOR (% maior)
  const sortPiorMelhor = (a, b) => {
    if (a.taxaExata !== b.taxaExata) {
      return a.taxaExata - b.taxaExata;
    }
    return b.questoesFeitas - a.questoesFeitas;
  };

  topicosQualificados.sort(sortPiorMelhor);
  topicosPendentesDeQuestoes.sort(sortPiorMelhor);
  todosAssuntosComQuestoes.sort(sortPiorMelhor);

  const disciplinasComAtividade = listaDisciplinas.filter(
    (d) => d.questoesFeitas > 0 || d.segundosEstudo > 0
  );

  return {
    geral: {
      totalQuestoes: totalQuestoesGeral,
      totalAcertos: totalAcertosGeral,
      totalErros: totalQuestoesGeral - totalAcertosGeral,
      taxaAcerto: taxaGeral,
      totalSegundos: totalSegundosGeral,
    },
    disciplinas: listaDisciplinas,
    disciplinasComAtividade,
    rankingAssuntos: topicosQualificados,
    assuntosPendentesDeQuestoes: topicosPendentesDeQuestoes,
    todosAssuntosComQuestoes,
  };
}

/**
 * Calcula a distribuição de tempo de estudo por disciplina para o gráfico de rosca
 * 
 * @param {Array} sessoes 
 * @param {Array} disciplinas 
 * @returns {Object}
 */
export function calcularDistribuicaoTempoPorDisciplina(sessoes = [], disciplinas = []) {
  const mapaSegundos = {};
  disciplinas.forEach((d) => {
    mapaSegundos[d.id] = 0;
  });

  sessoes.forEach((s) => {
    if (s.disciplinaId) {
      mapaSegundos[s.disciplinaId] =
        (mapaSegundos[s.disciplinaId] || 0) + (s.segundosEstudo || 0);
    }
  });

  const totalSegundosEstudo = Object.values(mapaSegundos).reduce((acc, v) => acc + v, 0);

  const dados = disciplinas
    .map((d) => {
      const segundos = mapaSegundos[d.id] || 0;
      const minutos = Math.round(segundos / 60);
      const horas = Number((segundos / 3600).toFixed(1));
      const share =
        totalSegundosEstudo > 0 ? Math.round((segundos / totalSegundosEstudo) * 100) : 0;

      return {
        id: d.id,
        name: d.nome,
        color: d.cor || '#38bdf8',
        value: minutos, // Recharts Pie usa value
        segundos,
        minutos,
        horas,
        share,
        minutosFormatados: formatarMinutosHoras(minutos),
      };
    })
    .filter((d) => d.segundos > 0);

  // Ordena pelo que mais estudou
  dados.sort((a, b) => b.segundos - a.segundos);

  return {
    dados,
    totalSegundos: totalSegundosEstudo,
    totalHoras: Number((totalSegundosEstudo / 3600).toFixed(1)),
    totalMinutos: Math.round(totalSegundosEstudo / 60),
  };
}

/**
 * Calcula a distribuição de tempo de estudo por tópicos de uma disciplina (para rosca detalhada)
 * 
 * @param {Array} sessoes 
 * @param {Array} topicos 
 * @returns {Object}
 */
export function calcularDistribuicaoTempoPorTopico(sessoes = [], topicos = []) {
  const mapaSegundos = {};
  topicos.forEach((t) => {
    mapaSegundos[t.id] = 0;
  });

  sessoes.forEach((s) => {
    if (s.topicoId) {
      mapaSegundos[s.topicoId] =
        (mapaSegundos[s.topicoId] || 0) + (s.segundosEstudo || 0);
    }
  });

  const totalSegundosEstudo = Object.values(mapaSegundos).reduce((acc, v) => acc + v, 0);

  const paletaCores = [
    '#38bdf8',
    '#818cf8',
    '#c084fc',
    '#f472b6',
    '#fb7185',
    '#34d399',
    '#2dd4bf',
    '#fbbf24',
    '#f97316',
    '#a78bfa',
    '#60a5fa',
    '#4ade80',
  ];

  const dados = topicos
    .map((t, idx) => {
      const segundos = mapaSegundos[t.id] || 0;
      const minutos = Math.round(segundos / 60);
      const horas = Number((segundos / 3600).toFixed(1));
      const share =
        totalSegundosEstudo > 0 ? Math.round((segundos / totalSegundosEstudo) * 100) : 0;

      return {
        id: t.id,
        name: t.nome,
        color: paletaCores[idx % paletaCores.length],
        value: minutos,
        segundos,
        minutos,
        horas,
        share,
        minutosFormatados: formatarMinutosHoras(minutos),
      };
    })
    .filter((d) => d.segundos > 0);

  dados.sort((a, b) => b.segundos - a.segundos);

  return {
    dados,
    totalSegundos: totalSegundosEstudo,
    totalHoras: Number((totalSegundosEstudo / 3600).toFixed(1)),
    totalMinutos: Math.round(totalSegundosEstudo / 60),
  };
}

/**
 * Calcula a evolução semanal da taxa de acerto (%) para gráfico de linha
 * 
 * @param {Array} sessoes 
 * @returns {Array}
 */
export function calcularEvolucaoSemanalQuestoes(sessoes = [], options = {}) {
  // Agrupa sessões que possuem questões feitas por semana ISO
  const semanasMap = {};

  // Ordena sessões por data cronológica crescente
  const sessoesOrdenadas = [...sessoes].sort((a, b) => {
    return new Date(a.inicioISO || 0).getTime() - new Date(b.inicioISO || 0).getTime();
  });

  sessoesOrdenadas.forEach((s) => {
    const feitas = Number(s.questoesFeitas) || 0;
    const acertos = Number(s.questoesAcertos) || 0;
    const chutes = Number(s.questoesChutes) || 0;

    // Lógica para filtrar chutes
    let feitasParaCalculo = feitas;
    let acertosParaCalculo = acertos;
    if (options?.filtroChutes === 'excluir') {
      feitasParaCalculo = Math.max(0, feitas - chutes);
      acertosParaCalculo = Math.max(0, acertos - chutes);
    } else if (options?.filtroChutes === 'considerarErro') {
      acertosParaCalculo = Math.max(0, acertos - chutes);
    }

    if (!s.inicioISO || feitasParaCalculo <= 0) return;

    const dataObj = new Date(s.inicioISO);
    const { week, year } = getISOWeek(dataObj);
    const key = `${year}-W${String(week).padStart(2, '0')}`;

    if (!semanasMap[key]) {
      semanasMap[key] = {
        key,
        weekNumber: week,
        year,
        questoesFeitas: 0,
        questoesAcertos: 0,
        primeiraDataISO: s.inicioISO,
        ultimaDataISO: s.inicioISO,
      };
    }

    semanasMap[key].questoesFeitas += feitasParaCalculo;
    semanasMap[key].questoesAcertos += acertosParaCalculo;
    semanasMap[key].ultimaDataISO = s.inicioISO;
  });

  const keysOrdenadas = Object.keys(semanasMap).sort();

  const dadosLinha = keysOrdenadas.map((key) => {
    const item = semanasMap[key];
    const taxa =
      item.questoesFeitas > 0
        ? Math.round((item.questoesAcertos / item.questoesFeitas) * 100)
        : 0;

    const dataFmt = item.primeiraDataISO
      ? `${item.primeiraDataISO.slice(8, 10)}/${item.primeiraDataISO.slice(5, 7)}`
      : '';

    return {
      key,
      semanaLabel: `Sem ${item.weekNumber}`,
      labelCompleto: `Semana ${item.weekNumber} (${dataFmt})`,
      taxaAcerto: taxa,
      questoesFeitas: item.questoesFeitas,
      questoesAcertos: item.questoesAcertos,
      questoesErros: item.questoesFeitas - item.questoesAcertos,
    };
  });

  return dadosLinha;
}

/**
 * Calcula a evolução do aproveitamento com granularidade adaptativa ao filtro temporal.
 * Para períodos curtos (hoje, 7d, 30d, personalizado curto), exibe dia a dia.
 * Para períodos longos (mes, mes_anterior, ano, tudo), exibe semana a semana.
 * 
 * @param {Array} sessoes
 * @param {string} filtroPeriodo
 * @returns {Object} { dadosLinha, tipoGranularidade }
 */
export function calcularEvolucaoQuestoesFlexivel(sessoes = [], filtroPeriodo = 'tudo', options = {}) {
  const agruparPorDia = ['hoje', '7d', '30d', 'personalizado'].includes(filtroPeriodo);

  if (!agruparPorDia) {
    const semanal = calcularEvolucaoSemanalQuestoes(sessoes, options);
    return {
      dadosLinha: semanal,
      tipoGranularidade: 'semana',
    };
  }

  // Agrupamento diário
  const diasMap = {};

  const sessoesOrdenadas = [...sessoes].sort((a, b) => {
    return new Date(a.inicioISO || 0).getTime() - new Date(b.inicioISO || 0).getTime();
  });

  sessoesOrdenadas.forEach((s) => {
    const feitas = Number(s.questoesFeitas) || 0;
    const acertos = Number(s.questoesAcertos) || 0;
    const chutes = Number(s.questoesChutes) || 0;

    // Lógica para filtrar chutes
    let feitasParaCalculo = feitas;
    let acertosParaCalculo = acertos;
    if (options?.filtroChutes === 'excluir') {
      feitasParaCalculo = Math.max(0, feitas - chutes);
      acertosParaCalculo = Math.max(0, acertos - chutes);
    } else if (options?.filtroChutes === 'considerarErro') {
      acertosParaCalculo = Math.max(0, acertos - chutes);
    }

    if (!s.inicioISO || feitasParaCalculo <= 0) return;

    const ymd = getDataYMD(s.inicioISO);

    if (!diasMap[ymd]) {
      const [ano, mes, dia] = ymd.split('-');
      diasMap[ymd] = {
        key: ymd,
        semanaLabel: `${dia}/${mes}`,
        labelCompleto: `${dia}/${mes}/${ano}`,
        questoesFeitas: 0,
        questoesAcertos: 0,
      };
    }

    diasMap[ymd].questoesFeitas += feitasParaCalculo;
    diasMap[ymd].questoesAcertos += acertosParaCalculo;
  });

  const keysOrdenadas = Object.keys(diasMap).sort();

  const dadosLinha = keysOrdenadas.map((key) => {
    const item = diasMap[key];
    const taxa =
      item.questoesFeitas > 0
        ? Math.round((item.questoesAcertos / item.questoesFeitas) * 100)
        : 0;

    return {
      key,
      semanaLabel: item.semanaLabel,
      labelCompleto: item.labelCompleto,
      taxaAcerto: taxa,
      questoesFeitas: item.questoesFeitas,
      questoesAcertos: item.questoesAcertos,
      questoesErros: item.questoesFeitas - item.questoesAcertos,
    };
  });

  return {
    dadosLinha,
    tipoGranularidade: 'dia',
  };
}
