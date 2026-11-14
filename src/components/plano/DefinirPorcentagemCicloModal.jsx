import React, { useState, useEffect, useMemo } from 'react';
import { Percent, Sparkles, Sliders, RotateCw, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';
import { calcularPrioridade } from '../../lib/materiaUtils.js';

export function DefinirPorcentagemCicloModal({
  isOpen,
  onClose,
  ciclo,
  disciplinas = [],
  onSalvarPorcentagens,
}) {
  const ativas = useMemo(() => {
    return disciplinas.filter((d) => d.ativa !== false);
  }, [disciplinas]);

  const totalMinutos = ciclo?.tamanhoVoltaMinutos || 1200;

  // Calcula os percentuais sugeridos pela fórmula original
  const percentuaisOriginais = useMemo(() => {
    if (ativas.length === 0) return {};
    const prioridades = ativas.map((d) => {
      let p = calcularPrioridade(d.peso, d.dificuldade, d.dominio);
      if (p <= 0) p = (Number(d.peso) || 1) * (Number(d.dificuldade) || 1) * 0.05;
      return { id: d.id, prioridade: p };
    });
    const soma = prioridades.reduce((acc, item) => acc + item.prioridade, 0);
    const mapa = {};
    prioridades.forEach((item) => {
      mapa[item.id] = soma > 0 ? Math.round((item.prioridade / soma) * 100) : Math.round(100 / ativas.length);
    });
    // Ajusta resíduo para fechar em 100
    const somaCalculada = Object.values(mapa).reduce((acc, v) => acc + v, 0);
    const diff = 100 - somaCalculada;
    if (diff !== 0 && prioridades.length > 0) {
      mapa[prioridades[0].id] = Math.max(5, (mapa[prioridades[0].id] || 0) + diff);
    }
    return mapa;
  }, [ativas]);

  // Modo: 'manual' ou 'formula'
  const [modo, setModo] = useState('formula');
  const [valores, setValores] = useState({});

  useEffect(() => {
    if (isOpen) {
      const temManualExistente =
        ciclo?.porcentagensManuais &&
        Object.keys(ciclo.porcentagensManuais).length > 0 &&
        ativas.some((d) => ciclo.porcentagensManuais[d.id] !== undefined);

      if (temManualExistente) {
        setModo('manual');
        const initial = {};
        ativas.forEach((d) => {
          initial[d.id] =
            ciclo.porcentagensManuais[d.id] !== undefined
              ? Number(ciclo.porcentagensManuais[d.id])
              : percentuaisOriginais[d.id] || Math.round(100 / ativas.length);
        });
        setValores(initial);
      } else {
        setModo('formula');
        setValores({ ...percentuaisOriginais });
      }
    }
  }, [isOpen, ciclo, ativas, percentuaisOriginais]);

  const somaAtual = useMemo(() => {
    return ativas.reduce((acc, d) => {
      const val = Number(valores[d.id]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [ativas, valores]);

  const handleChangeValor = (discId, novoVal) => {
    const num = Math.max(0, Math.min(100, parseInt(novoVal, 10) || 0));
    setValores((prev) => ({
      ...prev,
      [discId]: num,
    }));
  };

  const handleDistribuirIgualmente = () => {
    if (ativas.length === 0) return;
    const base = Math.floor(100 / ativas.length);
    let resto = 100 % ativas.length;
    const novo = {};
    ativas.forEach((d, idx) => {
      novo[d.id] = base + (idx < resto ? 1 : 0);
    });
    setValores(novo);
  };

  const handleRestaurarFormula = () => {
    setValores({ ...percentuaisOriginais });
    setModo('formula');
  };

  const handleNormalizarPara100 = () => {
    if (somaAtual <= 0) {
      handleDistribuirIgualmente();
      return;
    }
    const novo = {};
    let acumulado = 0;
    ativas.forEach((d, idx) => {
      if (idx === ativas.length - 1) {
        novo[d.id] = Math.max(1, 100 - acumulado);
      } else {
        const proporcao = Math.round(((Number(valores[d.id]) || 0) / somaAtual) * 100);
        novo[d.id] = proporcao;
        acumulado += proporcao;
      }
    });
    setValores(novo);
  };

  const handleSalvar = () => {
    if (modo === 'formula') {
      // Volta para a fórmula original (remove sobreposição manual)
      onSalvarPorcentagens(null);
    } else {
      // Salva sobreposição manual
      onSalvarPorcentagens(valores);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Definir % das Matérias no Ciclo"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={CheckCircle2}
            onClick={handleSalvar}
            className="shadow-lg shadow-blue-600/30 font-bold bg-blue-600 hover:bg-blue-500"
          >
            Aplicar no Ciclo
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-200">
        {/* Toggle Modo: Fórmula Automática vs Manual */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0b1222] border border-[#1e2f52] rounded-xl">
          <button
            type="button"
            onClick={() => {
              setModo('formula');
              setValores({ ...percentuaisOriginais });
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              modo === 'formula'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fórmula Automática</span>
          </button>

          <button
            type="button"
            onClick={() => setModo('manual')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              modo === 'manual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Definição Manual</span>
          </button>
        </div>

        {modo === 'formula' ? (
          <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Distribuição Proporcional por Prioridade</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              O ciclo calcula a fatia de cada matéria usando a fórmula{' '}
              <code className="text-blue-300 font-mono bg-blue-950 px-1 py-0.5 rounded">
                peso × dificuldade × déficit
              </code>
              . Matérias com maior peso e menor domínio recebem automaticamente mais tempo.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Sobreposição Manual Personalizada</span>
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                  somaAtual === 100
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                Soma: {somaAtual}% {somaAtual === 100 ? '✓' : '(Ideal 100%)'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Defina manualmente a porcentagem exata que cada matéria terá na volta completa do ciclo ({formatarMinutosHoras(totalMinutos)}).
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDistribuirIgualmente}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
              >
                Distribuir igualmente
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleNormalizarPara100}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
              >
                Ajustar para fechar 100%
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleRestaurarFormula}
                className="text-[11px] text-slate-400 hover:text-slate-300 underline font-semibold cursor-pointer"
              >
                Copiar da fórmula
              </button>
            </div>
          </div>
        )}

        {/* Lista das Disciplinas com Sliders e Inputs */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {ativas.map((disc) => {
            const val = Number(valores[disc.id]) || 0;
            const minutosCalculados = Math.round((totalMinutos * (val / (somaAtual > 0 ? somaAtual : 100))) / 5) * 5;

            return (
              <div
                key={disc.id}
                className="p-3 rounded-xl bg-[#121c33] border border-[#1e2f52] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: disc.cor }}
                    />
                    <span className="text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[210px]">
                      {disc.nome}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      ~{formatarMinutosHoras(minutosCalculados)}
                    </span>
                    <div className="flex items-center gap-1 bg-[#0b1222] px-2 py-1 rounded-lg border border-[#23355b]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        disabled={modo === 'formula'}
                        value={val}
                        onChange={(e) => handleChangeValor(disc.id, e.target.value)}
                        className="w-12 text-center text-xs font-mono font-bold text-white bg-transparent focus:outline-none disabled:opacity-70"
                      />
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {modo === 'manual' && (
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="1"
                      max="80"
                      step="1"
                      value={val}
                      onChange={(e) => handleChangeValor(disc.id, e.target.value)}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#090f1d] rounded-lg"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
