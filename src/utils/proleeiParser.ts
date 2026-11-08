import { MAPEAMENTO_POLOS } from './polosData';

export interface LinhaPlanilhaProLEEI {
  id: string;
  Polo: string;
  Município: string;
  Formadora: string;
  DATA: string;
  'C.H.': number | string;
  TURNOS: string;
  'Nº de cursistas': number | string;
  'Nº de Presentes': number | string;
  'Faltas justificadas': number | string;
  OBSERVAÇÃO: string;
  Arquivo_Origem: string;
}

function normalizar(texto: string): string {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function limparMunicipio(municipioRaw: string): string {
  if (!municipioRaw) return '';
  let mun = municipioRaw.replace(/[-–]\s*RS$/i, '').trim();
  mun = mun.replace(/\bRS\b/gi, '').trim();
  return mun.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function identificarPolo(municipio: string): string {
  if (!municipio || municipio === 'Não encontrado') return 'Não encontrado';
  const munNorm = normalizar(limparMunicipio(municipio));
  for (const [polo, cidades] of Object.entries(MAPEAMENTO_POLOS)) {
    for (const cidade of cidades) {
      const cidNorm = normalizar(cidade);
      if (munNorm === cidNorm || munNorm.includes(cidNorm) || cidNorm.includes(munNorm)) return polo;
    }
  }
  return 'Não encontrado';
}

function extrairNumeroEmLinha(linhas: string[], padraoRotulo: RegExp): number | string {
  const indice = linhas.findIndex(linha => padraoRotulo.test(normalizar(linha)));
  if (indice < 0) return 'Não encontrado';

  const linhaNormalizada = normalizar(linhas[indice]);
  const posRotulo = linhaNormalizada.search(padraoRotulo);
  const depoisRotulo = linhaNormalizada.slice(posRotulo).replace(padraoRotulo, ' ');
  const numeroNaLinha = depoisRotulo.match(/(?:^|[^\d])(\d{1,3})(?!\d)/);
  if (numeroNaLinha) return Number(numeroNaLinha[1]);

  const proxima = (linhas[indice + 1] || '').trim();
  if (/^\d{1,3}$/.test(proxima)) return Number(proxima);
  return 'Não encontrado';
}

function extrairFaltas(linhas: string[]): number | string {
  const linhaResposta = linhas.find(l => normalizar(l).includes('HOUVE FALTAS JUSTIFICADAS'));
  if (linhaResposta) {
    const resposta = normalizar(linhaResposta);
    // Os formulários reais usam tanto "(x) Não" quanto "(.x..) Não se aplica".
    const marcouNao = /(?:\(\s*\.?\s*X\s*\.{0,2}\s*\)|\.X\.\.)\s*NAO\b/.test(resposta);
    if (marcouNao) return 'Não se aplica';
  }

  const indice = linhas.findIndex(l => /NUMERO\s+DE\s+FALTAS\s+JUSTIFICADAS/.test(normalizar(l)));
  if (indice < 0) return 'Não encontrado';

  const linhaNormalizada = normalizar(linhas[indice]);
  const rotulo = /NUMERO\s+DE\s+FALTAS\s+JUSTIFICADAS\s*:?/;
  const depoisRotulo = linhaNormalizada.slice(linhaNormalizada.search(rotulo)).replace(rotulo, ' ');
  if (/NAO\s+SE\s+APLICA/.test(depoisRotulo)) return 'Não se aplica';

  const numero = depoisRotulo.match(/(?:^|[^\d])(\d{1,2})(?!\d)/);
  if (numero) return Number(numero[1]);

  const proxima = normalizar(linhas[indice + 1] || '');
  if (/^\d{1,2}$/.test(proxima)) return Number(proxima);
  if (/^NAO\s+SE\s+APLICA\.?$/.test(proxima)) return 'Não se aplica';
  return 'Não encontrado';
}

function extrairAtividades(linhas: string[], textoCompleto: string): Array<{ data: string; ch: number | string; turno: string }> {
  const inicio = linhas.findIndex(l => /DATA\s*(?:E|\/)\s*CARGA\s*HORARIA\s+DO\s+ENCONTRO|DATAS\s+DOS\s+ENCONTROS/i.test(normalizar(l)));
  let linhasTabela: string[];

  if (inicio >= 0) {
    let fim = linhas.findIndex((l, i) => i > inicio &&
      /LOCAL\s+DE\s+REALIZACAO|^\s*PARTICIPACAO\b|REGISTROS\s+DAS\s+ATIVIDADES|^\s*AVALIACAO\b/i.test(normalizar(l)));
    if (fim < 0) fim = linhas.length;
    linhasTabela = linhas.slice(inicio, fim);
  } else {
    linhasTabela = linhas.filter(l => /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(l) && /(HORAS?|\bH\b|MANHA|TARDE|NOITE)/i.test(normalizar(l)));
  }

  // Só completa o ano quando a mesma data aparece explicitamente em outro trecho
  // do documento (por exemplo, nas chamadas/listas de presença).
  const atividades: Array<{ data: string; ch: number | string; turno: string }> = [];
  const datasProcessadas = new Set<string>();
  const regexData = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g;

  for (let i = 0; i < linhasTabela.length; i++) {
    const linha = linhasTabela[i];
    regexData.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regexData.exec(linha)) !== null) {
      const dia = match[1].padStart(2, '0');
      const mes = match[2].padStart(2, '0');
      const anoInformado = match[3] || '';
      const anosDaMesmaData = Array.from(new Set(
        Array.from(textoCompleto.matchAll(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/g))
          .filter(ocorrencia => ocorrencia[1] === dia && ocorrencia[2] === mes)
          .map(ocorrencia => ocorrencia[3])
      ));
      const ano = anoInformado
        ? (anoInformado.length === 2 ? '20' + anoInformado : anoInformado)
        : (anosDaMesmaData.length === 1 ? anosDaMesmaData[0] : '');
      const data = ano ? `${dia}/${mes}/${ano}` : `${dia}/${mes}`;
      if (datasProcessadas.has(data)) continue;
      datasProcessadas.add(data);

      // Em alguns PDFs os valores aparecem na mesma linha da data; em outros,
      // a extração de texto os separa em linhas consecutivas da mesma tabela.
      const proximasLinhas: string[] = [];
      for (let j = i; j < Math.min(linhasTabela.length, i + 5); j++) {
        if (j > i && /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(linhasTabela[j])) break;
        proximasLinhas.push(linhasTabela[j]);
      }
      const contextoLinha = proximasLinhas.join(' ').replace(linha, linha.replace(match[0], ' '));
      const chMatch = contextoLinha.match(/\b(\d+(?:[.,]\d+)?)\s*(?:horas?|h)\b/i);
      const ch: number | string = chMatch ? Number(chMatch[1].replace(',', '.')) : 'Não encontrado';
      const turnoNormalizado = normalizar(contextoLinha);
      let turno = 'Não encontrado';
      if (/\bMANHA\b/.test(turnoNormalizado)) turno = 'Manhã';
      else if (/\bTARDE\b/.test(turnoNormalizado)) turno = 'Tarde';
      else if (/\bNOITE\b/.test(turnoNormalizado)) turno = 'Noite';
      atividades.push({ data, ch, turno });
    }
  }

  return atividades.length ? atividades : [{ data: 'Não encontrado', ch: 'Não encontrado', turno: 'Não encontrado' }];
}
export function extrairDados(textoBruto: string, nomeArquivo: string = '') {
  const texto = textoBruto || '';
  const linhas = texto.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Identificação: lógica preservada para Polo, Município e Formadora.
  let municipio = '';
  const munMatch = texto.match(/(?:Município|Municipio)\s*[:\-]?\s*([^\n\r]+)/i);
  if (munMatch) municipio = limparMunicipio(munMatch[1]);
  if ((!municipio || municipio === 'Rs') && nomeArquivo) {
    const partes = nomeArquivo.split(/[-–_]/);
    if (partes.length > 0) municipio = limparMunicipio(partes[0]);
  }
  const municipioFinal = (municipio && municipio.length > 1) ? municipio : 'Não encontrado';

  let polo = '';
  const poloMatch = texto.match(/Polo\s*[:\-]?\s*([^\n\r]+)/i);
  if (poloMatch) polo = poloMatch[1].trim().replace(/[-–]\s*RS$/i, '');
  const poloFinal = (polo && polo !== 'RS') ? polo : identificarPolo(municipioFinal);

  let formadora = '';
  const formMatch = texto.match(/(?:Formadora\s*Municipal|Formadora|Formador)\s*[:\-]?\s*([^\n\r]+)/i);
  if (formMatch) formadora = formMatch[1].replace(/RELATÓRIO.*$|RELATORIO.*$|Documento.*$|–.*$/gi, '').trim();
  if ((!formadora || formadora.length < 3 || formadora.includes('_') || formadora.includes('.pdf')) && nomeArquivo) {
    const partes = nomeArquivo.split(/[-–_]/);
    if (partes.length > 1) {
      let candidato = partes[1].replace(/\.pdf$/i, '').replace(/RELATÓRIO.*$|RELATORIO.*$/gi, '').trim();
      if (candidato.length < 3 && partes.length > 2) candidato = partes[2].replace(/\.pdf$/i, '').trim();
      formadora = candidato;
    }
  }
  const formadoraFinal = (formadora && formadora.length > 2 && !formadora.includes('_'))
    ? formadora.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Não encontrado';

  const cursistas = extrairNumeroEmLinha(linhas, /(?:NUMERO\s+TOTAL\s+DE\s+CURSISTAS\s+INSCRITOS|TOTAL\s+DE\s+CURSISTAS\s+INSCRITOS|CURSISTAS\s+INSCRITOS\s+NA\s+TURMA|INSCRITOS\s+NA\s+TURMA|TOTAL\s+DE\s+INSCRITOS)/);
  const presentes = extrairNumeroEmLinha(linhas, /(?:NUMERO\s+DE\s+CURSISTAS\s+PRESENTES\s+NO\s+ENCONTRO|CURSISTAS\s+PRESENTES\s+NO\s+ENCONTRO|PRESENTES\s+NO\s+ENCONTRO|CURSISTAS\s+PRESENTES)/);
  const faltas = extrairFaltas(linhas);
  const atividades = extrairAtividades(linhas, texto);

  return { polo: poloFinal, municipio: municipioFinal, formadora: formadoraFinal, cursistas, presentes, faltas, atividades };
}

export function gerarLinhasPlanilha(dados: ReturnType<typeof extrairDados>, nomeArquivo: string): LinhaPlanilhaProLEEI[] {
  return dados.atividades.map((ativ, index) => ({
    id: `${nomeArquivo}-${index}-${Date.now()}`,
    Polo: dados.polo || 'Não encontrado',
    Município: dados.municipio || 'Não encontrado',
    Formadora: dados.formadora || 'Não encontrado',
    DATA: ativ.data,
    'C.H.': ativ.ch,
    TURNOS: ativ.turno,
    'Nº de cursistas': index === 0 ? dados.cursistas : '',
    'Nº de Presentes': index === 0 ? dados.presentes : '',
    'Faltas justificadas': index === 0 ? dados.faltas : '',
    OBSERVAÇÃO: '',
    Arquivo_Origem: nomeArquivo
  }));
}
