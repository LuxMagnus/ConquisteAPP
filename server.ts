import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Configuração de CORS para permitir requisições locais da web e do Capacitor móvel
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições de apps mobile (Capacitor/Cordova), localhost e same-origin
      if (!origin || origin.startsWith('capacitor://') || origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

// Permite payloads de até 35MB para PDFs e documentos em base64
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Health check para serviços de nuvem (Cloud Run, Render, etc.)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'conquiste-backend',
  });
});

// Rate limiter em memória simples e eficiente para proteger a chave Gemini
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_REQUESTS_PER_WINDOW = 12; // Máximo de 12 análises completas de edital por hora por cliente

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetInMinutes: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetInMinutes: 60 };
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    const minutesLeft = Math.ceil((clientData.resetTime - now) / 60000);
    return { allowed: false, remaining: 0, resetInMinutes: minutesLeft };
  }

  clientData.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - clientData.count,
    resetInMinutes: Math.ceil((clientData.resetTime - now) / 60000),
  };
}

// Schema estrito de resposta conforme a especificação da Fase 6
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    disciplinas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          pesoSugerido: { type: Type.INTEGER },
          topicos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                subtopicos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
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

const PROMPT_INSTRUCOES = `Você é um analista especialista em concursos públicos no Brasil.
Analise com extrema precisão o conteúdo programático do edital fornecido (seja em texto ou documento anexado/PDF).

Instruções mandatórias:
1. Agrupe todo o conteúdo por disciplinas (ex: "Língua Portuguesa", "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico-Matemático", "Contabilidade Geral", "Legislação Tributária", etc.).
2. Para cada disciplina, sugira um pesoSugerido inteiro de 1 a 10 de acordo com sua densidade, relevância e extensão para concursos públicos.
3. Para cada disciplina, estruture os tópicos em no máximo 2 níveis:
   - topicos: Lista de tópicos/capítulos principais (ex: "1. Ortografia oficial", "2. Morfossintaxe", "3. Direitos e Garantias Fundamentais").
   - subtopicos: Array de strings contendo os subtópicos específicos pertencentes àquele tópico (ex: ["Acentuação gráfica", "Emprego do hífen"]). Caso o tópico não tenha subtópicos detalhados, envie um array vazio [].
4. Retorne rigorosamente o JSON conforme o schema exigido.`;

// Rota de API para análise de edital via Gemini no servidor (elimina PROXY_GENERATION_DISABLED)
app.post('/api/gemini/analisar-edital', async (req, res) => {
  try {
    const { textoEdital, file, geminiApiKey, userId } = req.body;

    // Identificador para rate limiting (userId autenticado ou IP da requisição)
    const clientIdentifier = (userId || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous').toString();

    // Chave de API: prioriza chave enviada pelo usuário na tela de configurações, depois process.env
    const isPersonalKey = Boolean(geminiApiKey && geminiApiKey.trim());
    const apiKey = (geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    // Se estiver usando a chave compartilhada do servidor, aplica trava de rate limit para proteger custos
    if (!isPersonalKey) {
      const rateLimit = checkRateLimit(clientIdentifier);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          error: `Limite de análises inteligentes atingido (${MAX_REQUESTS_PER_WINDOW} por hora). Para uso ilimitado imediato, adicione sua própria chave do Gemini nas Configurações ou aguarde ${rateLimit.resetInMinutes} minutos.`,
          code: 'RATE_LIMIT_EXCEDIDO',
          resetInMinutes: rateLimit.resetInMinutes,
        });
      }
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error:
          'Chave da API Gemini não configurada. Por favor, adicione sua chave nas Configurações do app ou configure a variável GEMINI_API_KEY.',
        code: 'CHAVE_AUSENTE',
      });
    }

    if (!textoEdital && !file) {
      return res.status(400).json({
        success: false,
        error: 'Envie o texto do edital ou anexe um arquivo (PDF, TXT, DOCX) para análise.',
        code: 'CONTEUDO_VAZIO',
      });
    }

    // Inicialização da SDK oficial @google/genai com User-Agent 'aistudio-build'
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Monta o payload de conteúdos (suporta texto puro ou arquivo PDF/documento inlineData)
    const parts: any[] = [];

    if (file && file.base64) {
      const mimeType = file.mimeType || 'application/pdf';
      parts.push({
        inlineData: {
          mimeType,
          data: file.base64,
        },
      });
      parts.push({
        text: `${PROMPT_INSTRUCOES}\n\nAnalise o documento anexado acima (${file.name || 'Edital'}) e extraia todas as disciplinas e tópicos do conteúdo programático.`,
      });
    } else {
      parts.push({
        text: `${PROMPT_INSTRUCOES}\n\nConteúdo Programático fornecido:\n"""\n${textoEdital}\n"""`,
      });
    }

    // Candidatos a modelo com fallback automático em caso de alta demanda (503/429)
    const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let response: any = null;
    let ultimoErroModelo: any = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        });
        if (response && response.text) {
          break; // Sucesso com este modelo
        }
      } catch (err: any) {
        ultimoErroModelo = err;
        const msg = err?.message || String(err);
        console.warn(`Tentativa com modelo ${modelName} falhou: ${msg}. Tentando próximo modelo...`);
        // Se for erro permanente de autenticação (chave inválida), não adianta tentar outros
        if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
          throw err;
        }
      }
    }

    if (!response || !response.text) {
      throw ultimoErroModelo || new Error('Nenhum modelo Gemini respondeu com sucesso.');
    }

    const outputText = response.text || '{}';
    let parsedData: any;

    try {
      parsedData = JSON.parse(outputText);
    } catch {
      // Limpeza de possíveis marcadores markdown se o modelo envolver em ```json
      const limpo = outputText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      parsedData = JSON.parse(limpo);
    }

    if (!parsedData || !Array.isArray(parsedData.disciplinas) || parsedData.disciplinas.length === 0) {
      return res.status(422).json({
        success: false,
        error:
          'Nenhuma disciplina pôde ser identificada no conteúdo analisado. Certifique-se de que o texto ou arquivo contém os pontos do edital.',
        code: 'NENHUMA_DISCIPLINA',
      });
    }

    return res.json({
      success: true,
      disciplinas: parsedData.disciplinas,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/gemini/analisar-edital:', error);

    const errorMsg = error?.message || String(error);

    // Tratamento dos erros mais frequentes
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('403')) {
      return res.status(403).json({
        success: false,
        error: 'Chave de API Gemini inválida ou sem permissão. Verifique a chave nas Configurações.',
        code: 'CHAVE_INVALIDA',
      });
    }

    if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
      return res.status(429).json({
        success: false,
        error: 'Limite de uso da API Gemini atingido (Rate limit ou Quota excedida). Aguarde 1 minuto antes de tentar novamente.',
        code: 'LIMITE_EXCEDIDO',
      });
    }

    return res.status(500).json({
      success: false,
      error: `Falha ao processar com a IA do Gemini: ${errorMsg}`,
      code: 'ERRO_SERVIDOR',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
