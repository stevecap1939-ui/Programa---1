import * as XLSX from 'xlsx';
import { LinhaPlanilhaProLEEI } from './proleeiParser';

export function formatarLinhasParaExportacao(linhas: LinhaPlanilhaProLEEI[]) {
  return linhas.map(l => ({
    'Polo': l.Polo,
    'Município': l.Município,
    'Formadora': l.Formadora,
    'DATA': l.DATA,
    'C.H.': l['C.H.'],
    'TURNOS': l.TURNOS,
    'Nº de cursistas': l['Nº de cursistas'],
    'Nº de Presentes': l['Nº de Presentes'],
    'Faltas justificadas': l['Faltas justificadas'],
    'OBSERVAÇÃO': l.OBSERVAÇÃO,
    'Arquivo de Origem': l.Arquivo_Origem
  }));
}

export function exportarParaCSV(linhas: LinhaPlanilhaProLEEI[], referenciaMes: string = 'março') {
  if (!linhas || linhas.length === 0) return;

  const cabecalhos = [
    'Polo',
    'Município',
    'Formadora',
    'DATA',
    'C.H.',
    'TURNOS',
    'Nº de cursistas',
    'Nº de Presentes',
    'Faltas justificadas',
    'OBSERVAÇÃO',
    'Arquivo de Origem'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const linhasTexto = linhas.map(l => [
    escapeCSV(l.Polo),
    escapeCSV(l.Município),
    escapeCSV(l.Formadora),
    escapeCSV(l.DATA),
    escapeCSV(l['C.H.']),
    escapeCSV(l.TURNOS),
    escapeCSV(l['Nº de cursistas']),
    escapeCSV(l['Nº de Presentes']),
    escapeCSV(l['Faltas justificadas']),
    escapeCSV(l.OBSERVAÇÃO),
    escapeCSV(l.Arquivo_Origem)
  ].join(';'));

  // UTF-8 BOM (\uFEFF) para abrir no Excel em português com acentos perfeitos
  const conteudo = '\uFEFF' + [cabecalhos.map(escapeCSV).join(';'), ...linhasTexto].join('\r\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `relatorio_consolidado_${referenciaMes}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarParaExcel(linhas: LinhaPlanilhaProLEEI[], referenciaMes: string = 'março') {
  if (!linhas || linhas.length === 0) return;

  const dados = formatarLinhasParaExportacao(linhas);
  const worksheet = XLSX.utils.json_to_sheet(dados);

  // Ajusta larguras das colunas
  worksheet['!cols'] = [
    { wch: 18 }, // Polo
    { wch: 22 }, // Município
    { wch: 24 }, // Formadora
    { wch: 12 }, // DATA
    { wch: 8 },  // C.H.
    { wch: 10 }, // TURNOS
    { wch: 16 }, // Nº de cursistas
    { wch: 16 }, // Nº de Presentes
    { wch: 18 }, // Faltas justificadas
    { wch: 25 }, // OBSERVAÇÃO
    { wch: 30 }  // Arquivo de Origem
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `ProLEEI ${referenciaMes}`);
  XLSX.writeFile(workbook, `relatorio_consolidado_${referenciaMes}.xlsx`);
}

export async function copiarParaClipboard(linhas: LinhaPlanilhaProLEEI[]): Promise<boolean> {
  if (!linhas || linhas.length === 0) return false;

  const cabecalhos = [
    'Polo',
    'Município',
    'Formadora',
    'DATA',
    'C.H.',
    'TURNOS',
    'Nº de cursistas',
    'Nº de Presentes',
    'Faltas justificadas',
    'OBSERVAÇÃO',
    'Arquivo de Origem'
  ];

  const linhasTSV = linhas.map(l => [
    l.Polo,
    l.Município,
    l.Formadora,
    l.DATA,
    l['C.H.'],
    l.TURNOS,
    l['Nº de cursistas'],
    l['Nº de Presentes'],
    l['Faltas justificadas'],
    l.OBSERVAÇÃO,
    l.Arquivo_Origem
  ].join('\t'));

  const texto = [cabecalhos.join('\t'), ...linhasTSV].join('\n');

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    } else {
      // Fallback para textarea invisível
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const sucesso = document.execCommand('copy');
      document.body.removeChild(textarea);
      return sucesso;
    }
  } catch (err) {
    console.error('Erro ao copiar para clipboard:', err);
    return false;
  }
}

export function gerarExemplosRS(): LinhaPlanilhaProLEEI[] {
  return [
    {
      id: 'ex-1-bage',
      Polo: 'Bagé',
      Município: 'Candiota',
      Formadora: 'Mariana Duarte Souza',
      DATA: '04/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Noite',
      'Nº de cursistas': 18,
      'Nº de Presentes': 17,
      'Faltas justificadas': 1,
      OBSERVAÇÃO: 'Encontro presencial - Módulo Leitura e Infância',
      Arquivo_Origem: 'Relatorio_Candiota_Mariana_Mar26.pdf'
    },
    {
      id: 'ex-2-bage',
      Polo: 'Bagé',
      Município: 'Dom Pedrito',
      Formadora: 'Mariana Duarte Souza',
      DATA: '11/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Tarde',
      'Nº de cursistas': 22,
      'Nº de Presentes': 21,
      'Faltas justificadas': 1,
      OBSERVAÇÃO: 'Discussão sobre acervos pedagógicos',
      Arquivo_Origem: 'Dom_Pedrito_Formacao_M2.txt'
    },
    {
      id: 'ex-3-caxias',
      Polo: 'Caxias do Sul',
      Município: 'Bento Gonçalves',
      Formadora: 'Clarissa Silveira Ramos',
      DATA: '06/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Manhã',
      'Nº de cursistas': 25,
      'Nº de Presentes': 24,
      'Faltas justificadas': 1,
      OBSERVAÇÃO: 'Oficina de práticas literárias na creche',
      Arquivo_Origem: 'Bento_Goncalves_Clarissa_Mar.pdf'
    },
    {
      id: 'ex-4-passofundo',
      Polo: 'Passo Fundo',
      Município: 'Carazinho',
      Formadora: 'Rosane Martins Pereira',
      DATA: '12/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Noite',
      'Nº de cursistas': 20,
      'Nº de Presentes': 19,
      'Faltas justificadas': 0,
      OBSERVAÇÃO: 'Encontro focado em mediação leitora',
      Arquivo_Origem: 'Carazinho_Relatorio_Mar26.pdf'
    },
    {
      id: 'ex-5-pelotas',
      Polo: 'Pelotas',
      Município: 'Rio Grande',
      Formadora: 'Eliane Vasconcelos',
      DATA: '18/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Tarde',
      'Nº de cursistas': 28,
      'Nº de Presentes': 26,
      'Faltas justificadas': 2,
      OBSERVAÇÃO: 'Encontro 1 do Ciclo Formativo 2026',
      Arquivo_Origem: 'Rio_Grande_Eliane_Vasconcelos.txt'
    },
    {
      id: 'ex-6-poa',
      Polo: 'Porto Alegre',
      Município: 'Canoas',
      Formadora: 'Beatriz Almeida Lopes',
      DATA: '25/03/2026',
      'C.H.': 4.0,
      TURNOS: 'Noite',
      'Nº de cursistas': 30,
      'Nº de Presentes': 29,
      'Faltas justificadas': 1,
      OBSERVAÇÃO: 'Consolidação mensal polo metropolitano',
      Arquivo_Origem: 'Canoas_Beatriz_Mar2026.pdf'
    }
  ];
}
