import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Recompõe linhas a partir das coordenadas do PDF para não misturar colunas da tabela.
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
    let linha = linhas.find(l => Math.abs(l.y - item.y) <= 2.5);
    if (!linha) {
      linha = { y: item.y, itens: [] };
      linhas.push(linha);
    }
    linha.itens.push(item);
  }

  return linhas
    .sort((a, b) => b.y - a.y)
    .map(l => l.itens.sort((a, b) => a.x - b.x).map(item => item.texto).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
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

        // OCR quando a página é escaneada ou a primeira página não contém os campos essenciais.
        const primeiraPaginaIncompleta = i === 1 &&
          (!/DATA\s*(?:E|\/)\s*CARGA\s*HORARIA/i.test(textoPagina) ||
           !/CURSISTAS\s+INSCRITOS/i.test(textoPagina) ||
           !/CURSISTAS\s+PRESENTES/i.test(textoPagina));
        if (worker && (textoPagina.trim().length < 80 || primeiraPaginaIncompleta)) {
          try {
            onProgresso?.(`Complementando leitura com OCR na página ${i}...`);
            const viewport = pagina.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            if (context) {
              await pagina.render({ canvasContext: context, viewport }).promise;
              const ocr = await worker.recognize(canvas);
              const textoOCR = ocr?.data?.text || '';
              if ((primeiraPaginaIncompleta && /DATA\\s*(?:E|\\/)\\s*CARGA\\s*HORARIA/i.test(textoOCR) && /CURSISTAS\\s+INSCRITOS/i.test(textoOCR)) || textoOCR.trim().length > textoPagina.trim().length) {\n                textoPagina = textoOCR;\n              }
            }
          } catch (erroOCR) {
            console.warn(`Falha no OCR da página ${i}:`, erroOCR);
          }
        }

        if (textoPagina.trim()) paginas.push(`\n--- PÁGINA ${i} ---\n${textoPagina}`);
      }

      if (!paginas.length) return `Arquivo: ${file.name}\nNão foi possível extrair texto deste PDF.`;
      return paginas.join('\n');
    } catch (erro) {
      console.error('Erro ao processar PDF:', erro);
      return `Arquivo: ${file.name}\nNão foi possível ler o conteúdo do PDF.`;
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
      if (!worker) return `Arquivo: ${file.name}\nNão foi possível iniciar o OCR.`;
      const resultado = await worker.recognize(url);
      return resultado?.data?.text || `Arquivo: ${file.name}\nNão foi possível extrair texto da imagem.`;
    } catch (erro) {
      console.error('Erro no OCR da imagem:', erro);
      return `Arquivo: ${file.name}\nNão foi possível ler o conteúdo da imagem.`;
    } finally {
      URL.revokeObjectURL(url);
      if (worker) {
        try { await worker.terminate(); } catch (erro) { console.warn('Falha ao encerrar OCR:', erro); }
      }
    }
  }

  return '';
}
