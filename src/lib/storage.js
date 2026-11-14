/**
 * Camada única de persistência do app via localStorage.
 * Controla versionamento do schema (schemaVersion), migrações e validações de backup.
 */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'concursos_estudos_dados_v1';

/**
 * Cria o estado inicial padrão vazio com a estrutura canônica
 */
export function getDefaultState() {
  const now = new Date().toISOString();
  return {
    provas: [],
    disciplinas: [],
    topicos: [],
    sessoes: [],
    revisoes: [],
    ciclos: [],
    sessaoAtiva: null,
    updatedAt: now,
    config: {
      schemaVersion: SCHEMA_VERSION,
      geminiApiKey: '',
      alarmeAtivo: true,
      provaAtivaId: null,
      updatedAt: now,
    },
  };
}

/**
 * Função de migração de schema caso versões anteriores existam
 */
export function migrateState(rawState, targetVersion = SCHEMA_VERSION) {
  if (!rawState || typeof rawState !== 'object') {
    return getDefaultState();
  }

  let state = { ...rawState };
  const currentVersion = state.config?.schemaVersion || 0;

  // Migração da v0 para v1 (garantir chaves canônicas)
  if (currentVersion < 1) {
    state.provas = Array.isArray(state.provas) ? state.provas : [];
    state.disciplinas = Array.isArray(state.disciplinas) ? state.disciplinas : [];
    state.topicos = Array.isArray(state.topicos) ? state.topicos : [];
    state.sessoes = Array.isArray(state.sessoes) ? state.sessoes : [];
    state.revisoes = Array.isArray(state.revisoes) ? state.revisoes : [];
    state.ciclos = Array.isArray(state.ciclos) ? state.ciclos : [];
    state.sessaoAtiva = state.sessaoAtiva || null;
    state.config = {
      schemaVersion: 1,
      geminiApiKey: state.config?.geminiApiKey || '',
      alarmeAtivo: state.config?.alarmeAtivo !== undefined ? Boolean(state.config.alarmeAtivo) : true,
      provaAtivaId: state.config?.provaAtivaId || (state.provas[0]?.id ?? null),
    };
  }

  // Garante que sessaoAtiva sempre exista
  if (state.sessaoAtiva === undefined) {
    state.sessaoAtiva = null;
  }

  // Garante que updatedAt exista (para sincronização multidevice por última alteração)
  if (!state.updatedAt && !state.config?.updatedAt) {
    // Procura a data da sessão mais recente como fallback inteligente
    const latestSessionDate = Array.isArray(state.sessoes)
      ? state.sessoes.reduce((max, s) => {
          const t = s.dataHoraFim || s.dataHoraInicio;
          if (!t) return max;
          const ms = new Date(t).getTime();
          return ms > max ? ms : max;
        }, 0)
      : 0;

    const baseTime = latestSessionDate > 0 ? new Date(latestSessionDate).toISOString() : new Date().toISOString();
    state.updatedAt = baseTime;
    if (state.config) state.config.updatedAt = baseTime;
  } else if (!state.updatedAt && state.config?.updatedAt) {
    state.updatedAt = state.config.updatedAt;
  } else if (state.updatedAt && !state.config?.updatedAt) {
    if (state.config) state.config.updatedAt = state.updatedAt;
  }

  state.config.schemaVersion = targetVersion;
  return state;
}

/**
 * Carrega o estado do localStorage com migração automática
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultState();
    }
    const parsed = JSON.parse(raw);
    return migrateState(parsed, SCHEMA_VERSION);
  } catch (error) {
    console.error('Erro ao ler estado do localStorage:', error);
    return getDefaultState();
  }
}

/**
 * Salva o estado no localStorage de forma segura
 */
export function saveState(state) {
  try {
    if (!state) return false;
    const updatedAt = state.updatedAt || state.config?.updatedAt || new Date().toISOString();
    const payload = {
      ...state,
      updatedAt,
      config: {
        ...state.config,
        schemaVersion: SCHEMA_VERSION,
        updatedAt,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Erro ao salvar estado no localStorage:', error);
    return false;
  }
}

/**
 * Valida a integridade de um objeto de backup antes de importar
 */
export function validateBackup(backupObj) {
  if (!backupObj || typeof backupObj !== 'object') {
    return { valid: false, message: 'O arquivo não contém um objeto JSON válido.' };
  }

  // Verifica chaves principais do modelo
  const requiredKeys = ['provas', 'disciplinas', 'topicos', 'sessoes', 'revisoes', 'ciclos'];
  for (const key of requiredKeys) {
    if (!Array.isArray(backupObj[key])) {
      return {
        valid: false,
        message: `Formato inválido: campo obrigatório '${key}' ausente ou não é uma lista.`,
      };
    }
  }

  if (!backupObj.config || typeof backupObj.config !== 'object') {
    return { valid: false, message: 'Formato inválido: objeto de configuração ausente.' };
  }

  return { valid: true };
}

/**
 * Importa e migra backup a partir de uma string JSON
 */
export function importBackup(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateBackup(parsed);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    const migrated = migrateState(parsed, SCHEMA_VERSION);
    saveState(migrated);
    return { success: true, state: migrated };
  } catch (error) {
    return { success: false, error: error.message || 'Falha ao processar arquivo JSON.' };
  }
}

/**
 * Gera o backup em JSON formatado e dispara o download do arquivo
 */
export function exportBackup(state) {
  try {
    const cleanState = {
      ...state,
      config: {
        ...state.config,
        schemaVersion: SCHEMA_VERSION,
      },
    };
    const jsonStr = JSON.stringify(cleanState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `estudaqui-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, json: jsonStr };
  } catch (error) {
    console.error('Erro ao exportar backup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apaga todos os dados e redefine para o estado vazio
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return getDefaultState();
  } catch (error) {
    console.error('Erro ao limpar localStorage:', error);
    return getDefaultState();
  }
}
