import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, CheckCircle2, Table, Calendar, Info } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { exportarSessoesCSV, exportarResumoDisciplinasCSV, exportarEstatisticasJSON } from '../../lib/exportUtils.js';

export function ExportarDadosModal({
  isOpen,
  onClose,
  sessoes = [],
  disciplinas = [],
  topicos = [],
  provaAtiva,
  filtroTempoLabel = 'Todo o período',
}) {
  const [tipoExportacao, setTipoExportacao] = useState('sessoes_csv');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportar = () => {
    if (tipoExportacao === 'sessoes_csv') {
      exportarSessoesCSV(sessoes, disciplinas, topicos, provaAtiva?.nome || 'Concurso');
    } else if (tipoExportacao === 'resumo_csv') {
      exportarResumoDisciplinasCSV(disciplinas, sessoes);
    } else if (tipoExportacao === 'json') {
      exportarEstatisticasJSON({
        exportadoEm: new Date().toISOString(),
        filtroPeriodo: filtroTempoLabel,
        concurso: provaAtiva?.nome || null,
        totalSessoes: sessoes.length,
        sessoes,
        disciplinas,
      });
    }

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Dados de Estudos"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={downloadSuccess ? CheckCircle2 : Download}
            onClick={handleExportar}
            disabled={sessoes.length === 0}
            className={`font-bold shadow-lg shadow-blue-600/30 ${
              downloadSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {downloadSuccess ? 'Arquivo Baixado!' : 'Baixar Arquivo'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-200">
        <div className="p-3 rounded-xl bg-[#0b1222] border border-[#1e2f52] flex items-center justify-between text-xs">
          <span className="text-slate-400">Escopo da exportação:</span>
          <span className="font-semibold text-white font-mono bg-[#16233f] px-2 py-0.5 rounded border border-[#23355c]">
            {filtroTempoLabel} ({sessoes.length} sessões)
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Escolha o formato de exportação:
          </label>

          <div className="space-y-2">
            {/* Opção 1: CSV Detalhado */}
            <label
              onClick={() => setTipoExportacao('sessoes_csv')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                tipoExportacao === 'sessoes_csv'
                  ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                  : 'bg-[#10192e] border-[#1e2f52] text-slate-300 hover:bg-[#14213d]'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Planilha de Sessões Detalhadas (CSV / Excel)</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Recomendado</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gera arquivo compatível com Excel e Google Sheets (BOM UTF-8 com ponto e vírgula), contendo cada sessão com data, matéria, tópico, tempo líquido, pausas, questões e observações.
                </p>
              </div>
            </label>

            {/* Opção 2: CSV Resumo por Disciplina */}
            <label
              onClick={() => setTipoExportacao('resumo_csv')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                tipoExportacao === 'resumo_csv'
                  ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                  : 'bg-[#10192e] border-[#1e2f52] text-slate-300 hover:bg-[#14213d]'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                <Table className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Resumo Consolidado por Matéria (CSV)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tabela sintética com total de horas estudadas, questões feitas, acertos, taxa de aproveitamento e número de sessões por disciplina.
                </p>
              </div>
            </label>

            {/* Opção 3: JSON Completo */}
            <label
              onClick={() => setTipoExportacao('json')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                tipoExportacao === 'json'
                  ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                  : 'bg-[#10192e] border-[#1e2f52] text-slate-300 hover:bg-[#14213d]'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Backup Estruturado de Dados (JSON)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Exporta os registros brutos em formato JSON para desenvolvedores, scripts ou integração com outras ferramentas.
                </p>
              </div>
            </label>
          </div>
        </div>

        {sessoes.length === 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            Nenhuma sessão encontrada para o período selecionado. Ajuste os filtros antes de exportar.
          </div>
        )}
      </div>
    </Modal>
  );
}
