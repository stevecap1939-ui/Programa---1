import React, { useState, useMemo } from 'react';
import { LinhaPlanilhaProLEEI } from '../utils/proleeiParser';
import { MAPEAMENTO_POLOS } from '../utils/polosData';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit3, 
  Copy, 
  Trash2, 
  Plus, 
  ClipboardCopy, 
  Download, 
  FileSpreadsheet, 
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';

interface ConsolidatedTableProps {
  linhas: LinhaPlanilhaProLEEI[];
  onEditarLinha: (linha: LinhaPlanilhaProLEEI) => void;
  onExcluirLinha: (id: string) => void;
  onDuplicarLinha: (linha: LinhaPlanilhaProLEEI) => void;
  onAdicionarLinha: () => void;
  onLimparTudo: () => void;
  onExportarCSV: () => void;
  onExportarExcel: () => void;
  onCopiarClipboard: () => Promise<boolean>;
  referenciaMes: string;
}

type SortField = 'Polo' | 'Município' | 'Formadora' | 'DATA' | 'C.H.' | 'Nº de Presentes' | 'Nº de cursistas';
type SortOrder = 'asc' | 'desc';

export const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({
  linhas,
  onEditarLinha,
  onExcluirLinha,
  onDuplicarLinha,
  onAdicionarLinha,
  onLimparTudo,
  onExportarCSV,
  onExportarExcel,
  onCopiarClipboard,
  referenciaMes
}) => {
  const [busca, setBusca] = useState('');
  const [poloFiltro, setPoloFiltro] = useState<string>('todos');
  const [turnoFiltro, setTurnoFiltro] = useState<string>('todos');
  const [sortField, setSortField] = useState<SortField>('Polo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);

  // Lista dos 15 polos para o seletor
  const listaPolos = useMemo(() => {
    return Object.keys(MAPEAMENTO_POLOS).sort();
  }, []);

  const handleCopiar = async () => {
    const ok = await onCopiarClipboard();
    if (ok) {
      setCopiadoFeedback(true);
      setTimeout(() => setCopiadoFeedback(false), 2500);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const linhasFiltradas = useMemo(() => {
    return linhas.filter(item => {
      // Filtro de polo
      if (poloFiltro !== 'todos' && item.Polo !== poloFiltro) {
        return false;
      }
      // Filtro de turno
      if (turnoFiltro !== 'todos' && item.TURNOS !== turnoFiltro) {
        return false;
      }
      // Busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const campos = [
          item.Polo,
          item.Município,
          item.Formadora,
          item.DATA,
          item.TURNOS,
          item.OBSERVAÇÃO,
          item.Arquivo_Origem
        ].map(v => (v || '').toLowerCase());

        return campos.some(c => c.includes(termo));
      }
      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'C.H.' || sortField === 'Nº de Presentes' || sortField === 'Nº de cursistas') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [linhas, busca, poloFiltro, turnoFiltro, sortField, sortOrder]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col mb-8">
      
      {/* Barra de Ferramentas e Filtros */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Planilha Consolidada • Mês de {referenciaMes.charAt(0).toUpperCase() + referenciaMes.slice(1)}</span>
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {linhasFiltradas.length} de {linhas.length} encontro{linhas.length === 1 ? '' : 's'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dados extraídos e estruturados no formato oficial da formação ProLEEI RS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAdicionarLinha}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Encontro</span>
            </button>

            <button
              onClick={handleCopiar}
              disabled={linhas.length === 0}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Copia os dados formatados para colar no Excel ou Google Planilhas"
            >
              {copiadoFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado!</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copiar Tabela</span>
                </>
              )}
            </button>

            <button
              onClick={onExportarCSV}
              disabled={linhas.length === 0}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={onExportarExcel}
              disabled={linhas.length === 0}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            {linhas.length > 0 && (
              <button
                onClick={onLimparTudo}
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Limpar todos os registros da tabela"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha de Busca e Seletores de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
          
          {/* Campo Busca */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por polo, município, formadora, data..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Polo */}
          <div className="sm:col-span-4 relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={poloFiltro}
              onChange={(e) => setPoloFiltro(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 cursor-pointer"
            >
              <option value="todos">Todos os Polos ({listaPolos.length})</option>
              {listaPolos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Turno */}
          <div className="sm:col-span-2">
            <select
              value={turnoFiltro}
              onChange={(e) => setTurnoFiltro(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 cursor-pointer"
            >
              <option value="todos">Todos Turnos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
              <option value="Integral">Integral</option>
            </select>
          </div>

        </div>

      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200 select-none">
            <tr>
              <th 
                onClick={() => handleSort('Polo')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Polo</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('Município')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Município</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('Formadora')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Formadora</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('DATA')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>DATA</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('C.H.')}
                className="py-3 px-2 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>C.H.</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-2 text-center">
                <span>TURNOS</span>
              </th>

              <th 
                onClick={() => handleSort('Nº de cursistas')}
                className="py-3 px-2 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Inscritos</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('Nº de Presentes')}
                className="py-3 px-2 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Presentes</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-2 text-center">
                <span>Faltas Justif.</span>
              </th>

              <th className="py-3 px-3 min-w-[140px]">
                <span>OBSERVAÇÃO</span>
              </th>

              <th className="py-3 px-3 text-right">
                <span className="sr-only">Ações</span>
                <span>Ações</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-normal">
            {linhasFiltradas.length > 0 ? (
              linhasFiltradas.map((linha) => {
                const isNaoIdentificado = linha.Polo === 'Não Identificado' || linha.Município === 'Não Identificado';

                return (
                  <tr 
                    key={linha.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isNaoIdentificado ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Polo */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        linha.Polo === 'Não Identificado'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {linha.Polo}
                      </span>
                    </td>

                    {/* Município */}
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {linha.Município}
                    </td>

                    {/* Formadora */}
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {linha.Formadora}
                    </td>

                    {/* DATA */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {linha.DATA}
                    </td>

                    {/* C.H. */}
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                      {Number(linha['C.H.']).toFixed(1)}h
                    </td>

                    {/* TURNOS */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {linha.TURNOS}
                      </span>
                    </td>

                    {/* Nº Cursistas */}
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                      {linha['Nº de cursistas']}
                    </td>

                    {/* Nº Presentes */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                      {linha['Nº de Presentes']}
                    </td>

                    {/* Faltas Justificadas */}
                    <td className="py-2.5 px-2 text-center font-mono text-amber-700">
                      {linha['Faltas justificadas']}
                    </td>

                    {/* OBSERVAÇÃO */}
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={linha.OBSERVAÇÃO || ''}>
                      {linha.OBSERVAÇÃO || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditarLinha(linha)}
                          type="button"
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Editar encontro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicarLinha(linha)}
                          type="button"
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="Duplicar este registro"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onExcluirLinha(linha.id)}
                          type="button"
                          className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Excluir este registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  {linhas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        Nenhum encontro consolidado ainda
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Faça o upload de relatórios em PDF/TXT na área acima, cole o texto de um relatório ou clique em Adicionar Encontro.
                      </p>
                      <button
                        onClick={onAdicionarLinha}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Manualmente</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <AlertCircle className="w-6 h-6 text-slate-400 mb-2" />
                      <p className="text-xs font-medium text-slate-600">
                        Nenhum registro encontrado para os filtros selecionados.
                      </p>
                      <button
                        onClick={() => {
                          setBusca('');
                          setPoloFiltro('todos');
                          setTurnoFiltro('todos');
                        }}
                        className="mt-2 text-xs text-emerald-700 hover:underline cursor-pointer"
                      >
                        Limpar filtros de busca
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé da Tabela */}
      {linhasFiltradas.length > 0 && (
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Exibindo <span className="font-semibold text-slate-700">{linhasFiltradas.length}</span> de{' '}
            <span className="font-semibold text-slate-700">{linhas.length}</span> registros consolidados.
          </div>
          <div className="text-[11px] text-slate-400">
            Formato de dados aderente ao padrão oficial de prestação de contas SEDUC RS
          </div>
        </div>
      )}

    </div>
  );
};
