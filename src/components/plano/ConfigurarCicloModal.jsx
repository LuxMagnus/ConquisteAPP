import React, { useState, useMemo } from 'react';
import { RotateCw, Sliders, CheckCircle2, AlertCircle, Clock, Sparkles, Split, Square } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import {
  PRESETS_VOLTA_HORAS,
  PRESETS_SESSAO_MINUTOS,
  DURACAO_SESSAO_PADRAO_MINUTOS,
  calcularDistribuicaoCiclo,
  TAMANHO_VOLTA_PADRAO_MINUTOS,
} from '../../lib/cicloUtils.js';
import { formatarMinutosHoras } from '../../lib/dateUtils.js';

export function ConfigurarCicloModal({
  isOpen,
  onClose,
  cicloAtual,
  disciplinas = [],
  onSalvarCiclo,
}) {
  const horasIniciais = useMemo(() => {
    const minutos =
      cicloAtual?.tamanhoVoltaMinutos ||
      cicloAtual?.blocos?.reduce((acc, b) => acc + (b.minutosMeta || 0), 0) ||
      TAMANHO_VOLTA_PADRAO_MINUTOS;
    return Math.round(minutos / 60);
  }, [cicloAtual]);

  const [tamanhoHoras, setTamanhoHoras] = useState(horasIniciais);
  const [duracaoSessao, setDuracaoSessao] = useState(() => {
    return cicloAtual?.duracaoSessaoMinutos || DURACAO_SESSAO_PADRAO_MINUTOS;
  });
  const [isCustomSessao, setIsCustomSessao] = useState(false);
  const [customSessaoValor, setCustomSessaoValor] = useState('');
  const [modoFracionado, setModoFracionado] = useState(() => {
    return cicloAtual?.modoFracionado !== undefined ? cicloAtual.modoFracionado : true;
  });
  const [resetarProgresso, setResetarProgresso] = useState(false);

  // Mapa de matérias ativas selecionadas para entrar nesta volta
  const [ativasMap, setAtivasMap] = useState({});

  // Sincroniza estados ao abrir o modal ou mudar cicloAtual
  React.useEffect(() => {
    if (isOpen) {
      const mapa = {};
      disciplinas.forEach((d) => {
        mapa[d.id] = d.ativa !== false;
      });
      setAtivasMap(mapa);
      setTamanhoHoras(horasIniciais);
      const sessaoInit = cicloAtual?.duracaoSessaoMinutos || DURACAO_SESSAO_PADRAO_MINUTOS;
      setDuracaoSessao(sessaoInit);
      const isPreset = PRESETS_SESSAO_MINUTOS.some((p) => p.minutos === sessaoInit);
      setIsCustomSessao(!isPreset);
      setCustomSessaoValor(isPreset ? '' : String(sessaoInit));
      setModoFracionado(cicloAtual?.modoFracionado !== undefined ? cicloAtual.modoFracionado : true);
    }
  }, [isOpen, disciplinas, horasIniciais, cicloAtual]);

  // Lista filtrada de disciplinas que participarão da volta
  const disciplinasSelecionadas = useMemo(() => {
    return disciplinas.filter((d) => ativasMap[d.id] !== false);
  }, [disciplinas, ativasMap]);

  // Alterna ativação de uma matéria específica
  const handleToggleMateria = (discId) => {
    setAtivasMap((prev) => ({
      ...prev,
      [discId]: !prev[discId],
    }));
  };

  // Alterna todas as matérias
  const handleToggleTodas = (ativar) => {
    const novo = {};
    disciplinas.forEach((d) => {
      novo[d.id] = ativar;
    });
    setAtivasMap(novo);
  };

  const duracaoSessaoEfetiva = useMemo(() => {
    if (isCustomSessao) {
      return Math.max(15, Math.min(240, parseInt(customSessaoValor, 10) || 60));
    }
    return duracaoSessao;
  }, [isCustomSessao, customSessaoValor, duracaoSessao]);

  // Calcula prévia dinâmica da distribuição em tempo real com as matérias ativas
  const previaBlocos = useMemo(() => {
    if (disciplinasSelecionadas.length === 0) return [];
    const totalMinutos = Math.max(disciplinasSelecionadas.length * 30, (Number(tamanhoHoras) || 20) * 60);
    return calcularDistribuicaoCiclo({
      disciplinas: disciplinasSelecionadas,
      tamanhoVoltaMinutos: totalMinutos,
      duracaoSessaoMinutos: duracaoSessaoEfetiva,
      modoFracionado,
      porcentagensManuais: cicloAtual?.porcentagensManuais || null,
    });
  }, [disciplinasSelecionadas, tamanhoHoras, duracaoSessaoEfetiva, modoFracionado, cicloAtual?.porcentagensManuais]);

  const handleSalvar = () => {
    if (disciplinasSelecionadas.length === 0) return;
    const totalMinutos = Math.max(disciplinasSelecionadas.length * 30, (Number(tamanhoHoras) || 20) * 60);
    onSalvarCiclo({
      tamanhoVoltaMinutos: totalMinutos,
      duracaoSessaoMinutos: duracaoSessaoEfetiva,
      modoFracionado,
      porcentagensManuais: cicloAtual?.porcentagensManuais || null,
      resetarProgresso,
      ativasMap,
    });
    onClose();
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Ciclo de Estudos"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={RotateCw}
            onClick={handleSalvar}
            disabled={disciplinasSelecionadas.length === 0}
            className="shadow-lg shadow-blue-600/30 font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            Regenerar e Aplicar
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-slate-200">
        {/* Explicação da Distribuição do Ciclo */}
        <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Fórmula de Distribuição Proporcional</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            O tempo da volta é distribuído proporcionalmente à prioridade:{' '}
            <code className="text-blue-300 font-mono bg-blue-950 px-1 py-0.5 rounded">
              peso × dificuldade × (1 − domínio/100)
            </code>
            , respeitando mínimo de 30 min e teto de 25% por disciplina.
          </p>
        </div>

        {/* Escolha do Tamanho da Volta */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Tamanho Total da Volta (Horas)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESETS_VOLTA_HORAS.map((preset) => {
              const isSelected = tamanhoHoras === preset.horas;
              return (
                <button
                  key={preset.horas}
                  type="button"
                  onClick={() => setTamanhoHoras(preset.horas)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                      : 'bg-[#15233e] text-slate-300 hover:bg-[#1d3055] border border-[#23355c]'
                  }`}
                >
                  {preset.horas}h
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min="4"
              max="60"
              step="1"
              value={tamanhoHoras}
              onChange={(e) => setTamanhoHoras(Number(e.target.value))}
              className="flex-1 accent-blue-500 cursor-pointer"
            />
            <span className="font-mono text-sm font-bold text-white bg-[#15233e] px-3 py-1 rounded-xl border border-[#23355c] min-w-[60px] text-center">
              {tamanhoHoras}h
            </span>
          </div>
        </div>

        {/* Duração da Sessão Padrão de Estudo */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                Duração da Sessão Padrão de Estudo
              </label>
              <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {duracaoSessaoEfetiva} min por sessão
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              O ciclo divide a carga total da matéria nesta duração padrão (sugerido 60 min). Se uma matéria tiver 180 min, ela aparecerá 3x no ciclo.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESETS_SESSAO_MINUTOS.map((preset) => {
              const isSelected = !isCustomSessao && duracaoSessao === preset.minutos;
              return (
                <button
                  key={preset.minutos}
                  type="button"
                  onClick={() => {
                    setIsCustomSessao(false);
                    setDuracaoSessao(preset.minutos);
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                      : 'bg-[#15233e] text-slate-300 hover:bg-[#1d3055] border border-[#23355c]'
                  }`}
                >
                  {preset.minutos}m
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCustomSessao(true);
                if (!customSessaoValor) setCustomSessaoValor(String(duracaoSessao));
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isCustomSessao
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-[#121c33] text-slate-400 border-[#22355c] hover:text-white'
              }`}
            >
              Personalizar minutos
            </button>

            {isCustomSessao && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="5"
                  value={customSessaoValor}
                  onChange={(e) => setCustomSessaoValor(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-24 px-2.5 py-1 text-xs rounded-xl bg-[#142038] border border-blue-500/50 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-400">minutos</span>
              </div>
            )}
          </div>

          {/* Seletor de Modo: Sessões Intercaladas vs Bloco Único */}
          <div className="pt-2 border-t border-[#1e2f52] flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setModoFracionado(true)}
              className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                modoFracionado
                  ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                  : 'bg-[#0d1424] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className={`w-4 h-4 mt-0.5 shrink-0 ${modoFracionado ? 'text-blue-400' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-bold block">
                  Sessões Intercaladas (Recomendado)
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                  Divide matérias longas em sessões de ~{duracaoSessaoEfetiva}m e alterna no ciclo para não cansar.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModoFracionado(false)}
              className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                !modoFracionado
                  ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                  : 'bg-[#0d1424] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Square className={`w-4 h-4 mt-0.5 shrink-0 ${!modoFracionado ? 'text-blue-400' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-bold block">
                  Bloco Único por Matéria
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                  Cada matéria aparece apenas 1 vez com seu tempo total de estudo contínuo.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Escolha das Disciplinas que Entram no Ciclo */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e2f52] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
                Disciplinas no Ciclo ({disciplinasSelecionadas.length} de {disciplinas.length} ativas)
              </span>
              <p className="text-[11px] text-slate-400">
                Desmarque as matérias que deseja pausar do ciclo sem apagar seu histórico.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleToggleTodas(true)}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Todas
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => handleToggleTodas(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {disciplinas.map((disc) => {
              const isChecked = ativasMap[disc.id] !== false;
              return (
                <label
                  key={disc.id}
                  onClick={() => handleToggleMateria(disc.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isChecked
                      ? 'bg-[#152442] border-blue-500/40 text-white shadow-sm'
                      : 'bg-[#0d1424] border-[#1e2f52] text-slate-400 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: disc.cor }}
                    />
                    <span className="text-xs font-semibold truncate">
                      {disc.nome}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isChecked
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isChecked ? 'Ativa' : 'Pausada'}
                  </span>
                </label>
              );
            })}
          </div>

          {disciplinasSelecionadas.length === 0 && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Selecione ao menos 1 disciplina para poder gerar o ciclo de estudos.</span>
            </div>
          )}
        </div>

        {/* Prévia da Distribuição e Sequência dos Blocos */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-slate-300">
              Prévia do Ciclo ({previaBlocos.length} blocos gerados)
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              Total: {formatarMinutosHoras((Number(tamanhoHoras) || 20) * 60)}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {previaBlocos.map((bloco, bIdx) => {
              const disc = disciplinas.find((d) => d.id === bloco.disciplinaId);
              if (!disc) return null;

              return (
                <div
                  key={bloco.id || `${bloco.disciplinaId}-${bIdx}`}
                  className="p-2 rounded-xl bg-[#142038] border border-[#1e2f52] flex items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[#1d2d4d] text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {bIdx + 1}º
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: disc.cor }}
                    />
                    <span className="font-semibold text-white truncate max-w-[160px] sm:max-w-[220px]">
                      {disc.nome}
                    </span>
                    {bloco.sessaoTotal > 1 && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 shrink-0">
                        {bloco.sessaoNumero}/{bloco.sessaoTotal}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-blue-400">
                      {bloco.minutosMeta} min
                    </span>
                    {bloco.minutosMetaTotalMateria && bloco.sessaoTotal > 1 && (
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                        (de {bloco.minutosMetaTotalMateria}m)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opção de Reset do Progresso na Volta Atual */}
        <div className="pt-2 border-t border-[#1d2c4c]">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={resetarProgresso}
              onChange={(e) => setResetarProgresso(e.target.checked)}
              className="mt-0.5 rounded text-blue-500 bg-[#0c1424] border-[#22355c] focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">
                Zerar progresso da volta atual (Volta 1)
              </span>
              <span className="text-slate-400 block text-[11px] mt-0.5">
                Se desmarcado, o tempo já estudado nesta volta será mantido e transferido proporcionalmente para os novos blocos.
              </span>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
}
