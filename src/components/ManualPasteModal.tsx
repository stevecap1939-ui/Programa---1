import React, { useState } from 'react';
import { 
  LinhaPlanilhaProLEEI, 
  extrairDados, 
  gerarLinhasPlanilha 
} from '../utils/proleeiParser';
import { 
  X, 
  ClipboardPaste, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';

interface ManualPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdicionarLinhas: (linhas: LinhaPlanilhaProLEEI[]) => void;
}

const TEXTO_EXEMPLO = `RELATÓRIO MENSAL DE FORMAÇÃO - PROLEEI RS
Município: Candiota - RS
Polo: Bagé
Formadora Municipal: Mariana Duarte Souza
Total de cursistas inscritos: 18
Cursistas presentes no encontro: 17
Faltas justificadas: 1

Datas dos Encontros Realizados:
- 04/03/2026: 4 horas - Turno Noite. Tema: Módulo 1 - Leitura e Infância.
- 18/03/2026: 4 horas - Turno Noite. Tema: Módulo 2 - Mediação e Livros Ilustrados.
`;

export const ManualPasteModal: React.FC<ManualPasteModalProps> = ({
  isOpen,
  onClose,
  onAdicionarLinhas
}) => {
  const [textoBruto, setTextoBruto] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('Texto_Manual.txt');
  const [dadosPreview, setDadosPreview] = useState<ReturnType<typeof extrairDados> | null>(null);

  if (!isOpen) return null;

  const handleAnalisar = () => {
    if (!textoBruto.trim()) return;
    const extraido = extrairDados(textoBruto, nomeArquivo);
    setDadosPreview(extraido);
  };

  const handleSalvar = () => {
    const dados = dadosPreview || extrairDados(textoBruto, nomeArquivo);
    const linhas = gerarLinhasPlanilha(dados, nomeArquivo || 'Entrada_Manual.txt');
    if (linhas.length > 0) {
      onAdicionarLinhas(linhas);
      setTextoBruto('');
      setDadosPreview(null);
      onClose();
    }
  };

  const handlePreencherExemplo = () => {
    setTextoBruto(TEXTO_EXEMPLO);
    setNomeArquivo('Candiota_Mariana_Mar26.txt');
    const extraido = extrairDados(TEXTO_EXEMPLO, 'Candiota_Mariana_Mar26.txt');
    setDadosPreview(extraido);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Colar Texto do Relatório Manualmente
              </h2>
              <p className="text-xs text-slate-500">
                Copie e cole trechos de atas, e-mails ou mensagens para extração automática
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700">
              Nome de Referência / Arquivo (Opcional):
            </label>
            <button
              type="button"
              onClick={handlePreencherExemplo}
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inserir Texto Modelo</span>
            </button>
          </div>

          <input
            type="text"
            value={nomeArquivo}
            onChange={(e) => setNomeArquivo(e.target.value)}
            placeholder="Ex: Candiota - Mariana Duarte.txt"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
          />

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Cole o texto do relatório aqui:
            </label>
            <textarea
              rows={8}
              value={textoBruto}
              onChange={(e) => {
                setTextoBruto(e.target.value);
                setDadosPreview(null);
              }}
              placeholder="Cole o conteúdo do relatório de formação..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400">
              Detecta Polo, Município, Datas, Carga Horária, Cursistas e Presentes
            </span>
            <button
              type="button"
              onClick={handleAnalisar}
              disabled={!textoBruto.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs disabled:opacity-40 transition-colors cursor-pointer"
            >
              Pré-visualizar Extração
            </button>
          </div>

          {/* Pré-visualização dos Dados Extraídos */}
          {dadosPreview && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dados Identificados com Sucesso:</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Polo RS:</span>
                  <strong className="text-emerald-800 font-bold">{dadosPreview.polo || 'Não Identificado'}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Município:</span>
                  <strong className="text-slate-900">{dadosPreview.municipio || 'Não Identificado'}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Formadora:</span>
                  <strong className="text-slate-900">{dadosPreview.formadora || 'Não Informada'}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Inscritos:</span>
                  <strong>{dadosPreview.cursistas}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Presentes:</span>
                  <strong className="text-emerald-700">{dadosPreview.presentes}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block">Faltas Justif.:</span>
                  <strong className="text-amber-700">{dadosPreview.faltas}</strong>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-[11px]">
                <span className="text-slate-500 block mb-1 font-semibold">
                  {dadosPreview.atividades.length} Encontro(s) Detectado(s):
                </span>
                <div className="space-y-1">
                  {dadosPreview.atividades.map((at, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="font-mono font-medium">{at.data}</span>
                      <span>•</span>
                      <span>{at.ch}h</span>
                      <span>•</span>
                      <span>Turno: {at.turno}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!textoBruto.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
          >
            Adicionar à Tabela Consolidada
          </button>
        </div>

      </div>
    </div>
  );
};
