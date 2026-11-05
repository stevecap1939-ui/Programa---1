import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Loader2, 
  ClipboardPaste, 
  Sparkles,
  FileSearch,
  CheckCircle2
} from 'lucide-react';

interface DropZoneProps {
  onArquivosSelecionados: (arquivos: FileList | File[]) => void;
  onCarregarExemplos?: () => void;
  onAbrirModalPaste: () => void;
  isProcessing: boolean;
  statusProcessamento: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onArquivosSelecionados,
  onCarregarExemplos,
  onAbrirModalPaste,
  isProcessing,
  statusProcessamento
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onArquivosSelecionados(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onArquivosSelecionados(e.target.files);
      // Reseta o input para permitir selecionar o mesmo arquivo novamente se necessário
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6">
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
            : isProcessing
            ? 'border-indigo-300 bg-indigo-50/40 cursor-wait'
            : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.png,.jpg,.jpeg"
          onChange={handleInputChange}
          disabled={isProcessing}
          className="hidden"
          id="file-upload-input"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Processando Relatório(s)...
            </h3>
            <p className="text-xs text-indigo-700 font-medium bg-indigo-100/70 px-3 py-1.5 rounded-lg border border-indigo-200 line-clamp-2">
              {statusProcessamento || 'Lendo conteúdo e executando OCR...'}
            </p>
            <span className="text-[11px] text-slate-400 mt-2">
              Aguarde a extração de dados e associação aos 15 polos do RS
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
              isDragOver ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
              Arraste relatórios aqui ou <span className="text-emerald-700 underline decoration-emerald-500 underline-offset-2">clique para selecionar</span>
            </h3>
            
            <p className="text-xs text-slate-500 max-w-lg mb-3">
              Suporta múltiplos arquivos simultâneos: <strong className="text-slate-700">PDFs nativos</strong>, <strong className="text-slate-700">PDFs escaneados com OCR automático</strong>, arquivos <strong className="text-slate-700">TXT</strong> e imagens (JPG, PNG).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                <FileText className="w-3 h-3 text-slate-400" /> .PDF
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                <FileText className="w-3 h-3 text-slate-400" /> .TXT
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                <FileSearch className="w-3 h-3 text-emerald-600" /> OCR Inteligente
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> 15 Polos RS
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Atalhos Rápidos */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Dica: Nomes de arquivo no padrão <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700 font-mono">Municipio - Formadora.pdf</code> garantem 100% de precisão</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAbrirModalPaste();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
            <span>Colar Texto Bruto</span>
          </button>

          {onCarregarExemplos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCarregarExemplos();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Carregar Encontros de Teste</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
