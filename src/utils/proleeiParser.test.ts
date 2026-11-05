import { describe, expect, it } from 'vitest';
import {
  extrairDados,
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
