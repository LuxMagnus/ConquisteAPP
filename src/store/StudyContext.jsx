/**
 * Store global unificado do app via React Context + useReducer.
 * Persistência automática em localStorage através de lib/storage.js.
 */

import React, { createContext, useContext, useReducer, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { loadState, saveState, getDefaultState, clearAllData } from '../lib/storage.js';
import {
  calcularDistribuicaoCiclo,
  TAMANHO_VOLTA_PADRAO_MINUTOS,
  DURACAO_SESSAO_PADRAO_MINUTOS,
  transferirProgressoCiclo,
} from '../lib/cicloUtils.js';
import { auth, db, loginComGoogle, logoutFirebase, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { getSampleData } from '../lib/sampleData.js';
import { PALETA_CORES_DISCIPLINA } from '../lib/materiaUtils.js';

export function getDeviceType() {
  if (typeof navigator === 'undefined') return 'Dispositivo';
  const ua = navigator.userAgent || '';
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) {
    return 'Celular';
  }
  return 'Computador';
}

export function getTimestampMs(val) {
  if (!val) return 0;
  const t = new Date(val).getTime();
  return isNaN(t) ? 0 : t;
}

export function hasRealData(st) {
  if (!st) return false;
  return (
    (Array.isArray(st.provas) && st.provas.length > 0) ||
    (Array.isArray(st.disciplinas) && st.disciplinas.length > 0) ||
    (Array.isArray(st.sessoes) && st.sessoes.length > 0) ||
    (Array.isArray(st.ciclos) && st.ciclos.some((c) => c.blocos && c.blocos.length > 0))
  );
}

/**
 * Resolução de conflito estrita baseada na ÚLTIMA ALTERAÇÃO NO TEMPO
 * (O sistema deve atualizar de acordo com a última alteração de tempo)
 */
export function resolveSyncConflict(localState, remoteDoc) {
  if (!remoteDoc || !remoteDoc.data) {
    return 'UPLOAD_LOCAL';
  }

  const remoteData = remoteDoc.data;
  const localHasData = hasRealData(localState);
  const remoteHasData = hasRealData(remoteData);

  // Se este aparelho estiver vazio (ex: novo acesso) e a nuvem já tiver dados, aplica nuvem
  if (!localHasData && remoteHasData) {
    return 'APPLY_REMOTE';
  }

  // Se a nuvem estiver vazia e este aparelho já tiver dados, sobe dados locais
  if (localHasData && !remoteHasData) {
    return 'UPLOAD_LOCAL';
  }

  const localTimeMs = getTimestampMs(localState?.config?.updatedAt || localState?.updatedAt);
  const remoteTimeMs = getTimestampMs(remoteDoc.updatedAt || remoteData?.config?.updatedAt || remoteData?.updatedAt);

  // Se a nuvem possui uma sessão ativa em andamento ou recém-concluída e o dispositivo local não tem,
  // prioriza a sessão remota para garantir continuidade imediata entre celular e computador
  if (remoteData?.sessaoAtiva && !localState?.sessaoAtiva) {
    if (remoteTimeMs >= localTimeMs - 15000) {
      return 'APPLY_REMOTE';
    }
  }

  // Critério de última alteração no tempo:
  if (remoteTimeMs > localTimeMs) {
    return 'APPLY_REMOTE';
  } else if (localTimeMs > remoteTimeMs) {
    return 'UPLOAD_LOCAL';
  } else {
    return 'IN_SYNC';
  }
}

const StudyContext = createContext(null);

// Tipos de ações nomeadas
export const ACTION_TYPES = {
  SET_STATE: 'SET_STATE',
  RESET_STATE: 'RESET_STATE',
  LOAD_SAMPLE_DATA: 'LOAD_SAMPLE_DATA',
  SET_PROVA_ATIVA: 'SET_PROVA_ATIVA',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  ADD_PROVA: 'ADD_PROVA',
  UPDATE_PROVA: 'UPDATE_PROVA',
  DELETE_PROVA: 'DELETE_PROVA',
  ADD_DISCIPLINA: 'ADD_DISCIPLINA',
  UPDATE_DISCIPLINA: 'UPDATE_DISCIPLINA',
  DELETE_DISCIPLINA: 'DELETE_DISCIPLINA',
  ADD_TOPICO: 'ADD_TOPICO',
  UPDATE_TOPICO: 'UPDATE_TOPICO',
  DELETE_TOPICO: 'DELETE_TOPICO',
  TOGGLE_TOPICO_STATUS: 'TOGGLE_TOPICO_STATUS',
  MOVE_TOPICO: 'MOVE_TOPICO',
  REORDER_TOPICOS: 'REORDER_TOPICOS',
  ADD_SESSAO: 'ADD_SESSAO',
  DELETE_SESSAO: 'DELETE_SESSAO',
  START_SESSAO_ATIVA: 'START_SESSAO_ATIVA',
  PAUSE_SESSAO_ATIVA: 'PAUSE_SESSAO_ATIVA',
  RESUME_SESSAO_ATIVA: 'RESUME_SESSAO_ATIVA',
  UPDATE_SESSAO_ATIVA: 'UPDATE_SESSAO_ATIVA',
  FINISH_POMODORO_SESSAO: 'FINISH_POMODORO_SESSAO',
  DISCARD_SESSAO_ATIVA: 'DISCARD_SESSAO_ATIVA',
  CLEAR_SESSAO_ATIVA: 'CLEAR_SESSAO_ATIVA',
  ADD_REVISAO: 'ADD_REVISAO',
  UPDATE_REVISAO: 'UPDATE_REVISAO',
  CONCLUIR_REVISAO: 'CONCLUIR_REVISAO',
  DELETE_REVISAO: 'DELETE_REVISAO',
  UPDATE_CICLO: 'UPDATE_CICLO',
  REGENERATE_CICLO: 'REGENERATE_CICLO',
  IMPORT_EDITAL: 'IMPORT_EDITAL',
  TOGGLE_DISCIPLINA_ATIVA: 'TOGGLE_DISCIPLINA_ATIVA',
  SET_DISCIPLINAS_ATIVAS: 'SET_DISCIPLINAS_ATIVAS',
  TOGGLE_CONCLUIR_BLOCO_CICLO: 'TOGGLE_CONCLUIR_BLOCO_CICLO',
  REORDER_CICLO_BLOCOS: 'REORDER_CICLO_BLOCOS',
  SET_PORCENTAGENS_MANUAIS_CICLO: 'SET_PORCENTAGENS_MANUAIS_CICLO',
};


function baseStudyReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_STATE: {
      return { ...action.payload };
    }

    case ACTION_TYPES.RESET_STATE: {
      clearAllData();
      return getDefaultState();
    }

    case ACTION_TYPES.LOAD_SAMPLE_DATA: {
      const sample = getSampleData();
      return sample;
    }

    case ACTION_TYPES.SET_PROVA_ATIVA: {
      return {
        ...state,
        config: {
          ...state.config,
          provaAtivaId: action.payload,
        },
      };
    }

    case ACTION_TYPES.UPDATE_CONFIG: {
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload,
        },
      };
    }

    // --- PROVAS ---
    case ACTION_TYPES.ADD_PROVA: {
      const novaProva = action.payload;
      return {
        ...state,
        provas: [...state.provas, novaProva],
        config: {
          ...state.config,
          provaAtivaId: state.config.provaAtivaId || novaProva.id,
        },
      };
    }

    case ACTION_TYPES.UPDATE_PROVA: {
      const updated = action.payload;
      return {
        ...state,
        provas: state.provas.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      };
    }

    case ACTION_TYPES.DELETE_PROVA: {
      const idToDelete = action.payload;
      const nextProvas = state.provas.filter((p) => p.id !== idToDelete);
      const discIdsToDelete = new Set(state.disciplinas.filter((d) => d.provaId === idToDelete).map((d) => d.id));
      const topicosToDelete = new Set(state.topicos.filter((t) => discIdsToDelete.has(t.disciplinaId)).map((t) => t.id));
      const sessoesToDelete = new Set(state.sessoes.filter((s) => discIdsToDelete.has(s.disciplinaId)).map((s) => s.id));
      const nextDisciplinas = state.disciplinas.filter((d) => d.provaId !== idToDelete);
      const nextTopicos = state.topicos.filter((t) => !discIdsToDelete.has(t.disciplinaId));
      const nextSessoes = state.sessoes.filter((s) => !discIdsToDelete.has(s.disciplinaId));
      const nextRevisoes = state.revisoes.filter((r) => !topicosToDelete.has(r.topicoId) && !sessoesToDelete.has(r.sessaoOrigemId));
      const nextCiclos = state.ciclos.filter((c) => c.provaId !== idToDelete);

      return {
        ...state,
        provas: nextProvas,
        disciplinas: nextDisciplinas,
        topicos: nextTopicos,
        sessoes: nextSessoes,
        revisoes: nextRevisoes,
        ciclos: nextCiclos,
        config: {
          ...state.config,
          provaAtivaId: state.config.provaAtivaId === idToDelete ? (nextProvas[0]?.id || null) : state.config.provaAtivaId,
        },
      };
    }

    // --- DISCIPLINAS ---
    case ACTION_TYPES.ADD_DISCIPLINA: {
      const novaDisciplina = {
        ...action.payload,
        ativa: action.payload.ativa !== undefined ? Boolean(action.payload.ativa) : true,
      };

      const nextDisciplinas = [...state.disciplinas, novaDisciplina];
      const targetProvaId = novaDisciplina.provaId || state.config?.provaAtivaId;
      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);

      let nextCiclos = state.ciclos;
      // Se a nova disciplina for ativa e já houver ciclo cadastrado, atualiza os blocos
      if (novaDisciplina.ativa && cicloExistente) {
        const ativas = nextDisciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);
        const tamanhoVolta =
          cicloExistente.tamanhoVoltaMinutos ||
          cicloExistente.blocos?.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
          TAMANHO_VOLTA_PADRAO_MINUTOS;

        const novosBlocos = calcularDistribuicaoCiclo({
          disciplinas: ativas,
          tamanhoVoltaMinutos: tamanhoVolta,
        });

        const blocosFinais = novosBlocos.map((novo) => {
          const anterior = cicloExistente.blocos?.find((b) => b.disciplinaId === novo.disciplinaId);
          return {
            ...novo,
            minutosFeitos: Math.min(novo.minutosMeta, anterior?.minutosFeitos || 0),
          };
        });

        nextCiclos = state.ciclos.map((c) =>
          c.id === cicloExistente.id ? { ...c, blocos: blocosFinais } : c
        );
      }

      return {
        ...state,
        disciplinas: nextDisciplinas,
        ciclos: nextCiclos,
      };
    }

    case ACTION_TYPES.UPDATE_DISCIPLINA: {
      const updated = action.payload;
      const discAnterior = state.disciplinas.find((d) => d.id === updated.id);
      const mudouAtiva =
        discAnterior &&
        updated.ativa !== undefined &&
        Boolean(updated.ativa) !== (discAnterior.ativa !== false);

      const nextDisciplinas = state.disciplinas.map((d) => (d.id === updated.id ? { ...d, ...updated } : d));

      let nextCiclos = state.ciclos;
      if (mudouAtiva) {
        const targetProvaId = updated.provaId || discAnterior?.provaId || state.config?.provaAtivaId;
        const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);
        if (cicloExistente) {
          const ativas = nextDisciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);
          const totalMinutos =
            cicloExistente.tamanhoVoltaMinutos ||
            cicloExistente.blocos?.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
            TAMANHO_VOLTA_PADRAO_MINUTOS;

          if (ativas.length === 0) {
            nextCiclos = state.ciclos.map((c) =>
              c.id === cicloExistente.id ? { ...c, blocos: [] } : c
            );
          } else {
            const novosBlocos = calcularDistribuicaoCiclo({
              disciplinas: ativas,
              tamanhoVoltaMinutos: totalMinutos,
              duracaoSessaoMinutos: cicloExistente.duracaoSessaoMinutos || DURACAO_SESSAO_PADRAO_MINUTOS,
              modoFracionado: cicloExistente.modoFracionado !== undefined ? cicloExistente.modoFracionado : true,
            });

            const blocosFinais = transferirProgressoCiclo(novosBlocos, cicloExistente.blocos || []);

            nextCiclos = state.ciclos.map((c) =>
              c.id === cicloExistente.id ? { ...c, blocos: blocosFinais } : c
            );
          }
        }
      }

      return {
        ...state,
        disciplinas: nextDisciplinas,
        ciclos: nextCiclos,
      };
    }

    case ACTION_TYPES.TOGGLE_DISCIPLINA_ATIVA: {
      const payload = typeof action.payload === 'object' ? action.payload : { disciplinaId: action.payload };
      const { disciplinaId, ativa } = payload;
      const disc = state.disciplinas.find((d) => d.id === disciplinaId);
      if (!disc) return state;

      const novoStatus = ativa !== undefined ? Boolean(ativa) : (disc.ativa === false);
      const nextDisciplinas = state.disciplinas.map((d) =>
        d.id === disciplinaId ? { ...d, ativa: novoStatus } : d
      );

      const targetProvaId = disc.provaId || state.config?.provaAtivaId;
      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);

      let nextCiclos = state.ciclos;
      if (cicloExistente) {
        const ativas = nextDisciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);
        const totalMinutos =
          cicloExistente.tamanhoVoltaMinutos ||
          cicloExistente.blocos?.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
          TAMANHO_VOLTA_PADRAO_MINUTOS;

        if (ativas.length === 0) {
          nextCiclos = state.ciclos.map((c) =>
            c.id === cicloExistente.id ? { ...c, blocos: [] } : c
          );
        } else {
          const novosBlocos = calcularDistribuicaoCiclo({
            disciplinas: ativas,
            tamanhoVoltaMinutos: totalMinutos,
            duracaoSessaoMinutos: cicloExistente.duracaoSessaoMinutos || DURACAO_SESSAO_PADRAO_MINUTOS,
            modoFracionado: cicloExistente.modoFracionado !== undefined ? cicloExistente.modoFracionado : true,
          });

          const blocosFinais = transferirProgressoCiclo(novosBlocos, cicloExistente.blocos || []);

          nextCiclos = state.ciclos.map((c) =>
            c.id === cicloExistente.id ? { ...c, blocos: blocosFinais } : c
          );
        }
      }

      return {
        ...state,
        disciplinas: nextDisciplinas,
        ciclos: nextCiclos,
      };
    }

    case ACTION_TYPES.SET_DISCIPLINAS_ATIVAS: {
      const {
        provaId,
        ativasMap = {},
        tamanhoVoltaMinutos,
        duracaoSessaoMinutos,
        modoFracionado,
        porcentagensManuais,
        resetarProgresso = false,
      } = action.payload;
      const targetProvaId = provaId || state.config?.provaAtivaId;

      const nextDisciplinas = state.disciplinas.map((d) => {
        if (d.provaId !== targetProvaId || ativasMap[d.id] === undefined) return d;
        return { ...d, ativa: Boolean(ativasMap[d.id]) };
      });

      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);
      const ativas = nextDisciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);

      const totalMinutos =
        Number(tamanhoVoltaMinutos) ||
        cicloExistente?.tamanhoVoltaMinutos ||
        TAMANHO_VOLTA_PADRAO_MINUTOS;

      const duracaoSessaoFinal =
        Number(duracaoSessaoMinutos) ||
        cicloExistente?.duracaoSessaoMinutos ||
        state.config?.duracaoSessaoPadraoMinutos ||
        DURACAO_SESSAO_PADRAO_MINUTOS;

      const modoFracionadoFinal =
        modoFracionado !== undefined
          ? Boolean(modoFracionado)
          : cicloExistente?.modoFracionado !== undefined
          ? Boolean(cicloExistente.modoFracionado)
          : true;

      const porcentagensManuaisFinal =
        porcentagensManuais !== undefined
          ? porcentagensManuais
          : cicloExistente?.porcentagensManuais || null;

      let nextCiclos = state.ciclos;
      if (cicloExistente) {
        let blocosFinais = [];
        if (ativas.length > 0) {
          const novosBlocos = calcularDistribuicaoCiclo({
            disciplinas: ativas,
            tamanhoVoltaMinutos: totalMinutos,
            duracaoSessaoMinutos: duracaoSessaoFinal,
            modoFracionado: modoFracionadoFinal,
            porcentagensManuais: porcentagensManuaisFinal,
          });

          blocosFinais = resetarProgresso
            ? novosBlocos
            : transferirProgressoCiclo(novosBlocos, cicloExistente.blocos || []);
        }

        nextCiclos = state.ciclos.map((c) =>
          c.id === cicloExistente.id
            ? {
                ...c,
                tamanhoVoltaMinutos: totalMinutos,
                duracaoSessaoMinutos: duracaoSessaoFinal,
                modoFracionado: modoFracionadoFinal,
                porcentagensManuais: porcentagensManuaisFinal,
                blocos: blocosFinais,
                voltaAtual: resetarProgresso ? 1 : c.voltaAtual || 1,
              }
            : c
        );
      }


      return {
        ...state,
        disciplinas: nextDisciplinas,
        ciclos: nextCiclos,
      };
    }

    case ACTION_TYPES.DELETE_DISCIPLINA: {
      const discId = action.payload;
      const topicosDaDisc = new Set(state.topicos.filter((t) => t.disciplinaId === discId).map((t) => t.id));
      const sessoesDaDisc = new Set(state.sessoes.filter((s) => s.disciplinaId === discId).map((s) => s.id));

      return {
        ...state,
        disciplinas: state.disciplinas.filter((d) => d.id !== discId),
        topicos: state.topicos.filter((t) => t.disciplinaId !== discId),
        sessoes: state.sessoes.filter((s) => s.disciplinaId !== discId),
        revisoes: state.revisoes.filter((r) => !topicosDaDisc.has(r.topicoId) && !sessoesDaDisc.has(r.sessaoOrigemId)),
        ciclos: state.ciclos.map((c) => ({
          ...c,
          blocos: Array.isArray(c.blocos) ? c.blocos.filter((b) => b.disciplinaId !== discId) : [],
        })),
      };
    }

    // --- TÓPICOS ---
    case ACTION_TYPES.ADD_TOPICO: {
      return {
        ...state,
        topicos: [...state.topicos, action.payload],
      };
    }

    case ACTION_TYPES.UPDATE_TOPICO: {
      const updated = action.payload;
      return {
        ...state,
        topicos: state.topicos.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
      };
    }

    case ACTION_TYPES.TOGGLE_TOPICO_STATUS: {
      const { topicoId, campo, valor } = action.payload;
      return {
        ...state,
        topicos: state.topicos.map((t) => {
          if (t.id !== topicoId) return t;
          const currentStatus = t.status || { teoria: false, questoes: false, revisao: false };
          const novoValor = valor !== undefined ? Boolean(valor) : !currentStatus[campo];
          return {
            ...t,
            status: {
              ...currentStatus,
              [campo]: novoValor,
            },
          };
        }),
      };
    }

    case ACTION_TYPES.MOVE_TOPICO: {
      const { topicoId, direction } = action.payload; // 'up' ou 'down'
      const target = state.topicos.find((t) => t.id === topicoId);
      if (!target) return state;

      const siblings = state.topicos.filter(
        (t) => t.disciplinaId === target.disciplinaId && t.parentId === target.parentId
      );
      const index = siblings.findIndex((t) => t.id === topicoId);
      if (index === -1) return state;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return state;

      const siblingToSwap = siblings[targetIndex];

      const newTopicos = [...state.topicos];
      const posA = newTopicos.findIndex((t) => t.id === target.id);
      const posB = newTopicos.findIndex((t) => t.id === siblingToSwap.id);

      const temp = newTopicos[posA];
      newTopicos[posA] = newTopicos[posB];
      newTopicos[posB] = temp;

      return {
        ...state,
        topicos: newTopicos,
      };
    }

    case ACTION_TYPES.REORDER_TOPICOS: {
      const { orderedTopicoIds } = action.payload;
      if (!Array.isArray(orderedTopicoIds)) return state;

      const idMap = new Map();
      orderedTopicoIds.forEach((id, idx) => idMap.set(id, idx));

      const newTopicos = [...state.topicos].sort((a, b) => {
        const orderA = idMap.has(a.id) ? idMap.get(a.id) : 9999;
        const orderB = idMap.has(b.id) ? idMap.get(b.id) : 9999;
        return orderA - orderB;
      });

      return {
        ...state,
        topicos: newTopicos,
      };
    }

    case ACTION_TYPES.DELETE_TOPICO: {
      const topicoId = action.payload;
      const topicosIdsToDelete = new Set(
        state.topicos.filter((t) => t.id === topicoId || t.parentId === topicoId).map((t) => t.id)
      );
      return {
        ...state,
        topicos: state.topicos.filter((t) => !topicosIdsToDelete.has(t.id)),
        revisoes: state.revisoes.filter((r) => !topicosIdsToDelete.has(r.topicoId)),
        sessoes: state.sessoes.map((s) => (topicosIdsToDelete.has(s.topicoId) ? { ...s, topicoId: null } : s)),
      };
    }

    // --- SESSÕES E TEMPORIZADOR ATIVO ---
    case ACTION_TYPES.ADD_SESSAO: {
      const novaSessao = action.payload;
      const segundos = Number(novaSessao.segundosEstudo) || 0;
      const minutosSessao = segundos > 0 ? Math.max(1, Math.round(segundos / 60)) : 0;

      // 1. Atualiza as disciplinas com o último ponto de parada e último tópico estudado
      const nextDisciplinas = state.disciplinas.map((d) => {
        if (d.id === novaSessao.disciplinaId) {
          return {
            ...d,
            ultimoPontoDeParada:
              novaSessao.pontoDeParada !== undefined
                ? novaSessao.pontoDeParada || null
                : d.ultimoPontoDeParada || null,
            ultimoTopicoId: novaSessao.topicoId || d.ultimoTopicoId || null,
          };
        }
        return d;
      });

      // 2. Incrementa minutos feitos no ciclo da prova correspondente e avalia conclusão do bloco
      const disc = nextDisciplinas.find((d) => d.id === novaSessao.disciplinaId);
      const provaId = disc?.provaId || state.config?.provaAtivaId;

      const nextCiclos = state.ciclos.map((ciclo) => {
        if (ciclo.provaId !== provaId || !Array.isArray(ciclo.blocos)) return ciclo;

        let blocoAtualizado = false;
        let targetBlocoId = novaSessao.blocoId || null;
        if (!targetBlocoId) {
          const primeiroPendente = ciclo.blocos.find(
            (b) => b.disciplinaId === novaSessao.disciplinaId && !b.concluido && (b.minutosFeitos || 0) < b.minutosMeta
          );
          targetBlocoId = primeiroPendente?.id || null;
        }

        const updatedBlocos = ciclo.blocos.map((bloco) => {
          const isTarget = targetBlocoId
            ? bloco.id === targetBlocoId
            : (!blocoAtualizado && bloco.disciplinaId === novaSessao.disciplinaId);

          if (isTarget) {
            blocoAtualizado = true;
            const novosMinutos = (bloco.minutosFeitos || 0) + minutosSessao;
            // Se o usuário marcou explicitamente como concluído OU se atingiu/superou a meta do bloco
            const isConcluido =
              novaSessao.marcarComoConcluidoNoCiclo !== undefined
                ? Boolean(novaSessao.marcarComoConcluidoNoCiclo)
                : novosMinutos >= bloco.minutosMeta || Boolean(bloco.concluido);

            return {
              ...bloco,
              minutosFeitos: novosMinutos,
              concluido: isConcluido,
            };
          }
          return bloco;
        });

        // Fallback: se nenhum bloco estava pendente para a disciplina, acumula no último bloco dela
        if (!blocoAtualizado) {
          const lastIdx = ciclo.blocos.map((b) => b.disciplinaId).lastIndexOf(novaSessao.disciplinaId);
          if (lastIdx !== -1) {
            updatedBlocos[lastIdx] = {
              ...updatedBlocos[lastIdx],
              minutosFeitos: (updatedBlocos[lastIdx].minutosFeitos || 0) + minutosSessao,
            };
          }
        }

        // Quando todos os blocos fecham (meta atingida ou concluídos), avança a volta e recalcula prioridade
        const todosFechados =
          updatedBlocos.length > 0 &&
          updatedBlocos.every((b) => b.concluido || (b.minutosFeitos || 0) >= b.minutosMeta);

        if (todosFechados) {
          const disciplinasDaProva = nextDisciplinas.filter(
            (d) => d.provaId === ciclo.provaId && d.ativa !== false
          );
          const tamanhoVolta =
            ciclo.tamanhoVoltaMinutos ||
            ciclo.blocos.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
            TAMANHO_VOLTA_PADRAO_MINUTOS;

          const duracaoSessaoFinal =
            ciclo.duracaoSessaoMinutos ||
            state.config?.duracaoSessaoPadraoMinutos ||
            DURACAO_SESSAO_PADRAO_MINUTOS;

          const modoFracionadoFinal =
            ciclo.modoFracionado !== undefined ? Boolean(ciclo.modoFracionado) : true;

          const novosBlocos = disciplinasDaProva.length > 0
            ? calcularDistribuicaoCiclo({
                disciplinas: disciplinasDaProva,
                tamanhoVoltaMinutos: tamanhoVolta,
                duracaoSessaoMinutos: duracaoSessaoFinal,
                modoFracionado: modoFracionadoFinal,
              })
            : [];

          return {
            ...ciclo,
            voltaAtual: (ciclo.voltaAtual || 1) + 1,
            blocos: novosBlocos.map((b) => ({ ...b, concluido: false, minutosFeitos: 0 })),
            tamanhoVoltaMinutos: tamanhoVolta,
            duracaoSessaoMinutos: duracaoSessaoFinal,
            modoFracionado: modoFracionadoFinal,
            ultimaVoltaConcluidaEm: new Date().toISOString(),
          };
        }

        return {
          ...ciclo,
          blocos: updatedBlocos,
        };
      });

      return {
        ...state,
        disciplinas: nextDisciplinas,
        sessoes: [novaSessao, ...state.sessoes],
        ciclos: nextCiclos,
        sessaoAtiva: null,
      };
    }

    case ACTION_TYPES.DELETE_SESSAO: {
      return {
        ...state,
        sessoes: state.sessoes.filter((s) => s.id !== action.payload),
        revisoes: state.revisoes.filter((r) => r.sessaoOrigemId !== action.payload),
      };
    }

    case ACTION_TYPES.START_SESSAO_ATIVA: {
      const sessao = action.payload;
      return {
        ...state,
        sessaoAtiva: {
          ...sessao,
          origemDispositivo: sessao.origemDispositivo || getDeviceType(),
          inicioEpochMs: sessao.inicioEpochMs || Date.now(),
          ultimoHeartbeat: Date.now(),
          blocoNotificado: Boolean(sessao.blocoNotificado),
          encerradoPorPomodoro: Boolean(sessao.encerradoPorPomodoro),
        },
      };
    }

    case ACTION_TYPES.PAUSE_SESSAO_ATIVA: {
      if (!state.sessaoAtiva || state.sessaoAtiva.status === 'pausado') return state;
      const agora = Date.now();
      const tempoTrecho = state.sessaoAtiva.ultimoInicioIntervalo
        ? Math.max(0, agora - state.sessaoAtiva.ultimoInicioIntervalo)
        : 0;

      return {
        ...state,
        sessaoAtiva: {
          ...state.sessaoAtiva,
          status: 'pausado',
          acumuladoEstudoMs: (state.sessaoAtiva.acumuladoEstudoMs || 0) + tempoTrecho,
          ultimoInicioIntervalo: null,
          ultimoInicioPausa: agora,
          ultimoHeartbeat: agora,
        },
      };
    }

    case ACTION_TYPES.RESUME_SESSAO_ATIVA: {
      if (!state.sessaoAtiva || state.sessaoAtiva.status === 'rodando') return state;
      const agora = Date.now();
      const tempoPausa = state.sessaoAtiva.ultimoInicioPausa
        ? Math.max(0, agora - state.sessaoAtiva.ultimoInicioPausa)
        : 0;

      return {
        ...state,
        sessaoAtiva: {
          ...state.sessaoAtiva,
          status: 'rodando',
          acumuladoPausaMs: (state.sessaoAtiva.acumuladoPausaMs || 0) + tempoPausa,
          ultimoInicioPausa: null,
          ultimoInicioIntervalo: agora,
          ultimoHeartbeat: agora,
        },
      };
    }

    case ACTION_TYPES.UPDATE_SESSAO_ATIVA: {
      if (!state.sessaoAtiva) return state;
      return {
        ...state,
        sessaoAtiva: {
          ...state.sessaoAtiva,
          ...action.payload,
          ultimoHeartbeat: Date.now(),
        },
      };
    }

    case ACTION_TYPES.FINISH_POMODORO_SESSAO: {
      if (!state.sessaoAtiva) return state;
      const metaMs = (Number(state.sessaoAtiva.duracaoBlocoMinutos) || 25) * 60 * 1000;
      return {
        ...state,
        sessaoAtiva: {
          ...state.sessaoAtiva,
          status: 'pausado',
          blocoNotificado: true,
          encerradoPorPomodoro: true,
          acumuladoEstudoMs: metaMs,
          ultimoInicioIntervalo: null,
          ultimoInicioPausa: null,
          dataEncerramentoPomodoroISO: new Date().toISOString(),
          ultimoHeartbeat: Date.now(),
          ...action.payload,
        },
      };
    }

    case ACTION_TYPES.DISCARD_SESSAO_ATIVA:
    case ACTION_TYPES.CLEAR_SESSAO_ATIVA: {
      return {
        ...state,
        sessaoAtiva: null,
      };
    }

    // --- REVISÕES ---
    case ACTION_TYPES.ADD_REVISAO: {
      return {
        ...state,
        revisoes: [...state.revisoes, action.payload],
      };
    }

    case ACTION_TYPES.UPDATE_REVISAO: {
      const updated = action.payload;
      return {
        ...state,
        revisoes: state.revisoes.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      };
    }

    case ACTION_TYPES.CONCLUIR_REVISAO: {
      const { id, concluidaEm } = action.payload;
      return {
        ...state,
        revisoes: state.revisoes.map((r) =>
          r.id === id ? { ...r, status: 'concluida', concluidaEm: concluidaEm || new Date().toISOString() } : r
        ),
      };
    }

    case ACTION_TYPES.DELETE_REVISAO: {
      return {
        ...state,
        revisoes: state.revisoes.filter((r) => r.id !== action.payload),
      };
    }

    // --- CICLOS ---
    case ACTION_TYPES.UPDATE_CICLO: {
      const updated = action.payload;
      const exists = state.ciclos.some((c) => c.id === updated.id);
      return {
        ...state,
        ciclos: exists
          ? state.ciclos.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          : [...state.ciclos, updated],
      };
    }

    case ACTION_TYPES.REGENERATE_CICLO: {
      const {
        provaId,
        tamanhoVoltaMinutos,
        duracaoSessaoMinutos,
        modoFracionado,
        porcentagensManuais,
        resetarProgresso = false,
      } = action.payload;
      const targetProvaId = provaId || state.config?.provaAtivaId;
      const disciplinasDaProva = state.disciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);

      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);
      const totalMinutos =
        Number(tamanhoVoltaMinutos) ||
        cicloExistente?.tamanhoVoltaMinutos ||
        cicloExistente?.blocos?.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
        TAMANHO_VOLTA_PADRAO_MINUTOS;

      const duracaoSessaoFinal =
        Number(duracaoSessaoMinutos) ||
        cicloExistente?.duracaoSessaoMinutos ||
        state.config?.duracaoSessaoPadraoMinutos ||
        DURACAO_SESSAO_PADRAO_MINUTOS;

      const modoFracionadoFinal =
        modoFracionado !== undefined
          ? Boolean(modoFracionado)
          : cicloExistente?.modoFracionado !== undefined
          ? Boolean(cicloExistente.modoFracionado)
          : true;

      const porcentagensManuaisFinal =
        porcentagensManuais !== undefined
          ? porcentagensManuais
          : cicloExistente?.porcentagensManuais || null;

      const novosBlocos = disciplinasDaProva.length > 0
        ? calcularDistribuicaoCiclo({
            disciplinas: disciplinasDaProva,
            tamanhoVoltaMinutos: totalMinutos,
            duracaoSessaoMinutos: duracaoSessaoFinal,
            modoFracionado: modoFracionadoFinal,
            porcentagensManuais: porcentagensManuaisFinal,
          })
        : [];

      // Preserva os minutos estudados distribuindo sequencialmente pelos novos blocos
      const blocosFinais = resetarProgresso
        ? novosBlocos
        : transferirProgressoCiclo(novosBlocos, cicloExistente?.blocos || []);

      if (cicloExistente) {
        return {
          ...state,
          ciclos: state.ciclos.map((c) =>
            c.id === cicloExistente.id
              ? {
                  ...c,
                  tamanhoVoltaMinutos: totalMinutos,
                  duracaoSessaoMinutos: duracaoSessaoFinal,
                  modoFracionado: modoFracionadoFinal,
                  porcentagensManuais: porcentagensManuaisFinal,
                  blocos: blocosFinais,
                  voltaAtual: resetarProgresso ? 1 : c.voltaAtual || 1,
                }
              : c
          ),
        };
      } else {
        const novoCiclo = {
          id: `ciclo-${Date.now()}`,
          provaId: targetProvaId,
          voltaAtual: 1,
          tamanhoVoltaMinutos: totalMinutos,
          duracaoSessaoMinutos: duracaoSessaoFinal,
          modoFracionado: modoFracionadoFinal,
          porcentagensManuais: porcentagensManuaisFinal,
          blocos: blocosFinais,
        };
        return {
          ...state,
          ciclos: [...state.ciclos, novoCiclo],
        };
      }
    }

    case ACTION_TYPES.SET_PORCENTAGENS_MANUAIS_CICLO: {
      const {
        provaId,
        porcentagensManuais,
        resetarProgresso = false,
      } = action.payload;
      const targetProvaId = provaId || state.config?.provaAtivaId;
      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);
      const disciplinasDaProva = state.disciplinas.filter((d) => d.provaId === targetProvaId && d.ativa !== false);

      const totalMinutos = cicloExistente?.tamanhoVoltaMinutos || TAMANHO_VOLTA_PADRAO_MINUTOS;
      const duracaoSessaoFinal = cicloExistente?.duracaoSessaoMinutos || DURACAO_SESSAO_PADRAO_MINUTOS;
      const modoFracionadoFinal = cicloExistente?.modoFracionado !== undefined ? Boolean(cicloExistente.modoFracionado) : true;

      const novosBlocos = disciplinasDaProva.length > 0
        ? calcularDistribuicaoCiclo({
            disciplinas: disciplinasDaProva,
            tamanhoVoltaMinutos: totalMinutos,
            duracaoSessaoMinutos: duracaoSessaoFinal,
            modoFracionado: modoFracionadoFinal,
            porcentagensManuais: porcentagensManuais,
          })
        : [];

      const blocosFinais = resetarProgresso
        ? novosBlocos
        : transferirProgressoCiclo(novosBlocos, cicloExistente?.blocos || []);

      if (cicloExistente) {
        return {
          ...state,
          ciclos: state.ciclos.map((c) =>
            c.id === cicloExistente.id
              ? {
                  ...c,
                  porcentagensManuais: porcentagensManuais,
                  blocos: blocosFinais,
                  voltaAtual: resetarProgresso ? 1 : c.voltaAtual || 1,
                }
              : c
          ),
        };
      } else {
        const novoCiclo = {
          id: `ciclo-${Date.now()}`,
          provaId: targetProvaId,
          voltaAtual: 1,
          tamanhoVoltaMinutos: totalMinutos,
          duracaoSessaoMinutos: duracaoSessaoFinal,
          modoFracionado: modoFracionadoFinal,
          porcentagensManuais: porcentagensManuais,
          blocos: blocosFinais,
        };
        return {
          ...state,
          ciclos: [...state.ciclos, novoCiclo],
        };
      }
    }

    case ACTION_TYPES.TOGGLE_CONCLUIR_BLOCO_CICLO: {
      const { provaId, blocoId, disciplinaId, concluido } = action.payload;
      const targetProvaId = provaId || state.config?.provaAtivaId;

      const nextCiclos = state.ciclos.map((ciclo) => {
        if (ciclo.provaId !== targetProvaId || !Array.isArray(ciclo.blocos)) return ciclo;

        const updatedBlocos = ciclo.blocos.map((bloco) => {
          const isTarget = blocoId
            ? bloco.id === blocoId
            : bloco.disciplinaId === disciplinaId;

          if (isTarget) {
            const novoConcluido = concluido !== undefined ? Boolean(concluido) : !bloco.concluido;
            return {
              ...bloco,
              concluido: novoConcluido,
            };
          }
          return bloco;
        });

        const todosFechados =
          updatedBlocos.length > 0 &&
          updatedBlocos.every((b) => b.concluido || (b.minutosFeitos || 0) >= b.minutosMeta);

        if (todosFechados) {
          const disciplinasDaProva = state.disciplinas.filter(
            (d) => d.provaId === ciclo.provaId && d.ativa !== false
          );
          const tamanhoVolta =
            ciclo.tamanhoVoltaMinutos ||
            ciclo.blocos.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
            TAMANHO_VOLTA_PADRAO_MINUTOS;

          const duracaoSessaoFinal =
            ciclo.duracaoSessaoMinutos ||
            state.config?.duracaoSessaoPadraoMinutos ||
            DURACAO_SESSAO_PADRAO_MINUTOS;

          const modoFracionadoFinal =
            ciclo.modoFracionado !== undefined ? Boolean(ciclo.modoFracionado) : true;

          const novosBlocos = disciplinasDaProva.length > 0
            ? calcularDistribuicaoCiclo({
                disciplinas: disciplinasDaProva,
                tamanhoVoltaMinutos: tamanhoVolta,
                duracaoSessaoMinutos: duracaoSessaoFinal,
                modoFracionado: modoFracionadoFinal,
              })
            : [];

          return {
            ...ciclo,
            voltaAtual: (ciclo.voltaAtual || 1) + 1,
            blocos: novosBlocos.map((b) => ({ ...b, concluido: false, minutosFeitos: 0 })),
            tamanhoVoltaMinutos: tamanhoVolta,
            duracaoSessaoMinutos: duracaoSessaoFinal,
            modoFracionado: modoFracionadoFinal,
            ultimaVoltaConcluidaEm: new Date().toISOString(),
          };
        }

        return {
          ...ciclo,
          blocos: updatedBlocos,
        };
      });

      return {
        ...state,
        ciclos: nextCiclos,
      };
    }

    case ACTION_TYPES.REORDER_CICLO_BLOCOS: {
      const { cicloId, blocos } = action.payload;
      const nextCiclos = state.ciclos.map((c) =>
        c.id === cicloId ? { ...c, blocos } : c
      );
      return {
        ...state,
        ciclos: nextCiclos,
      };
    }

    // --- IMPORTAÇÃO DE EDITAL (FASE 6) ---
    case ACTION_TYPES.IMPORT_EDITAL: {
      const { provaId, modo = 'mesclar', disciplinas = [] } = action.payload;
      const targetProvaId = provaId || state.config?.provaAtivaId;
      if (!targetProvaId || !disciplinas.length) return state;

      let baseDisciplinas = [...state.disciplinas];
      let baseTopicos = [...state.topicos];
      let baseSessoes = [...state.sessoes];
      let baseRevisoes = [...state.revisoes];

      // Se o modo for 'substituir', remove as disciplinas e tópicos atuais da prova
      if (modo === 'substituir') {
        const discIdsAntigas = new Set(
          state.disciplinas.filter((d) => d.provaId === targetProvaId).map((d) => d.id)
        );
        baseDisciplinas = baseDisciplinas.filter((d) => d.provaId !== targetProvaId);
        baseTopicos = baseTopicos.filter((t) => !discIdsAntigas.has(t.disciplinaId));
        baseRevisoes = baseRevisoes.filter((r) => !discIdsAntigas.has(r.disciplinaId));
      }

      const novasDisciplinas = [];
      const novosTopicos = [];
      const timestamp = Date.now();
      const corBaseOffset = baseDisciplinas.length;

      disciplinas.forEach((itemDisc, idx) => {
        const discId = `disc-${timestamp}-${idx}`;
        const corIndex = (corBaseOffset + idx) % PALETA_CORES_DISCIPLINA.length;
        const corEscolhida = itemDisc.cor || PALETA_CORES_DISCIPLINA[corIndex].hex;

        const novaDisc = {
          id: discId,
          provaId: targetProvaId,
          nome: itemDisc.nome.trim(),
          cor: corEscolhida,
          peso: Math.max(1, Math.min(10, Number(itemDisc.pesoSugerido || itemDisc.peso) || 5)),
          dificuldade: 3,
          dominio: 0,
          ativa: true,
        };
        novasDisciplinas.push(novaDisc);

        // Tópicos e Subtópicos
        const topicosArray = Array.isArray(itemDisc.topicos) ? itemDisc.topicos : [];
        topicosArray.forEach((itemTopico, tIdx) => {
          const topicoId = `topico-${timestamp}-${idx}-${tIdx}`;
          const novoTopico = {
            id: topicoId,
            disciplinaId: discId,
            parentId: null,
            nome: (itemTopico.nome || `Tópico ${tIdx + 1}`).trim(),
            status: { teoria: false, questoes: false, revisao: false },
          };
          novosTopicos.push(novoTopico);

          // Subtópicos
          const subtopicosArray = Array.isArray(itemTopico.subtopicos) ? itemTopico.subtopicos : [];
          subtopicosArray.forEach((subNome, sIdx) => {
            const subId = `topico-${timestamp}-${idx}-${tIdx}-${sIdx}`;
            novosTopicos.push({
              id: subId,
              disciplinaId: discId,
              parentId: topicoId,
              nome: String(subNome).trim(),
              status: { teoria: false, questoes: false, revisao: false },
            });
          });
        });
      });

      const todasDisciplinasFinais = [...baseDisciplinas, ...novasDisciplinas];
      const todosTopicosFinais = [...baseTopicos, ...novosTopicos];

      // Regenera o ciclo da prova alvo com as novas matérias ativas
      const disciplinasDaProvaAtualizada = todasDisciplinasFinais.filter(
        (d) => d.provaId === targetProvaId && d.ativa !== false
      );

      const cicloExistente = state.ciclos.find((c) => c.provaId === targetProvaId);
      const tamanhoVolta =
        cicloExistente?.tamanhoVoltaMinutos || TAMANHO_VOLTA_PADRAO_MINUTOS;

      const novosBlocos = disciplinasDaProvaAtualizada.length > 0
        ? calcularDistribuicaoCiclo({
            disciplinas: disciplinasDaProvaAtualizada,
            tamanhoVoltaMinutos: tamanhoVolta,
          })
        : [];

      let nextCiclos;
      if (cicloExistente) {
        nextCiclos = state.ciclos.map((c) =>
          c.id === cicloExistente.id
            ? {
                ...c,
                blocos: novosBlocos,
                voltaAtual: modo === 'substituir' ? 1 : c.voltaAtual || 1,
              }
            : c
        );
      } else {
        nextCiclos = [
          ...state.ciclos,
          {
            id: `ciclo-${timestamp}`,
            provaId: targetProvaId,
            voltaAtual: 1,
            tamanhoVoltaMinutos: tamanhoVolta,
            blocos: novosBlocos,
          },
        ];
      }

      return {
        ...state,
        disciplinas: todasDisciplinasFinais,
        topicos: todosTopicosFinais,
        sessoes: baseSessoes,
        revisoes: baseRevisoes,
        ciclos: nextCiclos,
      };
    }

    default:
      return state;
  }
}

/**
 * Envolve o reducer canônico garantindo que toda e qualquer mutação do usuário
 * receba um timestamp updatedAt atualizado em tempo real (ISO string).
 * Ações de carregamento direto (SET_STATE) preservam o timestamp de origem.
 */
function studyReducer(state, action) {
  if (action.type === ACTION_TYPES.SET_STATE) {
    return { ...action.payload };
  }

  const nextState = baseStudyReducer(state, action);
  if (nextState === state) {
    return state;
  }

  const nowISO = new Date().toISOString();
  return {
    ...nextState,
    updatedAt: nowISO,
    config: {
      ...nextState.config,
      updatedAt: nowISO,
    },
  };
}

export function StudyProvider({ children }) {
  // Inicialização síncrona pelo storage para evitar flash de tela em branco
  const [state, dispatch] = useReducer(studyReducer, null, () => {
    return loadState();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Estados de autenticação e sincronização na nuvem (Firestore)
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('local'); // 'local' | 'sincronizado' | 'sincronizando' | 'erro'
  const [syncMessage, setSyncMessage] = useState('Modo local (conecte sua conta Google no PC e celular para sincronizar)');
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState(null);
  const [ultimaAlteracaoRemota, setUltimaAlteracaoRemota] = useState(null);
  const [dispositivoRemoto, setDispositivoRemoto] = useState(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const initialSyncDoneRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  const prevSessaoAtivaRef = useRef(state?.sessaoAtiva);
  const dispositivoAtual = useMemo(() => getDeviceType(), []);

  // Monitora autenticação Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setSyncStatus('local');
        setSyncMessage('Modo local (conecte sua conta Google para sincronizar)');
        initialSyncDoneRef.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitora alterações remotas no Firestore quando logado (escuta em tempo real onSnapshot com resolução por último timestamp)
  useEffect(() => {
    if (!currentUser) {
      initialSyncDoneRef.current = false;
      return;
    }

    const pathDoc = `users/${currentUser.uid}/study/current`;
    const docRef = doc(db, 'users', currentUser.uid, 'study', 'current');

    setSyncStatus('sincronizando');
    setSyncMessage('Verificando versão mais recente na nuvem...');

    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        // Ignora se o snapshot for apenas um eco de escrita pendente deste próprio cliente
        if (docSnap.metadata.hasPendingWrites) {
          return;
        }

        if (docSnap.exists()) {
          const remoteDoc = docSnap.data();
          const decision = resolveSyncConflict(stateRef.current, remoteDoc);

          if (decision === 'APPLY_REMOTE') {
            // Remoto é estritamente mais recente no tempo (ou local estava vazio)
            isRemoteUpdateRef.current = true;
            dispatch({ type: ACTION_TYPES.SET_STATE, payload: remoteDoc.data });
            saveState(remoteDoc.data);
            setSyncStatus('sincronizado');
            const horaRemota = remoteDoc.updatedAt || new Date().toISOString();
            setUltimaSincronizacao(horaRemota);
            setUltimaAlteracaoRemota(horaRemota);
            setDispositivoRemoto(remoteDoc.lastDevice || 'Outro dispositivo');
            setSyncMessage(`Atualizado com base na alteração mais recente (${remoteDoc.lastDevice || 'Outro dispositivo'})`);
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
              initialSyncDoneRef.current = true;
            }, 300);
          } else if (decision === 'UPLOAD_LOCAL') {
            // Local é estritamente mais recente no tempo
            const payloadTime = stateRef.current?.config?.updatedAt || stateRef.current?.updatedAt || new Date().toISOString();
            setDoc(docRef, {
              userId: currentUser.uid,
              data: stateRef.current,
              updatedAt: payloadTime,
              lastDevice: dispositivoAtual,
            })
              .then(() => {
                setSyncStatus('sincronizado');
                setUltimaSincronizacao(payloadTime);
                setSyncMessage(`Alterações locais mais recentes deste ${dispositivoAtual.toLowerCase()} sincronizadas com a nuvem`);
                initialSyncDoneRef.current = true;
              })
              .catch((err) => {
                console.error('Erro ao enviar dados locais mais recentes:', err);
                setSyncStatus('erro');
                setSyncMessage('Erro ao enviar alteração local para a nuvem');
              });
          } else {
            // Já sincronizados (mesmo timestamp)
            setSyncStatus('sincronizado');
            const horaRemota = remoteDoc.updatedAt || new Date().toISOString();
            setUltimaSincronizacao(horaRemota);
            setUltimaAlteracaoRemota(horaRemota);
            setDispositivoRemoto(remoteDoc.lastDevice || 'Outro dispositivo');
            setSyncMessage('Sincronizado! Dados na versão mais recente.');
            initialSyncDoneRef.current = true;
          }
        } else {
          // Documento na nuvem ainda não existe: envia o estado local se houver dados cadastrados
          if (hasRealData(stateRef.current)) {
            const payloadTime = stateRef.current?.config?.updatedAt || stateRef.current?.updatedAt || new Date().toISOString();
            setDoc(
              docRef,
              {
                userId: currentUser.uid,
                data: stateRef.current,
                updatedAt: payloadTime,
                lastDevice: dispositivoAtual,
              },
              { merge: true }
            )
              .then(() => {
                setSyncStatus('sincronizado');
                setUltimaSincronizacao(payloadTime);
                setSyncMessage('Dados locais salvos na nuvem com sucesso');
                initialSyncDoneRef.current = true;
              })
              .catch((err) => {
                handleFirestoreError(err, OperationType.WRITE, pathDoc);
              });
          } else {
            setSyncStatus('sincronizado');
            setSyncMessage('Nuvem conectada e pronta.');
            initialSyncDoneRef.current = true;
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathDoc);
        setSyncStatus('erro');
        setSyncMessage('Falha ao conectar com o banco de dados na nuvem');
      }
    );

    return () => unsubscribe();
  }, [currentUser, dispositivoAtual]);

  // Persiste no localStorage sempre que houver mutação E envia ao Firestore (imediato para sessões, debounced para edições)
  useEffect(() => {
    stateRef.current = state;
    if (state) {
      saveState(state);

      // Se a mutação veio do Firestore remoto, não reenvia para evitar loop
      if (isRemoteUpdateRef.current || !currentUser) {
        prevSessaoAtivaRef.current = state.sessaoAtiva;
        return;
      }

      // Não envia antes de o handshake inicial de comparação de timestamps ter sido concluído!
      if (!initialSyncDoneRef.current) {
        prevSessaoAtivaRef.current = state.sessaoAtiva;
        return;
      }

      // Detecta se a mutação foi especificamente no estado da sessão ativa (Play, Pause, Resume, Stop, Discard)
      const sessaoMudou = state.sessaoAtiva !== prevSessaoAtivaRef.current;
      prevSessaoAtivaRef.current = state.sessaoAtiva;

      setSyncStatus('sincronizando');
      setSyncMessage('Salvando alterações na nuvem...');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      // Sessões ativas sincronizam imediatamente (0ms) para que, se o celular descarregar 1s depois,
      // o estado já esteja persistido no Firestore! Edições de formulário usam 700ms debounce.
      const delay = sessaoMudou ? 0 : 700;

      syncTimeoutRef.current = setTimeout(async () => {
        const pathDoc = `users/${currentUser.uid}/study/current`;
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'study', 'current');
          const payloadTime = state.config?.updatedAt || state.updatedAt || new Date().toISOString();
          await setDoc(docRef, {
            userId: currentUser.uid,
            data: state,
            updatedAt: payloadTime,
            lastDevice: dispositivoAtual,
          });
          setSyncStatus('sincronizado');
          setUltimaSincronizacao(payloadTime);
          setSyncMessage('Sincronizado! Dados atualizados na nuvem.');
        } catch (err) {
          console.error('Erro ao sincronizar com Firestore:', err);
          setSyncStatus('erro');
          setSyncMessage('Erro de conexão ao salvar na nuvem.');
        }
      }, delay);
    }
  }, [state, currentUser, dispositivoAtual]);

  // Heartbeat do cronômetro ativo a cada 20 segundos enquanto a sessão estiver rodando
  // Registra no Firestore que o dispositivo estava ativo até este momento exato antes de descarregar
  useEffect(() => {
    if (!currentUser || !state?.sessaoAtiva || state.sessaoAtiva.status !== 'rodando') {
      return;
    }

    const interval = setInterval(async () => {
      const currentState = stateRef.current;
      if (!currentState?.sessaoAtiva || currentState.sessaoAtiva.status !== 'rodando') return;

      const agoraEpoch = Date.now();
      const updatedSessaoAtiva = {
        ...currentState.sessaoAtiva,
        ultimoHeartbeat: agoraEpoch,
        ultimoHeartbeatISO: new Date(agoraEpoch).toISOString(),
      };

      const nextState = {
        ...currentState,
        sessaoAtiva: updatedSessaoAtiva,
        updatedAt: new Date(agoraEpoch).toISOString(),
      };

      stateRef.current = nextState;
      saveState(nextState);

      try {
        const docRef = doc(db, 'users', currentUser.uid, 'study', 'current');
        await setDoc(docRef, {
          userId: currentUser.uid,
          data: nextState,
          updatedAt: nextState.updatedAt,
          lastDevice: dispositivoAtual,
        });
      } catch (e) {
        // Ignora oscilações transitórias de heartbeat em segundo plano
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [currentUser, state?.sessaoAtiva?.status, dispositivoAtual]);

  // Força uma sincronização manual imediata comparando com o servidor
  const forcarSincronizacao = useCallback(async () => {
    if (!currentUser) {
      await loginComGoogle();
      return;
    }

    setIsSyncingManual(true);
    setSyncStatus('sincronizando');
    setSyncMessage('Consultando versão mais recente no servidor...');

    const pathDoc = `users/${currentUser.uid}/study/current`;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'study', 'current');
      const docSnap = await getDocFromServer(docRef);

      if (docSnap.exists()) {
        const remoteDoc = docSnap.data();
        const decision = resolveSyncConflict(stateRef.current, remoteDoc);

        if (decision === 'APPLY_REMOTE') {
          isRemoteUpdateRef.current = true;
          dispatch({ type: ACTION_TYPES.SET_STATE, payload: remoteDoc.data });
          saveState(remoteDoc.data);
          setSyncStatus('sincronizado');
          const horaRemota = remoteDoc.updatedAt || new Date().toISOString();
          setUltimaSincronizacao(horaRemota);
          setUltimaAlteracaoRemota(horaRemota);
          setDispositivoRemoto(remoteDoc.lastDevice || 'Outro dispositivo');
          setSyncMessage(`Atualizado! Aplicada versão mais recente de ${remoteDoc.lastDevice || 'outro dispositivo'}.`);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
            initialSyncDoneRef.current = true;
          }, 300);
        } else if (decision === 'UPLOAD_LOCAL') {
          const payloadTime = stateRef.current?.config?.updatedAt || stateRef.current?.updatedAt || new Date().toISOString();
          await setDoc(docRef, {
            userId: currentUser.uid,
            data: stateRef.current,
            updatedAt: payloadTime,
            lastDevice: dispositivoAtual,
          });
          setSyncStatus('sincronizado');
          setUltimaSincronizacao(payloadTime);
          setSyncMessage(`Sincronizado! Dados mais recentes deste ${dispositivoAtual.toLowerCase()} enviados.`);
          initialSyncDoneRef.current = true;
        } else {
          setSyncStatus('sincronizado');
          const horaRemota = remoteDoc.updatedAt || new Date().toISOString();
          setUltimaSincronizacao(horaRemota);
          setUltimaAlteracaoRemota(horaRemota);
          setDispositivoRemoto(remoteDoc.lastDevice || 'Outro dispositivo');
          setSyncMessage('Tudo em dia! Este aparelho e a nuvem já possuem exatamente os mesmos dados.');
          initialSyncDoneRef.current = true;
        }
      } else {
        const payloadTime = stateRef.current?.config?.updatedAt || stateRef.current?.updatedAt || new Date().toISOString();
        await setDoc(docRef, {
          userId: currentUser.uid,
          data: stateRef.current,
          updatedAt: payloadTime,
          lastDevice: dispositivoAtual,
        });
        setSyncStatus('sincronizado');
        setUltimaSincronizacao(payloadTime);
        setSyncMessage('Dados locais enviados com sucesso para a nuvem.');
        initialSyncDoneRef.current = true;
      }
    } catch (err) {
      console.error('Erro na sincronização manual:', err);
      setSyncStatus('erro');
      setSyncMessage('Erro ao consultar servidor Firestore');
    } finally {
      setIsSyncingManual(false);
    }
  }, [currentUser, dispositivoAtual]);

  // Prova ativa atual
  const provaAtiva = useMemo(() => {
    if (!state?.provas?.length) return null;
    return state.provas.find((p) => p.id === state.config?.provaAtivaId) || state.provas[0];
  }, [state?.provas, state?.config?.provaAtivaId]);

  // Disciplinas da prova ativa (todas para histórico, estatísticas e tópicos)
  const disciplinasDaProva = useMemo(() => {
    if (!provaAtiva) return [];
    return state.disciplinas.filter((d) => d.provaId === provaAtiva.id);
  }, [state.disciplinas, provaAtiva]);

  // Disciplinas ativas da prova (que entram no ciclo e no plano de estudos)
  const disciplinasAtivasDaProva = useMemo(() => {
    return disciplinasDaProva.filter((d) => d.ativa !== false);
  }, [disciplinasDaProva]);

  // Disciplinas pausadas / inativas da prova
  const disciplinasInativasDaProva = useMemo(() => {
    return disciplinasDaProva.filter((d) => d.ativa === false);
  }, [disciplinasDaProva]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      provaAtiva,
      disciplinasDaProva,
      disciplinasAtivasDaProva,
      disciplinasInativasDaProva,
      currentUser,
      authReady,
      syncStatus,
      syncMessage,
      ultimaSincronizacao,
      ultimaAlteracaoLocal: state?.config?.updatedAt || state?.updatedAt,
      ultimaAlteracaoRemota,
      dispositivoRemoto,
      dispositivoAtual,
      forcarSincronizacao,
      isSyncingManual,
      loginComGoogle,
      logoutFirebase,
    }),
    [
      state,
      provaAtiva,
      disciplinasDaProva,
      disciplinasAtivasDaProva,
      disciplinasInativasDaProva,
      currentUser,
      authReady,
      syncStatus,
      syncMessage,
      ultimaSincronizacao,
      ultimaAlteracaoRemota,
      dispositivoRemoto,
      dispositivoAtual,
      forcarSincronizacao,
      isSyncingManual,
    ]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudyStore() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudyStore deve ser utilizado dentro de um StudyProvider');
  }
  return context;
}
