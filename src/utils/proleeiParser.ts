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

type Atividade = { data: string; ch: number | string; turno: string };

function normalizar(texto: string): string {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function limparMunicipio(municipioRaw: string): string {
  if (!municipioRaw) return '';
  let mun = municipioRaw.replace(/[-–]\s*RS$/i, '').trim();
  mun = mun.replace(/\bRS\b/gi, '').trim();
  return mun.toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function limparPolo(poloRaw: string): string {
  return poloRaw
    .replace(/\s*[-–]?\s*TURMA\s*\d+\s*[-–]?\s*$/i, '')
    .replace(/\s*[-–]\s*RS$/i, '')
    .trim();
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

function extrairValorRotulo(linhas: string[], rotulo: RegExp): string {
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaNormalizada = normalizar(linha);
    const match = linhaNormalizada.match(rotulo);
    if (!match || match.index === undefined) continue;
    const valor = linha.slice(match.index + match[0].length).replace(/^\s*[:\-–]?\s*/, '').trim();
    if (valor) return valor;
    const proxima = (linhas[i + 1] || '').trim();
    if (proxima && !/^(POLO|MUNICIPIO|IDENTIFICACAO|PARTICIPACAO)\b/i.test(normalizar(proxima))) return proxima;
  }
  return '';
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
    const marcouNao = /\(\s*\.?\s*X\s*\.?\s*\)|\.X\.\./.test(resposta) &&
      /\bNAO(?:\s+SE\s+APLICA)?\b/.test(resposta);
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

function formatarData(match: RegExpExecArray, textoCompleto: string): string {
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
  return ano ? `${dia}/${mes}/${ano}` : `${dia}/${mes}`;
}

function extrairCargaHoraria(contexto: string): number | string {
  // Primeiro remove horários de relógio (ex.: 18h às 22h), que nunca são duração.
  const semFaixasDeHorario = normalizar(contexto).replace(
    /\b\d{1,2}(?::\d{2})?\s*H\s*(?:AS|ATE|[-–])\s*\d{1,2}(?::\d{2})?\s*H?\b/g,
    ' '
  );
  const horasExplicitas = semFaixasDeHorario.match(/\b(\d+(?:[.,]\d+)?)\s*HORAS?\b/);
  if (horasExplicitas) return Number(horasExplicitas[1].replace(',', '.'));

  const horasAbreviadas = semFaixasDeHorario.match(/\b(\d+(?:[.,]\d+)?)\s*H\b/);
  if (horasAbreviadas) return Number(horasAbreviadas[1].replace(',', '.'));
  return 'Não encontrado';
}

function extrairTurno(contexto: string): string {
  const t = normalizar(contexto);
  const manha = /\bMANHA\b/.test(t);
  const tarde = /\bTARDE\b/.test(t);
  const noite = /\bNOITE\b/.test(t);
  const turnos = [manha ? 'Manhã' : '', tarde ? 'Tarde' : '', noite ? 'Noite' : ''].filter(Boolean);
  return turnos.length ? turnos.join(' e ') : 'Não encontrado';
}

function extrairAtividades(linhas: string[], textoCompleto: string): Atividade[] {
  const inicio = linhas.findIndex(l =>
    /DATA\s*(?:E|\/)\s*CARGA\s*HORARIA\s+DO\s+ENCONTRO|DATAS\s+DOS\s+ENCONTROS/.test(normalizar(l))
  );
  let linhasTabela: string[];

  if (inicio >= 0) {
    let fim = linhas.findIndex((l, i) => i > inicio &&
      /LOCAL\s+DE\s+REALIZACAO|^PARTICIPACAO\b|REGISTROS\s+DAS\s+ATIVIDADES|^AVALIACAO\b/.test(normalizar(l)));
    if (fim < 0) fim = linhas.length;
    linhasTabela = linhas.slice(inicio + 1, fim);
  } else {
    linhasTabela = linhas;
  }

  const regexData = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g;
  const atividades: Atividade[] = [];
  const datasProcessadas = new Set<string>();

  for (let i = 0; i < linhasTabela.length; i++) {
    const linha = linhasTabela[i];
    regexData.lastIndex = 0;
    const matches = Array.from(linha.matchAll(regexData));
    if (!matches.length) continue;

    for (let m = 0; m < matches.length; m++) {
      const match = matches[m] as RegExpExecArray;
      const data = formatarData(match, textoCompleto);
      if (datasProcessadas.has(data)) continue;
      datasProcessadas.add(data);

      // Cada encontro recebe somente o conteúdo até a próxima data da tabela.
      const partes: string[] = [];
      const inicioConteudo = (match.index || 0) + match[0].length;
      const fimConteudo = m + 1 < matches.length ? (matches[m + 1].index || linha.length) : linha.length;
      partes.push(linha.slice(inicioConteudo, fimConteudo));
      for (let j = i + 1; j < linhasTabela.length; j++) {
        if (regexData.test(linhasTabela[j])) {
          regexData.lastIndex = 0;
          break;
        }
        regexData.lastIndex = 0;
        partes.push(linhasTabela[j]);
      }

      const contexto = partes.join(' ');
      atividades.push({
        data,
        ch: extrairCargaHoraria(contexto),
        turno: extrairTurno(contexto),
      });
    }
  }

  return atividades.length
    ? atividades
    : [{ data: 'Não encontrado', ch: 'Não encontrado', turno: 'Não encontrado' }];
}

/** Distingue relatórios mensais de anexos/fotografias isolados. */
export function ehRelatorioProleei(textoBruto: string): boolean {
  const t = normalizar(textoBruto || '');
  if (/RELATORIO\s+MENSAL\s+DE\s+ATIVIDADES/.test(t)) return true;
  const marcadores = [
    /NOME\s+DA\s+FORMADORA\s+MUNICIPAL/,
    /DATA\s*(?:E|\/)\s*CARGA\s*HORARIA\s+DO\s+ENCONTRO/,
    /NUMERO\s+TOTAL\s+DE\s+CURSISTAS\s+INSCRITOS/,
    /NUMERO\s+DE\s+CURSISTAS\s+PRESENTES/,
  ];
  return marcadores.filter(r => r.test(t)).length >= 2;
}

export function extrairDados(textoBruto: string, nomeArquivo: string = '') {
  const texto = textoBruto || '';
  const linhas = texto.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const municipioRaw = extrairValorRotulo(linhas, /^MUNICIPIO\s*:?/i);
  let municipio = municipioRaw ? limparMunicipio(municipioRaw) : '';
  if ((!municipio || municipio === 'Rs') && nomeArquivo) {
    const prefixo = nomeArquivo.replace(/\.pdf$/i, '').split(/\s[-–]\s/)[0];
    municipio = limparMunicipio(prefixo);
  }
  const municipioFinal = municipio && municipio.length > 1 ? municipio : 'Não encontrado';

  const poloRaw = extrairValorRotulo(linhas, /^POLO\s*:?/i);
  const polo = limparPolo(poloRaw);
  const poloFinal = polo && normalizar(polo) !== 'RS' ? polo : identificarPolo(municipioFinal);

  // O título "FORMADOR(A) MUNICIPAL" não é o campo do nome.
  // Só aceitamos rótulos de identificação explícitos, preferencialmente com dois-pontos.
  let formadoraRaw = extrairValorRotulo(linhas, /^NOME\s+DA\s+FORMADORA\s+MUNICIPAL\s*:/i);
  if (!formadoraRaw) formadoraRaw = extrairValorRotulo(linhas, /^FORMADORA\s+MUNICIPAL\s*:/i);
  if (!formadoraRaw) formadoraRaw = extrairValorRotulo(linhas, /^FORMADORA\s*:/i);
  if (!formadoraRaw && nomeArquivo) {
    const semExtensao = nomeArquivo.replace(/\.pdf$/i, '');
    const partes = semExtensao.split(/\s[-–]\s/);
    if (partes.length > 1) {
      formadoraRaw = partes.slice(1).join(' - ')
        .replace(/\bRELAT[ÓO]RIO\b.*$/i, '')
        .replace(/\bDOCUMENTO\b.*$/i, '')
        .replace(/\bFOTOS?\b.*$/i, '')
        .replace(/[_–-]+$/g, '')
        .replace(/_/g, ' ')
        .trim();
    }
  }
  const formadora = formadoraRaw
    .replace(/\s+(?:RELAT[ÓO]RIO|DOCUMENTO)\b.*$/i, '')
    .replace(/[.\s]+$/g, '')
    .trim();
  const formadoraFinal = formadora.length > 2
    ? formadora.split(/\s+/).map(w => w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Não encontrado';

  const cursistas = extrairNumeroEmLinha(linhas, /(?:NUMERO\s+TOTAL\s+DE\s+CURSISTAS\s+INSCRITOS|TOTAL\s+DE\s+CURSISTAS\s+INSCRITOS|CURSISTAS\s+INSCRITOS\s+NA\s+TURMA|INSCRITOS\s+NA\s+TURMA|TOTAL\s+DE\s+INSCRITOS)/);
  const presentes = extrairNumeroEmLinha(linhas, /(?:NUMERO\s+DE\s+CURSISTAS\s+PRESENTES\s+NO\s+ENCONTRO|CURSISTAS\s+PRESENTES\s+NO\s+ENCONTRO|PRESENTES\s+NO\s+ENCONTRO|CURSISTAS\s+PRESENTES)/);
  const faltas = extrairFaltas(linhas);
  const atividades = extrairAtividades(linhas, texto);

  return { polo: poloFinal, municipio: municipioFinal, formadora: formadoraFinal, cursistas, presentes, faltas, atividades };
}

function observacaoDaLinha(dados: ReturnType<typeof extrairDados>, atividade: Atividade): string {
  const pendencias: string[] = [];
  if (dados.polo === 'Não encontrado') pendencias.push('Polo');
  if (dados.municipio === 'Não encontrado') pendencias.push('Município');
  if (dados.formadora === 'Não encontrado') pendencias.push('Formadora');
  if (atividade.data === 'Não encontrado') pendencias.push('data do encontro');
  if (atividade.ch === 'Não encontrado') pendencias.push('carga horária');
  if (atividade.turno === 'Não encontrado') pendencias.push('turno');
  if (dados.cursistas === 'Não encontrado') pendencias.push('total de cursistas');
  if (dados.presentes === 'Não encontrado') pendencias.push('presentes');
  if (dados.faltas === 'Não encontrado') pendencias.push('faltas justificadas');
  return pendencias.length ? `Revisar extração: não foi possível identificar ${pendencias.join(', ')}.` : '';
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
    OBSERVAÇÃO: observacaoDaLinha(dados, ativ),
    Arquivo_Origem: nomeArquivo
  }));
}
