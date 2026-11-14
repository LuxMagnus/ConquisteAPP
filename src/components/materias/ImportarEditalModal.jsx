import React, { useState, useRef } from 'react';
import {
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Key,
  Layers,
  ArrowRight,
  RotateCcw,
  Check,
  HelpCircle,
  FolderPlus,
  Settings,
  Upload,
  Paperclip,
  File,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { useStudyStore, ACTION_TYPES } from '../../store/StudyContext.jsx';
import { analisarEditalComGemini, EDITAL_EXEMPLO_TESTE, arquivoParaBase64 } from '../../lib/geminiUtils.js';

export function ImportarEditalModal({ isOpen, onClose, onOpenConfiguracoes }) {
  const { state, dispatch, provaAtiva } = useStudyStore();
  const fileInputRef = useRef(null);

  // Etapa atual: 'input' | 'analisando' | 'revisao'
  const [etapa, setEtapa] = useState('input');

  // Input de texto do edital
  const [textoEdital, setTextoEdital] = useState('');

  // Arquivo anexado (PDF, TXT, DOCX)
  const [arquivoAnexado, setArquivoAnexado] = useState(null); // { name, size, mimeType, base64 }
  const [isDragging, setIsDragging] = useState(false);

  // Chave local (caso o usuário queira preencher ou atualizar diretamente aqui)
  const [chaveLocal, setChaveLocal] = useState(state.config?.geminiApiKey || '');
  const [mostrarInputChave, setMostrarInputChave] = useState(!state.config?.geminiApiKey);

  // Status e progresso da análise da IA
  const [progressoIA, setProgressoIA] = useState({
    etapa: 'Iniciando análise...',
    parteAtual: 1,
    totalPartes: 1,
    percentual: 0,
  });

  // Erro retornado (se houver)
  const [erroAnalise, setErroAnalise] = useState(null); // { mensagem, codigo }

  // Dados extraídos para a tela de revisão
  // Estrutura: [{ id, nome, pesoSugerido, topicos: [{ id, nome, subtopicos: [string] }] }]
  const [disciplinasRevisao, setDisciplinasRevisao] = useState([]);

  // Modo de importação: 'mesclar' | 'substituir'
  const [modoImportacao, setModoImportacao] = useState('mesclar');

  // Controle de accordion de disciplinas na revisão (Set de IDs abertos)
  const [disciplinasAbertas, setDisciplinasAbertas] = useState(new Set());

  // Feedback de sucesso pós-importação
  const [importadoComSucesso, setImportadoComSucesso] = useState(false);

  // Reset do modal ao fechar ou reabrir
  const handleFechar = () => {
    if (etapa === 'analisando') return; // não fechar abruptamente durante chamada
    setEtapa('input');
    setErroAnalise(null);
    setImportadoComSucesso(false);
    onClose();
  };

  // Preencher com edital de exemplo didático
  const handleUsarExemplo = () => {
    setTextoEdital(EDITAL_EXEMPLO_TESTE);
    setArquivoAnexado(null);
    setErroAnalise(null);
  };

  // Salvar chave local no estado se o usuário digitar aqui
  const handleSalvarChave = () => {
    if (chaveLocal.trim()) {
      dispatch({
        type: ACTION_TYPES.UPDATE_CONFIG,
        payload: { geminiApiKey: chaveLocal.trim() },
      });
      setMostrarInputChave(false);
    }
  };

  // Processar arquivo selecionado ou arrastado (PDF, TXT, DOCX)
  const handleProcessarArquivo = async (file) => {
    if (!file) return;
    try {
      setErroAnalise(null);
      // Se for arquivo de texto simples (.txt ou .md)
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setTextoEdital((prev) => (prev ? `${prev}\n\n${text}` : text));
        setArquivoAnexado({
          name: file.name,
          size: file.size,
          mimeType: 'text/plain',
          base64: null,
        });
      } else {
        // Se for PDF ou outro documento, converte para base64 para o Gemini processar
        const base64 = await arquivoParaBase64(file);
        setArquivoAnexado({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/pdf',
          base64,
        });
      }
    } catch (err) {
      setErroAnalise({
        codigo: 'ERRO_ARQUIVO',
        mensagem: `Não foi possível ler o arquivo anexado: ${err.message}`,
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessarArquivo(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleProcessarArquivo(file);
    }
  };

  const handleRemoverArquivo = () => {
    setArquivoAnexado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Disparar análise com Gemini
  const handleAnalisarComIA = async () => {
    const chaveAtual = chaveLocal.trim() || state.config?.geminiApiKey || '';

    // Se o usuário não tem chave própria configurada, o backend usará a GEMINI_API_KEY do servidor se existir
    // Mas se não tiver nenhuma e a chave local estiver vazia, salva a chave caso digitada
    if (chaveLocal.trim() && chaveLocal.trim() !== state.config?.geminiApiKey) {
      dispatch({
        type: ACTION_TYPES.UPDATE_CONFIG,
        payload: { geminiApiKey: chaveLocal.trim() },
      });
    }

    setErroAnalise(null);
    setEtapa('analisando');
    setProgressoIA({
      etapa: arquivoAnexado ? `Enviando arquivo ${arquivoAnexado.name} para análise...` : 'Conectando ao modelo Gemini...',
      parteAtual: 1,
      totalPartes: 1,
      percentual: 10,
    });

    try {
      const resultado = await analisarEditalComGemini({
        conteudoEdital: textoEdital,
        file: arquivoAnexado,
        geminiApiKey: chaveAtual,
        onProgress: (info) => {
          setProgressoIA((prev) => ({ ...prev, ...info }));
        },
      });

      if (!resultado.success) {
        setErroAnalise({
          codigo: resultado.code || 'ERRO_DESCONHECIDO',
          mensagem: resultado.error || 'Ocorreu um erro ao processar o edital com a IA.',
        });
        setEtapa('input');
        return;
      }

      // Prepara os dados para a tela de revisão garantindo IDs locais e estrutura
      const disciplinasFormatadas = (resultado.disciplinas || []).map((d, dIdx) => ({
        id: `rev-disc-${dIdx}-${Date.now()}`,
        nome: d.nome || `Disciplina ${dIdx + 1}`,
        pesoSugerido: Math.max(1, Math.min(10, Number(d.pesoSugerido) || 5)),
        topicos: (d.topicos || []).map((t, tIdx) => ({
          id: `rev-top-${dIdx}-${tIdx}-${Date.now()}`,
          nome: t.nome || `Tópico ${tIdx + 1}`,
          subtopicos: Array.isArray(t.subtopicos) ? [...t.subtopicos] : [],
        })),
      }));

      setDisciplinasRevisao(disciplinasFormatadas);
      // Abre todas as disciplinas por padrão para facilitar a conferência
      setDisciplinasAbertas(new Set(disciplinasFormatadas.map((d) => d.id)));
      setEtapa('revisao');
    } catch (err) {
      setErroAnalise({
        codigo: 'EXCECAO',
        mensagem: `Erro inesperado na chamada da IA: ${err.message || 'Verifique sua conexão.'}`,
      });
      setEtapa('input');
    }
  };

  // Toggle accordion de disciplina na revisão
  const toggleDisciplinaAberta = (id) => {
    setDisciplinasAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Funções de Edição na Tela de Revisão
  const handleUpdateNomeDisciplina = (discId, novoNome) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => (d.id === discId ? { ...d, nome: novoNome } : d))
    );
  };

  const handleUpdatePesoDisciplina = (discId, novoPeso) => {
    const val = Math.max(1, Math.min(10, Number(novoPeso) || 1));
    setDisciplinasRevisao((prev) =>
      prev.map((d) => (d.id === discId ? { ...d, pesoSugerido: val } : d))
    );
  };

  const handleRemoverDisciplina = (discId) => {
    setDisciplinasRevisao((prev) => prev.filter((d) => d.id !== discId));
  };

  const handleAdicionarDisciplina = () => {
    const nova = {
      id: `rev-disc-manual-${Date.now()}`,
      nome: 'Nova Disciplina',
      pesoSugerido: 5,
      topicos: [{ id: `rev-top-manual-${Date.now()}`, nome: 'Tópico 1', subtopicos: [] }],
    };
    setDisciplinasRevisao((prev) => [...prev, nova]);
    setDisciplinasAbertas((prev) => new Set([...prev, nova.id]));
  };

  const handleUpdateNomeTopico = (discId, topicoId, novoNome) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        return {
          ...d,
          topicos: d.topicos.map((t) => (t.id === topicoId ? { ...t, nome: novoNome } : t)),
        };
      })
    );
  };

  const handleRemoverTopico = (discId, topicoId) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        return {
          ...d,
          topicos: d.topicos.filter((t) => t.id !== topicoId),
        };
      })
    );
  };

  const handleAdicionarTopico = (discId) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        const novoTop = {
          id: `rev-top-novo-${Date.now()}-${d.topicos.length}`,
          nome: `Novo Tópico ${d.topicos.length + 1}`,
          subtopicos: [],
        };
        return {
          ...d,
          topicos: [...d.topicos, novoTop],
        };
      })
    );
  };

  const handleUpdateSubtopico = (discId, topicoId, subIdx, novoTexto) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        return {
          ...d,
          topicos: d.topicos.map((t) => {
            if (t.id !== topicoId) return t;
            const novosSubs = [...t.subtopicos];
            novosSubs[subIdx] = novoTexto;
            return { ...t, subtopicos: novosSubs };
          }),
        };
      })
    );
  };

  const handleRemoverSubtopico = (discId, topicoId, subIdx) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        return {
          ...d,
          topicos: d.topicos.map((t) => {
            if (t.id !== topicoId) return t;
            return {
              ...t,
              subtopicos: t.subtopicos.filter((_, idx) => idx !== subIdx),
            };
          }),
        };
      })
    );
  };

  const handleAdicionarSubtopico = (discId, topicoId) => {
    setDisciplinasRevisao((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d;
        return {
          ...d,
          topicos: d.topicos.map((t) => {
            if (t.id !== topicoId) return t;
            return {
              ...t,
              subtopicos: [...t.subtopicos, `Subtópico ${t.subtopicos.length + 1}`],
            };
          }),
        };
      })
    );
  };

  // Confirmação final da importação: grava na prova ativa
  const handleConfirmarImportacao = () => {
    if (!provaAtiva) return;
    if (disciplinasRevisao.length === 0) return;

    // Dispara a injeção atômica no store
    dispatch({
      type: ACTION_TYPES.IMPORT_EDITAL,
      payload: {
        provaId: provaAtiva.id,
        modo: modoImportacao,
        disciplinas: disciplinasRevisao,
      },
    });

    setImportadoComSucesso(true);
    setTimeout(() => {
      handleFechar();
    }, 1500);
  };

  // Totalizadores na revisão
  const totalTopicosRevisao = disciplinasRevisao.reduce(
    (acc, d) => acc + (d.topicos?.length || 0),
    0
  );
  const totalSubtopicosRevisao = disciplinasRevisao.reduce(
    (acc, d) =>
      acc +
      (d.topicos?.reduce((subAcc, t) => subAcc + (t.subtopicos?.length || 0), 0) || 0),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFechar}
      title={
        etapa === 'revisao'
          ? 'Revisar Edital Estruturado pela IA'
          : 'Importar Conteúdo do Edital com IA'
      }
      description={
        etapa === 'revisao'
          ? 'Edite nomes, pesos sugeridos e remova ou adicione tópicos antes de confirmar a importação para o concurso.'
          : 'Cole o conteúdo programático do edital para o Gemini transformar automaticamente em matérias, tópicos e subtópicos.'
      }
      maxWidth={etapa === 'revisao' ? 'max-w-4xl' : 'max-w-2xl'}
      footer={
        etapa === 'revisao' ? (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => setEtapa('input')}
                disabled={importadoComSucesso}
              >
                Voltar e Colar Novamente
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFechar}
                disabled={importadoComSucesso}
              >
                Cancelar
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={importadoComSucesso ? Check : CheckCircle2}
                onClick={handleConfirmarImportacao}
                disabled={disciplinasRevisao.length === 0 || importadoComSucesso}
                className={importadoComSucesso ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
              >
                {importadoComSucesso
                  ? 'Importado com Sucesso!'
                  : `Confirmar e Injetar (${disciplinasRevisao.length} matérias)`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFechar}
              disabled={etapa === 'analisando'}
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={handleAnalisarComIA}
              disabled={(!textoEdital.trim() && !arquivoAnexado) || etapa === 'analisando'}
            >
              {etapa === 'analisando' ? 'Processando com Gemini...' : 'Analisar com IA'}
            </Button>
          </div>
        )
      }
    >
      {/* Input oculto para anexar arquivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx,.md,application/pdf,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* =========================================================================
          ETAPA 1: INPUT DE TEXTO E CONFIGURAÇÃO DA CHAVE
         ========================================================================= */}
      {etapa === 'input' && (
        <div className="space-y-4">
          {/* Alerta de Erro se houver */}
          {erroAnalise && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-150">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-rose-300">Falha na análise do edital</p>
                <p className="text-rose-200/90 leading-relaxed">{erroAnalise.mensagem}</p>
                {erroAnalise.codigo === 'CHAVE_AUSENTE' && (
                  <button
                    type="button"
                    onClick={() => setMostrarInputChave(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white font-semibold underline mt-1 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Inserir Chave da API Gemini agora
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Banner da Prova Destino */}
          <div className="p-3 rounded-xl bg-[#121c33] border border-[#1e2f52] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Concurso Alvo:</span>
              <strong className="text-white truncate max-w-[220px] sm:max-w-md">
                {provaAtiva?.nome || 'Nenhum concurso ativo'}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                  state.config?.geminiApiKey
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {state.config?.geminiApiKey ? 'Chave Gemini Conectada' : 'Chave não informada'}
              </span>
              <button
                type="button"
                onClick={() => setMostrarInputChave(!mostrarInputChave)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2b4c] transition-colors"
                title="Configurar chave do Gemini"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Campo opcional/rápido de Chave Gemini se não estiver configurada ou se o usuário clicar */}
          {mostrarInputChave && (
            <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#23355b] space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Chave da API Gemini (Google AI Studio)</span>
                </label>
                <span className="text-[10px] text-slate-400">Salva no localStorage</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={chaveLocal}
                  onChange={(e) => setChaveLocal(e.target.value)}
                  placeholder="Cole sua chave AIzaSy..."
                  className="flex-1 bg-[#121c33] border border-[#23355b] focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none"
                />
                <Button variant="secondary" size="xs" onClick={handleSalvarChave}>
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Área de Anexo de Arquivo (PDF / TXT / DOCX) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                <span>Anexar Arquivo do Edital (PDF, TXT, DOCX)</span>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer hover:underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Selecionar do Computador</span>
              </button>
            </div>

            {arquivoAnexado ? (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                      {arquivoAnexado.name}
                    </p>
                    <p className="text-[11px] text-blue-300/80">
                      {(arquivoAnexado.size / 1024).toFixed(1)} KB • Pronto para análise com Gemini
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoverArquivo}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? 'bg-blue-600/20 border-blue-400 scale-[1.01]'
                    : 'bg-[#0d1629]/70 border-[#23355b] hover:border-slate-500 hover:bg-[#111c33]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  Arraste e solte o edital aqui, ou <span className="text-blue-400 underline">clique para anexar</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Suporta arquivos PDF (lido diretamente pela IA), TXT ou DOCX
                </p>
              </div>
            )}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#1d2c4c]"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              ou cole o texto abaixo
            </span>
            <div className="flex-grow border-t border-[#1d2c4c]"></div>
          </div>

          {/* Textarea para Colar o Edital */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Conteúdo Programático em Texto (Opcional se anexou arquivo)</span>
              </label>

              <button
                type="button"
                onClick={handleUsarExemplo}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Usar Exemplo de Teste</span>
              </button>
            </div>

            <textarea
              rows={arquivoAnexado ? 5 : 8}
              value={textoEdital}
              onChange={(e) => setTextoEdital(e.target.value)}
              placeholder="Cole aqui o texto copiado do edital (PDF, Diário Oficial, etc.). Exemplo:&#10;&#10;LÍNGUA PORTUGUESA: 1. Compreensão e interpretação de texto...&#10;DIREITO CONSTITUCIONAL: 1. Direitos e garantias fundamentais..."
              className="w-full bg-[#0d1629] border border-[#23355b] focus:border-blue-500 focus:outline-none rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 font-sans leading-relaxed resize-y transition-colors"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>{textoEdital.length} caracteres ({textoEdital.split('\n').filter(Boolean).length} linhas)</span>
              {textoEdital.length > 11000 && (
                <span className="text-amber-400 font-medium">
                  Texto longo detectado: será dividido e processado em partes automaticamente.
                </span>
              )}
            </div>
          </div>

          {/* Dicas e Informações de Segurança */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-blue-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Como funciona a importação inteligente:</span>
            </p>
            <p className="text-slate-400 leading-relaxed">
              1. O Gemini analisa os tópicos, sugere pesos de 1 a 10 e estrutura até 2 níveis (capítulos e subtópicos).
              <br />
              2. <strong>Nada é gravado automaticamente:</strong> você terá uma tela de revisão completa para editar nomes, pesos ou remover itens antes de confirmar.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 2: ANALISANDO (LOADING ANIMADO COM ETAPAS)
         ========================================================================= */}
      {etapa === 'analisando' && (
        <div className="py-12 px-4 text-center space-y-6 animate-in fade-in duration-200">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {progressoIA.etapa}
            </h3>
            <p className="text-xs text-slate-400">
              Estruturando disciplinas, pontos programáticos e calculando pesos recomendados com a IA do Google Gemini.
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            <ProgressBar
              value={progressoIA.percentual || 50}
              max={100}
              color="blue"
              height="h-2"
              showPercentage
            />
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Processando via generationConfig com responseSchema rígido
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 3: TELA DE REVISÃO ANTES DE GRAVAR
         ========================================================================= */}
      {etapa === 'revisao' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Resumo da Extração */}
          <div className="p-4 rounded-2xl bg-[#121c33] border border-[#1e2f52] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Estruturado com Sucesso
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {disciplinasRevisao.length} matérias • {totalTopicosRevisao} tópicos • {totalSubtopicosRevisao} subtópicos
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Revise os nomes e pesos sugeridos. Você pode alterar qualquer campo antes de confirmar.
              </p>
            </div>

            <Button
              variant="outline"
              size="xs"
              icon={Plus}
              onClick={handleAdicionarDisciplina}
              className="text-xs self-start sm:self-auto"
            >
              Nova Disciplina
            </Button>
          </div>

          {/* Opção de Modo de Importação: Mesclar vs Substituir */}
          <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-[#1e2f52] space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Como deseja aplicar no concurso "{provaAtiva?.nome}"?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  modoImportacao === 'mesclar'
                    ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-sm'
                    : 'bg-[#121c33]/50 border-[#1d2c4c] text-slate-300 hover:bg-[#16233f]'
                }`}
              >
                <input
                  type="radio"
                  name="modoImportacao"
                  value="mesclar"
                  checked={modoImportacao === 'mesclar'}
                  onChange={() => setModoImportacao('mesclar')}
                  className="mt-0.5 text-blue-500 focus:ring-0"
                />
                <div>
                  <p className="text-xs font-bold text-white">Mesclar com matérias existentes</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mantém as disciplinas já cadastradas e adiciona as novas identificadas no edital.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  modoImportacao === 'substituir'
                    ? 'bg-orange-600/15 border-orange-500/50 text-white shadow-sm'
                    : 'bg-[#121c33]/50 border-[#1d2c4c] text-slate-300 hover:bg-[#16233f]'
                }`}
              >
                <input
                  type="radio"
                  name="modoImportacao"
                  value="substituir"
                  checked={modoImportacao === 'substituir'}
                  onChange={() => setModoImportacao('substituir')}
                  className="mt-0.5 text-orange-500 focus:ring-0"
                />
                <div>
                  <p className="text-xs font-bold text-white">Substituir matérias atuais</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Limpa o edital verticalizado atual da prova e aplica exclusivamente este novo edital.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Lista de Disciplinas Editáveis (com Accordion e Árvore de Tópicos) */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {disciplinasRevisao.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#121c33]/50 border border-dashed border-[#1e2f52] text-slate-400 text-xs">
                Todas as disciplinas foram removidas. Adicione uma nova ou volte ao texto.
              </div>
            ) : (
              disciplinasRevisao.map((disc, dIdx) => {
                const isOpen = disciplinasAbertas.has(disc.id);
                return (
                  <div
                    key={disc.id}
                    className="rounded-2xl bg-[#121c33] border border-[#1e2f52] overflow-hidden transition-all shadow-sm"
                  >
                    {/* Header da Disciplina */}
                    <div className="p-3 sm:p-4 bg-[#142038] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleDisciplinaAberta(disc.id)}
                          className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={disc.nome}
                            onChange={(e) => handleUpdateNomeDisciplina(disc.id, e.target.value)}
                            placeholder="Nome da disciplina"
                            className="w-full bg-[#0d1629] border border-[#23355b] focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Peso Sugerido e Exclusão */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <div className="flex items-center gap-1.5 bg-[#0d1629] px-2.5 py-1 rounded-lg border border-[#23355b]">
                          <span className="text-[11px] text-slate-400 font-medium">Peso (1–10):</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={disc.pesoSugerido}
                            onChange={(e) => handleUpdatePesoDisciplina(disc.id, e.target.value)}
                            className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-400 focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoverDisciplina(disc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Remover esta matéria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo Aberto: Árvore de Tópicos e Subtópicos */}
                    {isOpen && (
                      <div className="p-3 sm:p-4 space-y-3 bg-[#0c1424]/70 border-t border-[#1d2c4c]">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">
                            Tópicos Identificados ({disc.topicos.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdicionarTopico(disc.id)}
                            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Tópico</span>
                          </button>
                        </div>

                        {disc.topicos.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-1">
                            Nenhum tópico nesta disciplina. Clique em "+ Adicionar Tópico".
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {disc.topicos.map((topico, tIdx) => (
                              <div
                                key={topico.id}
                                className="p-2.5 rounded-xl bg-[#111a2f] border border-[#1b2b4d] space-y-2"
                              >
                                {/* Linha do Tópico */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    {tIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={topico.nome}
                                    onChange={(e) =>
                                      handleUpdateNomeTopico(disc.id, topico.id, e.target.value)
                                    }
                                    placeholder="Nome do tópico principal"
                                    className="flex-1 bg-[#090f1d] border border-[#23355b] focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-medium focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleAdicionarSubtopico(disc.id, topico.id)}
                                    className="p-1 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-500/10 transition-colors"
                                    title="Adicionar subtópico neste ponto"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoverTopico(disc.id, topico.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                                    title="Excluir tópico"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Subtópicos com Indentação */}
                                {topico.subtopicos.length > 0 && (
                                  <div className="pl-6 space-y-1.5 pt-1 border-l border-[#22355c] ml-2">
                                    {topico.subtopicos.map((sub, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {tIdx + 1}.{sIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          value={sub}
                                          onChange={(e) =>
                                            handleUpdateSubtopico(
                                              disc.id,
                                              topico.id,
                                              sIdx,
                                              e.target.value
                                            )
                                          }
                                          placeholder="Subtópico específico"
                                          className="flex-1 bg-[#070c18] border border-[#1b2b4d] focus:border-blue-500 rounded-md px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoverSubtopico(disc.id, topico.id, sIdx)
                                          }
                                          className="p-0.5 text-slate-500 hover:text-rose-400"
                                          title="Remover subtópico"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
