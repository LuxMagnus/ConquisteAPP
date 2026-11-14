import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card.jsx';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { TrendingUp, HelpCircle, Filter, Target, Edit2, Check, Sparkles } from 'lucide-react';

export function EvolucaoAcertosLinha({
  dadosLinha = [],
  tipoGranularidade = 'semana',
  filtroTempoLabel = '',
  metaAcertos = 80,
  onSalvarMetaAcertos,
}) {
  const [isModalMetaOpen, setIsModalMetaOpen] = useState(false);
  const [metaTemp, setMetaTemp] = useState(metaAcertos);
  const [metaSalvaSucesso, setMetaSalvaSucesso] = useState(false);

  const temDados = dadosLinha.length > 0;
  const metaValida = Number(metaAcertos) || 80;

  const handleAbrirModal = () => {
    setMetaTemp(metaValida);
    setMetaSalvaSucesso(false);
    setIsModalMetaOpen(true);
  };

  const handleSalvar = (e) => {
    if (e) e.preventDefault();
    const valor = Math.min(100, Math.max(1, Number(metaTemp) || 80));
    if (onSalvarMetaAcertos) {
      onSalvarMetaAcertos(valor);
    }
    setMetaSalvaSucesso(true);
    setTimeout(() => {
      setIsModalMetaOpen(false);
      setMetaSalvaSucesso(false);
    }, 400);
  };

  const presets = [65, 70, 75, 80, 85, 90];

  return (
    <>
      <Card className="bg-[#121c33] border-[#1d2c4c] overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2 border-b border-[#1d2c4c]/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <CardTitle className="text-base text-white">
                  Evolução do % de Acerto {tipoGranularidade === 'dia' ? 'Diário' : 'Semanal'}
                </CardTitle>
                {filtroTempoLabel && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    {filtroTempoLabel}
                  </span>
                )}
              </div>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Trajetória do aproveitamento em exercícios {tipoGranularidade === 'dia' ? 'dia a dia' : 'semana a semana'} no período.
              </CardDescription>
            </div>

            {/* Badge Editável da Meta do Concurso */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={handleAbrirModal}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 font-medium transition-all cursor-pointer shadow-sm active:scale-95"
                title="Clique para editar a meta de acertos do concurso"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
                <span>Meta Concurso: {metaValida}%</span>
                <Edit2 className="w-3 h-3 text-emerald-400/80 group-hover:text-emerald-200 ml-0.5" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3 pb-4 flex-1 flex flex-col justify-center">
          {!temDados ? (
            <div className="h-60 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <HelpCircle className="w-8 h-8 text-slate-600" />
              <span>Nenhuma sessão com exercícios registrada</span>
            </div>
          ) : (
            <div className="w-full h-64 sm:h-72 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dadosLinha}
                  margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d2c4c" vertical={false} />
                  <XAxis
                    dataKey="semanaLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#1d2c4c' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#1d2c4c' }}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomLineTooltip metaAcertos={metaValida} />} />

                  {/* Linha de referência da meta configurada */}
                  <ReferenceLine
                    y={metaValida}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Meta: ${metaValida}%`,
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="taxaAcerto"
                    name="Taxa de Acerto"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: '#0b1120', stroke: '#38bdf8', strokeWidth: 2, r: 5 }}
                    activeDot={{
                      fill: '#38bdf8',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      r: 7,
                      filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))',
                    }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Resumo inferior */}
          {temDados && (
            <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-[#1d2c4c]/50 text-slate-400">
              <span>
                {dadosLinha.length}{' '}
                {tipoGranularidade === 'dia'
                  ? dadosLinha.length === 1
                    ? 'dia avaliado'
                    : 'dias avaliados'
                  : dadosLinha.length === 1
                  ? 'semana avaliada'
                  : 'semanas avaliadas'}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span>% Acertos</span>
                </span>
                <button
                  type="button"
                  onClick={handleAbrirModal}
                  className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors cursor-pointer"
                  title="Clique para editar"
                >
                  <span className="w-2.5 h-0.5 bg-emerald-500" />
                  <span>Meta ({metaValida}%)</span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição da Meta de Acertos do Concurso */}
      <Modal
        isOpen={isModalMetaOpen}
        onClose={() => setIsModalMetaOpen(false)}
        title="Editar Meta de Acertos do Concurso"
        description="Defina a porcentagem de acertos desejada nos exercícios para calibrar a linha de corte do seu concurso."
        maxWidth="max-w-md"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalMetaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={metaSalvaSucesso ? Check : Target}
              onClick={handleSalvar}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {metaSalvaSucesso ? 'Salvo!' : 'Salvar Meta'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div className="bg-[#0b1120] p-4 rounded-xl border border-[#1d2c4c] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="metaAcertosInput" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Porcentagem de Acertos Alvo</span>
              </label>
              <div className="flex items-center gap-1 bg-[#121c33] px-3 py-1 rounded-lg border border-emerald-500/40">
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {metaTemp}%
                </span>
              </div>
            </div>

            {/* Slider de 50% a 95% */}
            <input
              id="metaAcertosInput"
              type="range"
              min="50"
              max="95"
              step="1"
              value={metaTemp}
              onChange={(e) => setMetaTemp(Number(e.target.value))}
              className="w-full h-2 bg-[#121c33] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            {/* Presets Rápidos */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-400 mb-1.5">Valores recomendados para concursos:</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMetaTemp(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      metaTemp === val
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-[#121c33] text-slate-300 border-[#1d2c4c] hover:border-slate-500'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/20 text-[11px] text-slate-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              A linha de meta verde no gráfico de evolução e nos indicadores de status será atualizada imediatamente para <strong>{metaTemp}%</strong>.
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}

function CustomLineTooltip({ active, payload, metaAcertos = 80 }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { taxaAcerto, questoesFeitas, questoesAcertos, questoesErros, labelCompleto } = data;

    return (
      <div className="bg-[#0f172a] border border-[#22355c] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px]">
        <div className="flex items-center justify-between pb-1 border-b border-[#1e293b]">
          <span className="font-bold text-white text-xs">{labelCompleto}</span>
          <span
            className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
              taxaAcerto >= metaAcertos
                ? 'text-emerald-400 bg-emerald-950/40'
                : taxaAcerto >= metaAcertos - 15
                ? 'text-amber-400 bg-amber-950/40'
                : 'text-rose-400 bg-rose-950/40'
            }`}
          >
            {taxaAcerto}%
          </span>
        </div>

        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Acertos:</span>
            <strong className="font-mono text-emerald-400">
              {questoesAcertos} de {questoesFeitas} ({taxaAcerto}%)
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Erros:</span>
            <strong className="font-mono text-rose-400">{questoesErros}</strong>
          </div>
          <div className="flex justify-between pt-1 border-t border-[#1e293b]/70">
            <span className="text-slate-400">Status da Meta ({metaAcertos}%):</span>
            <strong
              className={`font-semibold ${
                taxaAcerto >= metaAcertos ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {taxaAcerto >= metaAcertos
                ? `Atingida (≥ ${metaAcertos}%)`
                : `${metaAcertos - taxaAcerto}% abaixo da meta`}
            </strong>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
