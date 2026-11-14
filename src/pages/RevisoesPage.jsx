import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { useStudyStore, ACTION_TYPES } from '../store/StudyContext.jsx';
import { formatarData } from '../lib/dateUtils.js';

export function RevisoesPage() {
  const { state, dispatch } = useStudyStore();
  const [filtro, setFiltro] = useState('pendentes'); // 'pendentes' | 'concluidas' | 'todas'

  const revisoes = state.revisoes || [];
  const pendentes = revisoes.filter((r) => r.status === 'pendente');
  const concluidas = revisoes.filter((r) => r.status === 'concluida');

  const revisoesFiltradas = revisoes.filter((r) => {
    if (filtro === 'pendentes') return r.status === 'pendente';
    if (filtro === 'concluidas') return r.status === 'concluida';
    return true;
  });

  const handleConcluir = (id) => {
    dispatch({
      type: ACTION_TYPES.CONCLUIR_REVISAO,
      payload: { id, concluidaEm: new Date().toISOString() },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header com filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1d2c4c]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Revisão Espaçada
            </span>            
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            Revisões Programadas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {pendentes.length} revisões pendentes para consolidar a curva de esquecimento.
          </p>
        </div>

        <Tabs
          tabs={[
            { id: 'pendentes', label: 'Pendentes', badge: pendentes.length },
            { id: 'concluidas', label: 'Concluídas', badge: concluidas.length },
            { id: 'todas', label: 'Todas' },
          ]}
          activeTab={filtro}
          onChange={setFiltro}
        />
      </div>

      {revisoes.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Nenhuma revisão gerada ainda"
          description="Ao estudar matérias ou resolver questões, o sistema agenda revisões de 24h, 7d, 15d e 30d automaticamente."
          actionLabel="Carregar Dados de Exemplo"
          actionIcon={Sparkles}
          onAction={() => dispatch({ type: ACTION_TYPES.LOAD_SAMPLE_DATA })}
        />
      ) : revisoesFiltradas.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={filtro === 'pendentes' ? 'Tudo em dia!' : 'Nenhuma revisão encontrada'}
          description={
            filtro === 'pendentes'
              ? 'Você não tem revisões pendentes no momento. Bom trabalho!'
              : 'Nenhuma revisão encontrada para o filtro selecionado.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {revisoesFiltradas.map((rev) => {
            const topico = state.topicos.find((t) => t.id === rev.topicoId);
            const disc = topico
              ? state.disciplinas.find((d) => d.id === topico.disciplinaId)
              : null;
            const isPendente = rev.status === 'pendente';

            return (
              <Card
                key={rev.id}
                className={`p-4 transition-all border-[#1d2c4c] ${
                  isPendente ? 'bg-[#121c33]' : 'bg-[#0f172a]/60 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: disc?.cor || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          R{rev.numero}/{rev.total}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 truncate">
                          {disc?.nome || 'Disciplina'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5 truncate">
                        {topico?.nome || 'Tópico de Estudo'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Data prevista: {formatarData(rev.dataPrevista)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPendente ? (
                      <Button
                        variant="emerald"
                        size="xs"
                        icon={Check}
                        onClick={() => handleConcluir(rev.id)}
                      >
                        Marcar Concluída
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
