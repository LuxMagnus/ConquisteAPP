/**
 * Utilitários para integração com a API do Gemini para importação inteligente de editais.
 * 
 * Atualizado para chamar o endpoint de backend `/api/gemini/analisar-edital` (Express + @google/genai),
 * eliminando o erro de PROXY_GENERATION_DISABLED do navegador e suportando anexos de arquivos (.pdf, .txt, .docx).
 */

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    disciplinas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nome: { type: 'STRING', description: 'Nome da disciplina do concurso público' },
          pesoSugerido: { type: 'INTEGER', description: 'Peso sugerido para o ciclo de estudos de 1 a 10' },
          topicos: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                nome: { type: 'STRING', description: 'Nome do tópico ou capítulo principal' },
                subtopicos: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                  description: 'Lista de subtópicos detalhados do edital',
                },
              },
              required: ['nome'],
            },
          },
        },
        required: ['nome', 'topicos'],
      },
    },
  },
  required: ['disciplinas'],
};

/**
 * Converte um arquivo do navegador (File) para Base64
 */
export function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Remove o prefixo data:*/*;base64,
        const base64Clean = result.split(',')[1] || result;
        resolve(base64Clean);
      } else {
        reject(new Error('Falha ao converter arquivo em string base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Analisa o conteúdo programático do edital com a IA do Gemini via servidor.
 * Suporta texto puro e/ou documento anexado (PDF, TXT, DOCX).
 * 
 * @param {Object} params
 * @param {string} [params.conteudoEdital] Texto colado pelo usuário
 * @param {Object} [params.file] Arquivo anexado { name, mimeType, base64 }
 * @param {string} [params.geminiApiKey] Chave da API configurada no sistema
 * @param {Function} [params.onProgress] Callback de progresso (etapa, percentual)
 * @returns {Promise<{ success: boolean, disciplinas?: Array, error?: string, code?: string }>}
 */
export async function analisarEditalComGemini({
  conteudoEdital = '',
  file = null,
  geminiApiKey = '',
  userId = null,
  onProgress = () => {},
}) {
  const textoLimpo = (conteudoEdital || '').trim();

  if (!textoLimpo && !file) {
    return {
      success: false,
      error: 'Por favor, cole o conteúdo programático ou anexe um arquivo de edital antes de analisar.',
      code: 'CONTEUDO_VAZIO',
    };
  }

  onProgress({
    etapa: file ? `Enviando arquivo ${file.name} para o servidor...` : 'Enviando conteúdo para o servidor...',
    percentual: 25,
  });

  try {
    // Determina URL base (se estiver empacotado no Capacitor móvel ou com backend remoto separado)
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const endpoint = `${baseUrl}/api/gemini/analisar-edital`;

    // Chama o endpoint Express no backend (executando @google/genai com User-Agent 'aistudio-build')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textoEdital: textoLimpo,
        file: file
          ? {
              name: file.name,
              mimeType: file.mimeType || 'application/pdf',
              base64: file.base64,
            }
          : null,
        geminiApiKey: (geminiApiKey || '').trim(),
        userId: userId || undefined,
      }),
    });

    onProgress({
      etapa: 'Processando disciplinas e estrutura de tópicos...',
      percentual: 70,
    });

    const responseText = await response.text();
    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch {
      // Se a resposta não for JSON (ex: HTML da SPA retornado por interceptador ou rota)
      console.error('Resposta não-JSON retornada pelo servidor:', responseText.slice(0, 200));
      return {
        success: false,
        error:
          'O servidor retornou uma resposta inesperada. Verifique se o servidor de backend está ativo ou tente novamente.',
        code: 'RESPOSTA_INVALIDA',
      };
    }

    if (!response.ok || !data.success) {
      const msgErro =
        data.error ||
        (response.status === 200
          ? 'Não foi possível estruturar as disciplinas do edital. Tente simplificar o texto ou tentar novamente.'
          : `Erro no processamento (${response.status}). Tente novamente em instantes.`);

      return {
        success: false,
        error: msgErro,
        code: data.code || `HTTP_${response.status}`,
      };
    }

    if (!Array.isArray(data.disciplinas) || data.disciplinas.length === 0) {
      return {
        success: false,
        error: 'Nenhuma disciplina foi encontrada no conteúdo analisado.',
        code: 'NENHUMA_DISCIPLINA',
      };
    }

    onProgress({
      etapa: 'Estruturação concluída!',
      percentual: 100,
    });

    return {
      success: true,
      disciplinas: data.disciplinas,
    };
  } catch (error) {
    console.error('Falha de rede ao conectar com /api/gemini/analisar-edital:', error);
    return {
      success: false,
      error: `Falha de conexão com o servidor de IA: ${error.message || 'Verifique sua conexão.'}`,
      code: 'ERRO_REDE',
    };
  }
}

/**
 * Exemplo didático de conteúdo de edital para testes rápidos
 */
export const EDITAL_EXEMPLO_TESTE = `LÍNGUA PORTUGUESA:
1. Compreensão e interpretação de textos de gêneros variados.
2. Reconhecimento de tipos e gêneros textuais.
3. Domínio da ortografia oficial: acentuação gráfica, emprego de letras.
4. Domínio dos mecanismos de coesão textual: emprego de elementos de referenciação, substituição e repetição.
5. Emprego das classes de palavras: substantivo, adjetivo, pronome, verbo, conjunção.
6. Relações de coordenação e subordinação entre orações e entre termos da oração.
7. Emprego dos sinais de pontuação.
8. Concordância verbal e nominal.
9. Regência verbal e nominal; crase.

DIREITO CONSTITUCIONAL:
1. Direitos e garantias fundamentais: direitos individuais e coletivos (art. 5º), remédios constitucionais, direitos sociais, nacionalidade e direitos políticos.
2. Organização do Estado: União, Estados, Distrito Federal e Municípios; repartição de competências.
3. Poder Executivo: atribuições e responsabilidades do Presidente da República.
4. Poder Legislativo: estrutura, funcionamento e processo legislativo ordinário.
5. Controle de Constitucionalidade: controle difuso e concentrado; ADI, ADC e ADPF.

RACIOCÍNIO LÓGICO-MATEMÁTICO:
1. Estruturas lógicas e diagramas de Venn.
2. Lógica de argumentação: proposições simples e compostas, tabelas-verdade, equivalências e negações.
3. Princípios de contagem e probabilidade.
4. Análise combinatória básica: arranjos, permutações e combinações.`;
