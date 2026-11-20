import { describe, expect, it } from 'vitest';
import {
  extrairDados,
  ehRelatorioProleei,
  gerarLinhasPlanilha,
  identificarPolo,
} from './proleeiParser';

describe('identificação de polo', () => {
  it('identifica Aceguá no polo Bagé', () => {
    expect(identificarPolo('Aceguá')).toBe('Bagé');
  });

  it('identifica Agudo no polo Santa Maria', () => {
    expect(identificarPolo('Agudo')).toBe('Santa Maria');
  });
});

describe('extração dos relatórios ProLEEI', () => {
  it('extrai identificação, encontros e totais do relatório de Aceguá', () => {
    const texto = [
      'Polo: Bagé',
      'Município: Aceguá',
      'Nome da Formadora Municipal: Lisiane T. Pradie Teixeira',
      'Número total de cursistas inscritos: 8',
      'Número de cursistas presentes no encontro: 8',
      'Houve faltas justificadas? ( ) SIM (x) NÃO',
      'Data e carga horária do encontro:',
      '11/03/2026 | 4 horas | Noite',
      '13/03/2026 | 4 horas | Noite',
      'Local de realização:',
    ].join('\n');

    const dados = extrairDados(texto, 'Aceguá - Lisiane.pdf');

    expect(dados).toMatchObject({
      polo: 'Bagé',
      municipio: 'Aceguá',
      formadora: 'Lisiane T. Pradie Teixeira',
      cursistas: 8,
      presentes: 8,
      faltas: 'Não se aplica',
    });
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 4, turno: 'Noite' },
      { data: '13/03/2026', ch: 4, turno: 'Noite' },
    ]);
  });

  it('extrai Agudo e preserva a resposta Não se aplica para faltas', () => {
    const texto = [
      'Polo: Agudo',
      'Município: Agudo',
      'Nome da Formadora Municipal: Emanueli Unfer',
      'Número total de cursistas inscritos: 21',
      'Número de cursistas presentes no encontro: 21',
      'Número de faltas justificadas: Não se aplica',
      'Data e carga horária do encontro:',
      '11/03/2026 | 3 horas | Noite',
      '12/03/2026 | 3 horas | Noite',
      'Local de realização:',
    ].join('\n');

    const dados = extrairDados(texto, 'Agudo - Emanueli.pdf');

    expect(dados).toMatchObject({
      polo: 'Agudo',
      municipio: 'Agudo',
      formadora: 'Emanueli Unfer',
      cursistas: 21,
      presentes: 21,
      faltas: 'Não se aplica',
    });
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 3, turno: 'Noite' },
      { data: '12/03/2026', ch: 3, turno: 'Noite' },
    ]);
  });

  it('distingue zero explícito de informação não encontrada', () => {
    const textoComZero = [
      'Número de faltas justificadas: 0',
      'Data e carga horária do encontro:',
      '11/03/2026 | 3 horas | Noite',
      'Local de realização:',
    ].join('\n');
    const textoSemInformacao = [
      'Data e carga horária do encontro:',
      '11/03/2026 | 3 horas | Noite',
      'Local de realização:',
    ].join('\n');

    expect(extrairDados(textoComZero).faltas).toBe(0);
    expect(extrairDados(textoSemInformacao).faltas).toBe('Não encontrado');
    expect(extrairDados(textoSemInformacao).cursistas).toBe('Não encontrado');
    expect(extrairDados(textoSemInformacao).presentes).toBe('Não encontrado');
  });

  it('não inventa carga horária ou turno ausentes na linha do encontro', () => {
    const texto = [
      'Data e carga horária do encontro:',
      '11/03/2026',
      'Local de realização:',
    ].join('\n');

    expect(extrairDados(texto).atividades).toEqual([
      { data: '11/03/2026', ch: 'Não encontrado', turno: 'Não encontrado' },
    ]);
  });

  it('não usa datas de outras partes do relatório como encontros', () => {
    const texto = [
      'Data de preenchimento: 20/03/2026',
      'Data e carga horária do encontro:',
      '11/03/2026 | 3 horas | Noite',
      'Local de realização:',
      'Registro complementar em 25/03/2026',
    ].join('\n');

    expect(extrairDados(texto).atividades).toEqual([
      { data: '11/03/2026', ch: 3, turno: 'Noite' },
    ]);
  });
});

describe('regressões com estrutura dos relatórios reais de março', () => {
  it('Agudo: lê datas, carga horária, turno e resposta marcada Não', () => {
    const texto = [
      'RELATÓRIO MENSAL DE ATIVIDADES - ProLEEI RS',
      'Polo: Agudo',
      'Município: Agudo',
      'Nome da Formadora Municipal: Emanueli Unfer',
      'Data e Carga horária do encontro: 11 e 12 de março de 2026',
      'Data',
      'CH.',
      'Turno',
      '11/03/2026',
      '03 horas',
      'Noite',
      '12/03/2026',
      '03 horas',
      'Noite',
      'Local de realização do encontro: Meet',
      'Número total de cursistas inscritos na turma: 21',
      'Número de cursistas presentes no encontro: 21',
      'Houve faltas justificadas? (...) Sim   (x) Não',
      'Número de faltas justificadas: se houver – se a resposta for não escreva Não se aplica',
      'Agudo, 28 dia março de 2026.'
    ].join('\n');

    const dados = extrairDados(texto, 'AGUDO - EMANUELI UNFER RELATÓRIO.pdf');
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 3, turno: 'Noite' },
      { data: '12/03/2026', ch: 3, turno: 'Noite' },
    ]);
    expect(dados.faltas).toBe('Não se aplica');
  });

  it('Aceguá: reconhece ano com dois dígitos e total explícito de faltas', () => {
    const texto = [
      'Polo: Bagé',
      'Município: Aceguá',
      'Nome da Formadora Municipal: Lisiane T. Pradie Teixeira.',
      'Data e Carga horária do encontro:',
      'Data',
      'CH.',
      'Turno',
      '11/03/26',
      '04 horas',
      'noite',
      '13/03/26',
      '04 horas',
      'noite',
      'Local de realização do encontro: Formato online.',
      'Número total de cursistas inscritos na turma: 08',
      'Número de cursistas presentes no encontro: 08',
      'Houve faltas justificadas? (x) Sim (...) Não',
      'Número de faltas justificadas: 1',
      'Aceguá, 31 de março de 2026.'
    ].join('\n');

    const dados = extrairDados(texto, 'ACEGUÁ - LISIANE TELES PRADIE TEIXEIRA.pdf');
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 4, turno: 'Noite' },
      { data: '13/03/2026', ch: 4, turno: 'Noite' },
    ]);
    expect(dados.faltas).toBe(1);
  });

  it('Alecrim: infere 2026 porque o documento contém um único ano explícito', () => {
    const texto = [
      'Polo: Santa Rosa- TURMA 1-',
      'Município: Alecrim',
      'Nome da Formadora Municipal: Deisi Marilei Back',
      'Data e Carga horária do encontro:',
      'Data',
      'CH.',
      'Turno',
      '09/03',
      '02 horas',
      'Noite',
      '12/03',
      '02 horas',
      'Noite',
      'Local de realização: MEET',
      'Número total de cursistas inscritos na turma: 10',
      'Número de cursistas presentes no encontro: 10',
      'Houve faltas justificadas? (...) Sim   (.x..) Não se aplica',
      'CHAMADA 09/03/2026',
      'CHAMADA 12/03/2026',
      'Alecrim, 12 de março de 2026.'
    ].join('\n');

    const dados = extrairDados(texto, 'ALECRIM - DEISI MARILEI BACK RELATÓRIO.pdf');
    expect(dados.atividades).toEqual([
      { data: '09/03/2026', ch: 2, turno: 'Noite' },
      { data: '12/03/2026', ch: 2, turno: 'Noite' },
    ]);
    expect(dados.faltas).toBe('Não se aplica');
  });

  it('não inventa o ano quando o documento apresenta anos conflitantes', () => {
    const texto = [
      'Data e Carga horária do encontro:',
      '09/03',
      '02 horas',
      'Noite',
      'Local de realização:',
      'Referência de 2025 e assinatura em 2026.'
    ].join('\n');
    expect(extrairDados(texto).atividades[0].data).toBe('09/03');
  });
});

describe('geração das linhas da planilha', () => {
  it('registra os totais gerais somente na primeira linha do relatório', () => {
    const texto = [
      'Polo: Bagé',
      'Município: Aceguá',
      'Nome da Formadora Municipal: Lisiane T. Pradie Teixeira',
      'Número total de cursistas inscritos: 8',
      'Número de cursistas presentes no encontro: 8',
      'Número de faltas justificadas: 1',
      'Data e carga horária do encontro:',
      '11/03/2026 | 4 horas | Noite',
      '13/03/2026 | 4 horas | Noite',
      'Local de realização:',
    ].join('\n');

    const linhas = gerarLinhasPlanilha(
      extrairDados(texto),
      'Aceguá - Lisiane.pdf',
    );

    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({
      'Nº de cursistas': 8,
      'Nº de Presentes': 8,
      'Faltas justificadas': 1,
    });
    expect(linhas[1]).toMatchObject({
      'Nº de cursistas': '',
      'Nº de Presentes': '',
      'Faltas justificadas': '',
    });
  });
});


describe('regressões com o texto extraído dos PDFs de março', () => {
  it('Aceguá: preserva o nome real e não confunde 18h às 22h com carga horária', () => {
    const texto = [
      'RELATÓRIO MENSAL DE ATIVIDADES - FORMADOR(A) MUNICIPAL – ProLEEI RS',
      'Identificação',
      'Polo: Bagé',
      'Município: Aceguá',
      'Nome da Formadora Municipal: Lisiane T. Pradie Teixeira.',
      'Data e Carga horária do encontro:',
      'Data CH. Turno Horário',
      '11/03/26 04 horas noite 18h às 22h',
      '13/03/26 04 horas noite 18h às 22h',
      'Local de realização do encontro: Formato online.',
      'Participação',
      'Número total de cursistas inscritos na turma: 08',
      'Número de cursistas presentes no encontro:08',
      'Houve faltas justificadas? (x) Sim (...) Não',
      'Número de faltas justificadas: 1',
      'Aceguá, 31 de março de 2026.'
    ].join('\n');

    const dados = extrairDados(texto, 'ACEGUÁ - LISIANE TELES PRADIE TEIXEIRA RELATÓRIO_MARÇO_ProLEEI.pdf');
    expect(dados).toMatchObject({
      polo: 'Bagé',
      municipio: 'Aceguá',
      formadora: 'Lisiane T. Pradie Teixeira',
      cursistas: 8,
      presentes: 8,
      faltas: 1,
    });
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 4, turno: 'Noite' },
      { data: '13/03/2026', ch: 4, turno: 'Noite' },
    ]);
  });

  it('Agudo: prioriza a duração em horas em vez do horário de relógio', () => {
    const texto = [
      'RELATÓRIO MENSAL DE ATIVIDADES - FORMADOR(A) MUNICIPAL – ProLEEI RS',
      'Polo: Agudo',
      'Município: Agudo',
      'Nome da Formadora Municipal: Emanueli Unfer',
      'Data e Carga horária do encontro:',
      'Data CH. Turno Horário',
      '11/03/2026 03 horas Noite 18h às 21h',
      '12/03/2026 03 horas Noite 18h às 21h',
      'Local de realização do encontro: Meet',
      'Número total de cursistas inscritos na turma: 21',
      'Número de cursistas presentes no encontro: 21',
      'Houve faltas justificadas? (...) Sim (x) Não',
      'Número de faltas justificadas: se houver – se a resposta for não escreva Não se aplica'
    ].join('\n');

    const dados = extrairDados(texto, 'AGUDO - EMANUELI UNFER RELATÓRIO_FM_Março.pdf');
    expect(dados.formadora).toBe('Emanueli Unfer');
    expect(dados.atividades).toEqual([
      { data: '11/03/2026', ch: 3, turno: 'Noite' },
      { data: '12/03/2026', ch: 3, turno: 'Noite' },
    ]);
    expect(dados.faltas).toBe('Não se aplica');
  });

  it('corrige a leitura OCR recorrente de Alecrim', () => {
    const dados = extrairDados('Polo: Santa Rosa\nMunicípio: Alecrin');
    expect(dados.municipio).toBe('Alecrim');
    expect(dados.polo).toBe('Santa Rosa');
  });

  it('não confunde o título FORMADOR(A) MUNICIPAL com o nome da formadora', () => {
    const texto = [
      'RELATÓRIO MENSAL DE ATIVIDADES - FORMADOR(A) MUNICIPAL – ProLEEI RS',
      'Polo: Ijuí',
      'Município: Ajuricaba',
      'Nome da Formadora Municipal:',
      'Mariane Uhde Picinin Ziotti Viana',
      'Data e Carga horária do encontro:',
      '10/03/2026 04 horas Manhã'
    ].join('\n');
    expect(extrairDados(texto).formadora).toBe('Mariane Uhde Picinin Ziotti Viana');
  });

  it('reconhece anexos fotográficos isolados como não sendo relatórios', () => {
    expect(ehRelatorioProleei('Anexo - Registros fotográficos do encontro')).toBe(false);
    expect(ehRelatorioProleei('RELATÓRIO MENSAL DE ATIVIDADES - FORMADOR(A) MUNICIPAL\nNome da Formadora Municipal: Ana\nData e Carga horária do encontro:')).toBe(true);
    expect(ehRelatorioProleei('RELATÓRIO MENSAL DE ATIVIDADES\nNome da Formadora Municipal: Deisi', 'RELATÓRIO 2 FOTOS_ENCONTRO_.pdf')).toBe(false);
    expect(ehRelatorioProleei('RELATÓRIO MENSAL DE ATIVIDADES\nNome da Formadora Municipal: Deisi\nData e Carga horária do encontro:', 'RELATÓRIO 2 FOTOS_ENCONTRO_.pdf')).toBe(true);
  });

  it('registra pendências de extração na observação, sem inventar dados', () => {
    const linhas = gerarLinhasPlanilha(
      extrairDados('RELATÓRIO MENSAL DE ATIVIDADES - ProLEEI\nMunicípio: Aceguá'),
      'Aceguá.pdf'
    );
    expect(linhas[0].OBSERVAÇÃO).toContain('Revisar extração');
    expect(linhas[0].OBSERVAÇÃO).toContain('data do encontro');
  });
});
