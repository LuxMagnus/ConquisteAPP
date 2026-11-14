/**
 * Utilitários de data e hora para o app de estudos.
 * Regras:
 * - Datas no modelo sempre em ISO 8601 (UTC ou com offset).
 * - Exibição no fuso horário 'America/Fortaleza' (UTC-3).
 * - A semana sempre começa na segunda-feira.
 */

export const TIMEZONE = 'America/Fortaleza';

export const DIAS_DA_SEMANA = [
  { key: 'seg', label: 'Segunda-feira', abrev: 'Seg' },
  { key: 'ter', label: 'Terça-feira', abrev: 'Ter' },
  { key: 'qua', label: 'Quarta-feira', abrev: 'Qua' },
  { key: 'qui', label: 'Quinta-feira', abrev: 'Qui' },
  { key: 'sex', label: 'Sexta-feira', abrev: 'Sex' },
  { key: 'sab', label: 'Sábado', abrev: 'Sáb' },
  { key: 'dom', label: 'Domingo', abrev: 'Dom' },
];

/**
 * Retorna a data/hora atual em formato ISO 8601
 */
export function getNowISO() {
  return new Date().toISOString();
}

/**
 * Formata uma data ISO para string legível no fuso de Fortaleza (ex: "01/11/2026")
 */
export function formatarData(isoString) {
  if (!isoString) return '--/--/----';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return '--/--/----';
  }
}

/**
 * Formata data e hora (ex: "01/11/2026 às 14:30")
 */
export function formatarDataHora(isoString) {
  if (!isoString) return '--/--/---- --:--';
  try {
    const date = new Date(isoString);
    const dataFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);

    const horaFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    return `${dataFmt} às ${horaFmt}`;
  } catch {
    return '--/--/---- --:--';
  }
}

/**
 * Formata minutos em formato amigável (ex: 150m -> "2h30" ou "02:30")
 */
export function formatarMinutosHoras(minutos, formato = 'curto') {
  const m = Number(minutos) || 0;
  const horas = Math.floor(m / 60);
  const minsRestantes = Math.round(m % 60);

  if (formato === 'digital') {
    const hh = String(horas).padStart(2, '0');
    const mm = String(minsRestantes).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (horas === 0) {
    return `${minsRestantes}m`;
  }
  if (minsRestantes === 0) {
    return `${horas}h`;
  }
  return `${horas}h${String(minsRestantes).padStart(2, '0')}`;
}

/**
 * Formata segundos em HH:MM:SS ou MM:SS
 */
export function formatarSegundos(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segs = s % 60;

  const mm = String(minutos).padStart(2, '0');
  const ss = String(segs).padStart(2, '0');

  if (horas > 0) {
    const hh = String(horas).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Retorna o dia da semana ('seg'..'dom') para uma data ISO no fuso de Fortaleza
 */
export function getDiaSemanaKey(isoString = getNowISO()) {
  try {
    const date = new Date(isoString);
    const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE,
      weekday: 'narrow',
    });
    // JS getUTCDay() ou formatador:
    // Mapeamento baseado no getDay local do fuso
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      weekday: 'short',
    }).format(date);

    // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const map = {
      Mon: 'seg',
      Tue: 'ter',
      Wed: 'qua',
      Thu: 'qui',
      Fri: 'sex',
      Sat: 'sab',
      Sun: 'dom',
    };
    return map[parts] || 'seg';
  } catch {
    return 'seg';
  }
}

/**
 * Calcula os dias restantes até a data da prova no fuso de Fortaleza.
 * 
 * @param {string} dataProvaISO Data da prova em formato YYYY-MM-DD ou ISO
 * @returns {Object} { dias, status: 'futura' | 'hoje' | 'passada' | 'indefinido', texto }
 */
export function calcularDiasRestantes(dataProvaISO) {
  if (!dataProvaISO) {
    return { dias: null, status: 'indefinido', texto: 'Data não informada' };
  }
  try {
    const provaDatePart = String(dataProvaISO).slice(0, 10);
    const [pYear, pMonth, pDay] = provaDatePart.split('-').map(Number);
    if (!pYear || !pMonth || !pDay) {
      return { dias: null, status: 'indefinido', texto: 'Data inválida' };
    }

    // Data de hoje em America/Fortaleza no formato YYYY-MM-DD
    const hojeStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const [hYear, hMonth, hDay] = hojeStr.split('-').map(Number);

    const dataHojeUtc = Date.UTC(hYear, hMonth - 1, hDay);
    const dataProvaUtc = Date.UTC(pYear, pMonth - 1, pDay);

    const diffMs = dataProvaUtc - dataHojeUtc;
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) {
      return { dias: 0, status: 'hoje', texto: 'Hoje é o dia da prova!' };
    } else if (diffDias === 1) {
      return { dias: 1, status: 'futura', texto: 'Falta 1 dia' };
    } else if (diffDias > 1) {
      return { dias: diffDias, status: 'futura', texto: `Faltam ${diffDias} dias` };
    } else if (diffDias === -1) {
      return { dias: -1, status: 'passada', texto: 'Prova realizada ontem' };
    } else {
      return { dias: diffDias, status: 'passada', texto: `Prova realizada há ${Math.abs(diffDias)} dias` };
    }
  } catch (err) {
    console.error('Erro ao calcular dias restantes:', err);
    return { dias: null, status: 'indefinido', texto: 'Data inválida' };
  }
}

/**
 * Retorna a data no formato YYYY-MM-DD considerando o fuso de Fortaleza
 */
export function getDataYMD(isoString = getNowISO()) {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Retorna informações completas da semana corrente (segunda a domingo)
 * no fuso de America/Fortaleza, com os 7 dias, suas datas e indicador de "hoje".
 */
export function getSemanaAtualInfo(referenciaISO = getNowISO()) {
  const hojeYMD = getDataYMD(getNowISO());
  const refYMD = getDataYMD(referenciaISO);

  const [year, month, day] = refYMD.split('-').map(Number);
  // Usa UTC para evitar problemas de horário de verão ao fazer aritmética de dias
  const refUtcDate = new Date(Date.UTC(year, month - 1, day));
  
  // No fuso de Fortaleza, descobre o dia da semana ('seg'..'dom')
  const keyHoje = getDiaSemanaKey(referenciaISO);
  const diasKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const indiceSemana = diasKeys.indexOf(keyHoje); // 0 para seg, 6 para dom

  // Data da segunda-feira
  const segUtc = new Date(refUtcDate.getTime() - indiceSemana * 24 * 60 * 60 * 1000);

  const dias = diasKeys.map((key, idx) => {
    const d = new Date(segUtc.getTime() + idx * 24 * 60 * 60 * 1000);
    const ymd = d.toISOString().slice(0, 10);
    const [y, m, diaNum] = ymd.split('-');
    
    const infoOriginal = DIAS_DA_SEMANA.find((item) => item.key === key);
    return {
      key,
      label: infoOriginal?.label || key,
      abrev: infoOriginal?.abrev || key,
      dataYMD: ymd,
      diaMesFmt: `${diaNum}/${m}`,
      isHoje: ymd === hojeYMD,
    };
  });

  const inicioSegunda = dias[0].dataYMD;
  const fimDomingo = dias[6].dataYMD;

  return {
    inicioSegunda,
    fimDomingo,
    dias,
    hojeYMD,
    hojeKey: keyHoje,
  };
}

/**
 * Verifica se um timestamp ISO pertence à semana informada (comparando YYYY-MM-DD em Fortaleza)
 */
export function isSessaoNaSemana(sessaoInicioISO, inicioSegundaYMD, fimDomingoYMD) {
  if (!sessaoInicioISO) return false;
  const sessaoYMD = getDataYMD(sessaoInicioISO);
  return sessaoYMD >= inicioSegundaYMD && sessaoYMD <= fimDomingoYMD;
}

