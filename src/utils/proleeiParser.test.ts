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
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function limparMunicipio(municipioRaw: string): string {
  if (!municipioRaw) return '';
  let mun = municipioRaw.replace(/[-–]\s*RS$/i, '').trim();
  mun = mun.replace(/\bRS\b/gi, '').trim();
  return mun
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function identificarPolo(municipio: string): string {
  if (!municipio || municipio === 'Não encontrado') return 'Não encontrado';
  const munNorm = normalizar(limparMunicipio(municipio));

  for (const [polo, cidades] of Object.entries(MAPEAMENTO_POLOS)) {
    for (const cidade of cidades) {
      const cidNorm = normalizar(cidade);
      if (munNorm === cidNorm || munNorm.includes(cidNorm) || cidNorm.includes(munNorm)) {
        return polo;
      }
    }
  }
  return 'Não encontrado';
}

export function extrairDados(textoBruto: string, nomeArquivo: string = '') {
  const texto = textoBruto || '';

  // 1. Extração de Município
  let municipio = '';
  const munMatch = texto.match(/(?:Município|Municipio)\s*[:\-]?\s*([^\n\r]+)/i);
  if (munMatch) {
    municipio = limparMunicipio(munMatch[1]);
  }
  if ((!municipio || municipio === 'Rs') && nomeArquivo) {
    const partes = nomeArquivo.split(/[-–_]/);
    if (partes.length > 0) {
      municipio = limparMunicipio(partes[0]);
    }
  }
  const municipioFinal = (municipio && municipio.length > 1) ? municipio : 'Não encontrado';

  // 2. Extração de Polo
  let polo = '';
  const poloMatch = texto.match(/Polo\s*[:\-]?\s*([^\n\r]+)/i);
  if (poloMatch) {
    polo = poloMatch[1].trim().replace(/[-–]\s*RS$/i, '');
  }
  if (!polo || polo === 'RS' || polo === 'Não Identificado') {
    polo = identificarPolo(municipioFinal);
  }
  const poloFinal = (polo && polo !== 'RS') ? polo : identificarPolo(municipioFinal);

  // 3. Extração de Formadora
  let formadora = '';
  const formMatch = texto.match(/(?:Formadora\s*Municipal|Formadora|Formador)\s*[:\-]?\s*([^\n\r]+)/i);
  if (formMatch) {
    formadora = formMatch[1]
      .replace(/RELATÓRIO.*$|RELATORIO.*$|Documento.*$/gi, '')
      .trim();
  }
  if ((!formadora || formadora.length < 3) && nomeArquivo) {
    const partes = nomeArquivo.split(/[-–_]/);
    if (partes.length > 1) {
      formadora = partes[1]
        .replace(/RELATÓRIO.*$|RELATORIO.*$|Documento.*$/gi, '')
        .trim();
    }
  }

  const formadoraFinal = (formadora && formadora.length > 2)
    ? formadora.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Não encontrado';

  // 4. Extração de Cursistas, Presentes e Faltas (retorna "Não encontrado" se ausente)
  const cursistasMatch = texto.match(/(?:cursistas inscritos|total de cursistas|inscritos na turma)[^0-9]*(\d+)/i);
  const cursistas = cursistasMatch ? parseInt(cursistasMatch[1], 10) : 'Não encontrado';

  const presentesMatch = texto.match(/(?:cursistas presentes|presentes no encontro)[^0-9]*(\d+)/i);
  const presentes = presentesMatch ? parseInt(presentesMatch[1], 10) : 'Não encontrado';

  const faltasMatch = texto.match(/faltas justificadas[^0-9]*(\d+)/i);
  const faltas = faltasMatch ? parseInt(faltasMatch[1], 10) : 0;

  // 5. Extração de Datas
  const atividades: Array<{ data: string; ch: number | string; turno: string }> = [];
  const regexDatas = /\b(\d{2})[/-](\d{2})[/-](\d{2,4})\b/g;
  let match;
  const datasProcessadas = new Set<string>();

  while ((match = regexDatas.exec(texto)) !== null) {
    const dia = match[1];
    const mes = match[2];
    let ano = match[3];
    
    if (ano.length === 2) {
      ano = '20' + ano;
    }
    
    const dataStr = `${dia}/${mes}/${ano}`;

    if (ano === '2026' && !datasProcessadas.has(dataStr)) {
      datasProcessadas.add(dataStr);
      
      const indice = match.index;
      const trecho = texto.substring(indice, indice + 100);
      
      let ch: number | string = 4.0;
      const chMatch = trecho.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|h)/i);
      if (chMatch) {
        ch = parseFloat(chMatch[1].replace(',', '.'));
      }

      let turno = 'Não encontrado';
      const tNorm = normalizar(trecho);
      if (tNorm.includes('MANHA')) turno = 'Manhã';
      else if (tNorm.includes('TARDE')) turno = 'Tarde';
      else if (tNorm.includes('NOITE')) turno = 'Noite';

      atividades.push({ data: dataStr, ch, turno });
    }
  }

  // Se nenhuma data foi encontrada, atribui "Não encontrado" em vez de inventar
  if (atividades.length === 0) {
    const fallbackMatch = texto.match(/\b(\d{2}[/-]\d{2}[/-]\d{2,4})\b/);
    if (fallbackMatch) {
      let d = fallbackMatch[1].replace(/-/g, '/');
      if (d.length === 8) d = d.substring(0, 6) + '20' + d.substring(6);
      atividades.push({ data: d, ch: 'Não encontrado', turno: 'Não encontrado' });
    } else {
      atividades.push({ data: 'Não encontrado', ch: 'Não encontrado', turno: 'Não encontrado' });
    }
  }

  return {
    polo: poloFinal,
    municipio: municipioFinal,
    formadora: formadoraFinal,
    cursistas,
    presentes,
    faltas,
    atividades
  };
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
    'Nº de cursistas': dados.cursistas,
    'Nº de Presentes': dados.presentes,
    'Faltas justificadas': dados.faltas,
    OBSERVAÇÃO: '',
    Arquivo_Origem: nomeArquivo
  }));
}