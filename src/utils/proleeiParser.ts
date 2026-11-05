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

  // 1. Mantém a extração de Município, Polo e Formadora (que já estão ótimas)
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

  let polo = '';
  const poloMatch = texto.match(/Polo\s*[:\-]?\s*([^\n\r]+)/i);
  if (poloMatch) {
    polo = poloMatch[1].trim().replace(/[-–]\s*RS$/i, '');
  }
  const poloFinal = (polo && polo !== 'RS') ? polo : identificarPolo(municipioFinal);

  let formadora = '';
  const formMatch = texto.match(/(?:Formadora\s*Municipal|Formadora|Formador)\s*[:\-]?\s*([^\n\r]+)/i);
  if (formMatch) {
    formadora = formMatch[1]
      .replace(/RELATÓRIO.*$|RELATORIO.*$|Documento.*$|–.*$/gi, '')
      .trim();
  }
  if ((!formadora || formadora.length < 3 || formadora.includes('_') || formadora.includes('.pdf')) && nomeArquivo) {
    const partes = nomeArquivo.split(/[-–_]/);
    if (partes.length > 1) {
      let candidato = partes[1].replace(/\.pdf$/i, '').replace(/RELATÓRIO.*$|RELATORIO.*$/gi, '').trim();
      if (candidato.length < 3 && partes.length > 2) {
        candidato = partes[2].replace(/\.pdf$/i, '').trim();
      }
      formadora = candidato;
    }
  }

  const formadoraFinal = (formadora && formadora.length > 2 && !formadora.includes('_'))
    ? formadora.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Não encontrado';

  // 2. Extração Precisa de Inscritos, Presentes e Faltas
  let cursistas: number | string = 'Não encontrado';
  const cursistasMatch = texto.match(/(?:total\s*de\s*cursistas\s*inscritos|cursistas\s*inscritos\s*na\s*turma|inscritos\s*na\s*turma|total\s*de\s*inscritos)[\s\S]*?(\d{1,3})/i);
  if (cursistasMatch) {
    const val = parseInt(cursistasMatch[1], 10);
    if (!isNaN(val)) cursistas = val;
  }

  let presentes: number | string = 'Não encontrado';
  const presentesMatch = texto.match(/(?:cursistas\s*presentes\s*no\s*encontro|presentes\s*no\s*encontro|cursistas\s*presentes)[\s\S]*?(\d{1,3})/i);
  if (presentesMatch) {
    const val = parseInt(presentesMatch[1], 10);
    if (!isNaN(val)) presentes = val;
  }

  let faltas: number | string = 0;
  const faltasMatch = texto.match(/faltas\s*justificadas[\s\S]*?(\d{1,2})/i);
  if (faltasMatch) {
    const val = parseInt(faltasMatch[1], 10);
    if (!isNaN(val)) faltas = val;
  }

  // 3. Extração Dinâmica e Individualizada de Encontros (Data, C.H. e Turno)
  const atividades: Array<{ data: string; ch: number | string; turno: string }> = [];
  
  // Procura por blocos que contêm datas no formato DD/MM/AA ou DD/MM/AAAA
  const regexBlocoData = /\b(\d{2})[/-](\d{2})[/-](\d{2,4})\b/g;
  let match;
  const datasProcessadas = new Set<string>();

  while ((match = regexBlocoData.exec(texto)) !== null) {
    const dia = match[1];
    const mes = match[2];
    let ano = match[3];
    if (ano.length === 2) ano = '20' + ano;
    
    const dataStr = `${dia}/${mes}/${ano}`;

    // Evita duplicar a mesma data exata no mesmo arquivo
    if (!datasProcessadas.has(dataStr)) {
      datasProcessadas.add(dataStr);

      // Isola o trecho ao redor da data encontrada para ler a C.H. e o Turno específicos daquele dia
      const indice = match.index;
      const trechoContexto = texto.substring(Math.max(0, indice - 30), Math.min(texto.length, indice + 120));

      // Busca Carga Horária específica próxima à data
      let ch: number | string = 'Não encontrado';
      const chMatch = trechoContexto.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|h)/i);
      if (chMatch) {
        ch = parseFloat(chMatch[1].replace(',', '.'));
      }

      // Busca Turno específico próximo à data
      let turno = 'Não encontrado';
      const tNorm = normalizar(trechoContexto);
      if (tNorm.includes('MANHA') || tNorm.includes('MANHÃ')) turno = 'Manhã';
      else if (tNorm.includes('TARDE')) turno = 'Tarde';
      else if (tNorm.includes('NOITE')) turno = 'Noite';

      atividades.push({ data: dataStr, ch, turno });
    }
  }

  // Se nenhuma data foi encontrada, retorna "Não encontrado" em vez de inventar
  if (atividades.length === 0) {
    atividades.push({ data: 'Não encontrado', ch: 'Não encontrado', turno: 'Não encontrado' });
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