import React, { useState, useMemo } from 'react';
import { MAPEAMENTO_POLOS } from '../utils/polosData';
import { 
  X, 
  Search, 
  MapPin, 
  Building2, 
  CheckCircle, 
  Copy,
  Plus
} from 'lucide-react';

interface PoloExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionarMunicipio?: (municipio: string, polo: string) => void;
}

export const PoloExplorerModal: React.FC<PoloExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelecionarMunicipio
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [poloSelecionado, setPoloSelecionado] = useState<string | null>(null);
  const [copiadoTexto, setCopiadoTexto] = useState<string | null>(null);

  const listaPolos = useMemo(() => {
    return Object.entries(MAPEAMENTO_POLOS).map(([polo, cidades]) => ({
      polo,
      cidades: [...cidades].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      total: cidades.length
    })).sort((a, b) => a.polo.localeCompare(b.polo, 'pt-BR'));
  }, []);

  const totalMunicipiosMapeados = useMemo(() => {
    return listaPolos.reduce((acc, p) => acc + p.total, 0);
  }, [listaPolos]);

  const resultadosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) {
      return listaPolos;
    }
    const termo = termoBusca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return listaPolos.map(item => {
      const poloNorm = item.polo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const poloBate = poloNorm.includes(termo);

      const cidadesFiltradas = item.cidades.filter(c => {
        const cNorm = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cNorm.includes(termo);
      });

      if (poloBate) {
        return item;
      }

      if (cidadesFiltradas.length > 0) {
        return {
          ...item,
          cidades: cidadesFiltradas
        };
      }

      return null;
    }).filter(Boolean) as typeof listaPolos;
  }, [listaPolos, termoBusca]);

  const copiarNome = (texto: string) => {
    navigator.clipboard?.writeText(texto);
    setCopiadoTexto(texto);
    setTimeout(() => setCopiadoTexto(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Guia Oficial dos 15 Polos do Rio Grande do Sul
              </h2>
              <p className="text-xs text-slate-500">
                Mapeamento de {totalMunicipiosMapeados} municípios distribuídos pelos polos de formação ProLEEI
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

        {/* Busca e Resumo */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digite o nome de uma cidade gaúcha (ex: Candiota, Passo Fundo, Erechim, Bento Gonçalves)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              autoFocus
            />
            {termoBusca && (
              <button
                onClick={() => setTermoBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Polos e Municípios */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {resultadosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {resultadosFiltrados.map(({ polo, cidades }) => {
                const isSelected = poloSelecionado === polo;

                return (
                  <div
                    key={polo}
                    className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold text-slate-800">
                            Polo {polo}
                          </h4>
                        </div>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {cidades.length} cidades
                        </span>
                      </div>

                      {/* Lista de Cidades */}
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                        {cidades.map(cidade => (
                          <button
                            key={cidade}
                            type="button"
                            onClick={() => {
                              if (onSelecionarMunicipio) {
                                onSelecionarMunicipio(cidade, polo);
                              } else {
                                copiarNome(cidade);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title="Clique para selecionar este município"
                          >
                            <span>{cidade}</span>
                            {copiadoTexto === cidade && (
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">RS • SEDUC</span>
                      <button
                        onClick={() => copiarNome(polo)}
                        className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiadoTexto === polo ? 'Copiado!' : 'Copiar Polo'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm font-semibold">Nenhum município ou polo encontrado com &quot;{termoBusca}&quot;.</p>
              <p className="text-xs text-slate-400 mt-1">Verifique a ortografia ou limpe a busca.</p>
            </div>
          )}
        </div>

        {/* Rodapé com Fechar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Fechar Guia
          </button>
        </div>

      </div>
    </div>
  );
};
