import React from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ClipboardPaste, 
  MapPin, 
  Sparkles, 
  Calendar,
  Layers
} from 'lucide-react';

interface HeaderProps {
  referenciaMes: string;
  setReferenciaMes: (mes: string) => void;
  totalLinhas: number;
  onCarregarExemplos?: () => void;
  onAbrirModalPaste: () => void;
  onAbrirModalPolos: () => void;
  onExportarCSV: () => void;
  onExportarExcel: () => void;
  isProcessing: boolean;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export const Header: React.FC<HeaderProps> = ({
  referenciaMes,
  setReferenciaMes,
  totalLinhas,
  onCarregarExemplos,
  onAbrirModalPaste,
  onAbrirModalPolos,
  onExportarCSV,
  onExportarExcel,
  isProcessing
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Consolidador ProLEEI RS
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                15 Polos SEDUC
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Relatórios Mensais de Formação em Leitura e Escrita
            </p>
          </div>
        </div>

        {/* Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          
          {/* Mês de Referência */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label htmlFor="mes-select" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Mês:
            </label>
            <select
              id="mes-select"
              value={referenciaMes.toLowerCase()}
              onChange={(e) => setReferenciaMes(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden capitalize cursor-pointer text-xs"
            >
              {MESES.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Guia de Polos */}
          <button
            onClick={onAbrirModalPolos}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Consultar os 15 Polos do Rio Grande do Sul e seus municípios"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">15 Polos RS</span>
          </button>

          {/* Colar Manual */}
          <button
            onClick={onAbrirModalPaste}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Colar texto de relatório ou mensagem para extração rápida"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
            <span>Colar Texto</span>
          </button>

          {/* Carregar Exemplos */}
          {onCarregarExemplos && (
            <button
              onClick={onCarregarExemplos}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Carregar dados de exemplo oficiais do RS"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Exemplos RS</span>
            </button>
          )}

          {/* Exportar CSV */}
          <button
            onClick={onExportarCSV}
            disabled={totalLinhas === 0 || isProcessing}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Exportar para arquivo CSV (ponto-e-vírgula com codificação UTF-8 BOM)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>

          {/* Exportar Excel */}
          <button
            onClick={onExportarExcel}
            disabled={totalLinhas === 0 || isProcessing}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Exportar para planilha Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

        </div>

      </div>
    </header>
  );
};
