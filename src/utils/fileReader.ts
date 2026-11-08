import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// O worker precisa ser empacotado pelo Vite junto com a mesma versão do PDF.js.
// Evita depender de CDN externo e de um arquivo .js que não existe nas versões atuais.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

// Recompõe linhas usando as coordenadas do PDF. A tolerância considera pequenas
// diferenças de baseline entre palavras que visualmente pertencem à mesma linha.
function reconstruirLinhasPDF(items: any[]): string {
  const posicionados = items
    .filter(item => typeof item.str === 'string' && item.str.trim())
    .map((item, ordem) => ({
      texto: item.str.trim(),
      x: Array.isArray(item.transform) ? item.transform[4] : 0,
      y: Array.isArray(item.transform) ? item.transform[5] : -ordem,
      ordem
    }));

  if (!posicionados.length) return '';
  if (posicionados.every(item => item.y === -item.ordem)) {
    return posicionados.map(item => item.texto).join(' ');
  }

  posicionados.sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Array<{ y: number; itens: typeof posicionados }> = [];

  for (const item of posicionados) {
    // Escolhe a linha mais próxima, evitando agrupar no primeiro baseline compatível.
    let linhaMaisProxima: typeof linhas[number] | undefined;
    let menorDistancia = Number.POSITIVE_INFINITY;
    for (const linha of linhas) {
      const distancia = Math.abs(linha.y - item.y);
      if (distancia <= 3.5 && distancia < menorDistancia) {
        linhaMaisProxima = linha;
        menorDistancia = distancia;
      }
    }

    if (!linhaMaisProxima) {
      linhaMaisProxima = { y: item.y, itens: [] };
      linhas.push(linhaMaisProxima);
    }
    linhaMaisProxima.itens.push(item);
  }

  return linhas
    .sort((a, b) => b.y - a.y)
    .map(l => l.itens.sort((a, b) => a.x - b.x).map(item => item.texto).join(' ').replace(/\\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\\n');
}

async function criarWorkerOCR() {
  try {
    return await createWorker('por');
  } catch (erro) {
    console.warn('OCR não pôde ser inicializado.', erro);
    return null;
  }
}

export async function lerConteudoArquivo(file: File, onProgresso?: (msg: string) => void): Promise<string> {
  const extensao = file.name.split('.').pop()?.toLowerCase() || '';

  if (extensao === 'txt') return await file.text();

  if (extensao === 'pdf') {
    let worker: any = null;
    try {
      onProgresso?.('Lendo estrutura do PDF...');
      const pdfDoc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const paginas: string[] = [];
      worker = await criarWorkerOCR();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        onProgresso?.(`Processando página ${i} de ${pdfDoc.numPages}...`);
        const pagina = await pdfDoc.getPage(i);
        const content = await pagina.getTextContent();
        let textoPagina = reconstruirLinhasPDF(content.items as any[]);

        // OCR em páginas escaneadas ou quando faltam os rótulos centrais do formulário.
        const primeiraPaginaIncompleta = i === 1 &&
          (!/DATA\\s*(?:E|\\/)\\s*CARGA\\s*HORARIA/i.test(textoPagina) ||
           !/CURSISTAS\\s+INSCRITOS/i.test(textoPagina) ||
           !/CURSISTAS\\s+PRESENTES/i.test(textoPagina));
        if (worker && (textoPagina.trim().length < 80 || primeiraPaginaIncompleta)) {
          try {
            onProgresso?.(`Complementando leitura com OCR na página ${i}...`);
            const viewport = pagina.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            if (context) {
              await pagina.render({ canvas, canvasContext: context, viewport }).promise;
              const ocr = await worker.recognize(canvas);
              const textoOCR = ocr?.data?.text || '';
              const ocrTemCamposCentrais =
                /DATA\\s*(?:E|\\/)\\s*CARGA\\s*HORARIA/i.test(textoOCR) &&
                /CURSISTAS\\s+INSCRITOS/i.test(textoOCR);
              if (textoOCR.trim().length > textoPagina.trim().length ||
                  (primeiraPaginaIncompleta && ocrTemCamposCentrais)) {
                textoPagina = textoOCR;
              }
            }
          } catch (erroOCR) {
            console.warn(`Falha no OCR da página ${i}:`, erroOCR);
          }
        }

        if (textoPagina.trim()) paginas.push(`\\n--- PÁGINA ${i} ---\\n${textoPagina}`);
      }

      if (!paginas.length) return `Arquivo: ${file.name}\\nNão foi possível extrair texto deste PDF.`;
      return paginas.join('\\n');
    } catch (erro) {
      console.error('Erro ao processar PDF:', erro);
      return `Arquivo: ${file.name}\\nNão foi possível ler o conteúdo do PDF.`;
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch (erro) { console.warn('Falha ao encerrar OCR:', erro); }
      }
    }
  }

  if (['png', 'jpg', 'jpeg'].includes(extensao)) {
    let worker: any = null;
    const url = URL.createObjectURL(file);
    try {
      onProgresso?.('Executando OCR em imagem...');
      worker = await criarWorkerOCR();
      if (!worker) return `Arquivo: ${file.name}\\nNão foi possível iniciar o OCR.`;
      const resultado = await worker.recognize(url);
      return resultado?.data?.text || `Arquivo: ${file.name}\\nNão foi possível extrair texto da imagem.`;
    } catch (erro) {
      console.error('Erro no OCR da imagem:', erro);
      return `Arquivo: ${file.name}\\nNão foi possível ler o conteúdo da imagem.`;
    } finally {
      URL.revokeObjectURL(url);
      if (worker) {
        try { await worker.terminate(); } catch (erro) { console.warn('Falha ao encerrar OCR:', erro); }
      }
    }
  }

  return '';
}
