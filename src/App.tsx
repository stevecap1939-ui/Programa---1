import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DropZone } from './components/DropZone';
import { ConsolidatedTable } from './components/ConsolidatedTable';
import { PoloExplorerModal } from './components/PoloExplorerModal';
import { ManualPasteModal } from './components/ManualPasteModal';
import { EditRowModal } from './components/EditRowModal';
import { 
  LinhaPlanilhaProLEEI, 
  extrairDados, 
  gerarLinhasPlanilha 
} from './utils/proleeiParser';
import { lerConteudoArquivo } from './utils/fileReader';
import { 
  exportarParaCSV, 
  exportarParaExcel, 
  copiarParaClipboard,
  gerarExemplosRS 
} from './utils/exportHelpers';
import { CheckCircle2, AlertTriangle, Info, BookOpen, ShieldCheck } from 'lucide-react';

const STORAGE_KEY_LINHAS = 'proleei_linhas_consolidadas_v4';
const STORAGE_KEY_MES = 'proleei_referencia_mes_v4';

export default function App() {
  const [referenciaMes, setReferenciaMes] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_MES) || 'março';
  });

  const [linhas, setLinhas] = useState<LinhaPlanilhaProLEEI[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LINHAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar dados salvos:', e);
    }
    return [];
  });

  const [totalArquivos, setTotalArquivos] = useState<number>(() => {
    return new Set(linhas.map(l => l.Arquivo_Origem)).size;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusProcessamento, setStatusProcessamento] = useState('');
  const [mensagemNotificacao, setMensagemNotificacao] = useState<{ tipo: 'sucesso' | 'aviso' | 'erro'; texto: string } | null>(null);

  const [modalPolosAberto, setModalPolosAberto] = useState(false);
  const [modalPasteAberto, setModalPasteAberto] = useState(false);
  const [modalEditAberto, setModalEditAberto] = useState(false);
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<LinhaPlanilhaProLEEI | null>(null);
  const [confirmarLimpezaAberto, setConfirmarLimpezaAberto] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MES, referenciaMes);
  }, [referenciaMes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LINHAS, JSON.stringify(linhas));
    setTotalArquivos(new Set(linhas.map(l => l.Arquivo_Origem)).size);
  }, [linhas]);

  const mostrarNotificacao = (texto: string, tipo: 'sucesso' | 'aviso' | 'erro' = 'sucesso') => {
    setMensagemNotificacao({ tipo, texto });
    setTimeout(() => {
      setMensagemNotificacao(null);
    }, 4500);
  };

  const handleCarregarExemplos = () => {
    const exemplos = gerarExemplosRS();
    setLinhas(prev => {
      // Evita duplicar se já houver exemplos idênticos
      const idsExistentes = new Set(prev.map(p => p.id));
      const novos = exemplos.filter(e => !idsExistentes.has(e.id));
      return [...novos, ...prev];
    });
    mostrarNotificacao('Encontros oficiais de exemplo do RS carregados com sucesso!', 'sucesso');
  };

  const processarArquivos = async (listaArquivos: FileList | File[]) => {
    if (!listaArquivos || listaArquivos.length === 0) return;

    setIsProcessing(true);
    setStatusProcessamento(`Iniciando leitura de ${listaArquivos.length} arquivo(s)...`);

    const novasLinhas: LinhaPlanilhaProLEEI[] = [];
    let arquivosSucesso = 0;
    const erros: string[] = [];

    const filesArray = Array.from(listaArquivos);

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setStatusProcessamento(`Processando (${i + 1}/${filesArray.length}): ${file.name}`);

      try {
        const texto = await lerConteudoArquivo(file, (msgProgresso) => {
          setStatusProcessamento(`[OCR/PDF] ${file.name}: ${msgProgresso}`);
        });

        if (!texto || !texto.trim()) {
          erros.push(`${file.name}: Arquivo vazio ou ilegível.`);
          continue;
        }

        // Não transforma mensagens de falha do leitor em relatórios válidos.
        // Antes, isso gerava linhas com dados ficticiamente "Não encontrado".
        if (/Não foi possível (?:ler o conteúdo|extrair texto)|Não foi possível iniciar o OCR/i.test(texto)) {
          erros.push(`${file.name}: Não foi possível ler o arquivo. Verifique se o PDF está íntegro ou se contém texto legível.`);
          continue;
        }

        const dadosExtraidos = extrairDados(texto, file.name);
        const linhasDoArquivo = gerarLinhasPlanilha(dadosExtraidos, file.name);

        if (linhasDoArquivo.length > 0) {
          novasLinhas.push(...linhasDoArquivo);
          arquivosSucesso++;
        } else {
          erros.push(`${file.name}: Nenhum encontro detectado.`);
        }
      } catch (err: any) {
        console.error(`Erro ao processar ${file.name}:`, err);
        erros.push(`${file.name}: ${err?.message || 'Falha na extração'}`);
      }
    }

    if (novasLinhas.length > 0) {
      setLinhas(prev => [...novasLinhas, ...prev]);
      mostrarNotificacao(`${arquivosSucesso} arquivo(s) lidos com sucesso! ${novasLinhas.length} novos encontros adicionados.`, 'sucesso');
    } else if (erros.length > 0) {
      mostrarNotificacao(`Nenhum dado válido extraído. ${erros[0]}`, 'aviso');
    }

    setIsProcessing(false);
    setStatusProcessamento('');
  };

  const handleEditarLinha = (linha: LinhaPlanilhaProLEEI) => {
    setLinhaEmEdicao(linha);
    setModalEditAberto(true);
  };

  const handleSalvarLinha = (linhaAtualizada: LinhaPlanilhaProLEEI) => {
    setLinhas(prev => {
      const existe = prev.some(l => l.id === linhaAtualizada.id);
      if (existe) {
        return prev.map(l => l.id === linhaAtualizada.id ? linhaAtualizada : l);
      } else {
        return [linhaAtualizada, ...prev];
      }
    });
    mostrarNotificacao('Registro atualizado com sucesso!', 'sucesso');
  };

  const handleDuplicarLinha = (linha: LinhaPlanilhaProLEEI) => {
    const novaLinha: LinhaPlanilhaProLEEI = {
      ...linha,
      id: `${linha.id}-dup-${Date.now()}`,
      OBSERVAÇÃO: linha.OBSERVAÇÃO ? `${linha.OBSERVAÇÃO} (Cópia)` : 'Cópia'
    };
    setLinhas(prev => [novaLinha, ...prev]);
    mostrarNotificacao('Encontro duplicado com sucesso.', 'sucesso');
  };

  const handleExcluirLinha = (id: string) => {
    setLinhas(prev => prev.filter(l => l.id !== id));
    mostrarNotificacao('Encontro removido da consolidação.', 'aviso');
  };

  const handleAdicionarLinhasManuais = (novas: LinhaPlanilhaProLEEI[]) => {
    setLinhas(prev => [...novas, ...prev]);
    mostrarNotificacao(`${novas.length} encontro(s) adicionados com sucesso!`, 'sucesso');
  };

  const handleLimparTudoConfirmado = () => {
    setLinhas([]);
    setConfirmarLimpezaAberto(false);
    mostrarNotificacao('Planilha limpa com sucesso.', 'aviso');
  };

  const handleExportarCSV = () => {
    if (linhas.length === 0) {
      mostrarNotificacao('Nenhum dado na planilha para exportar.', 'aviso');
      return;
    }
    exportarParaCSV(linhas, referenciaMes);
    mostrarNotificacao(`Arquivo relatorio_consolidado_${referenciaMes}.csv exportado!`, 'sucesso');
  };

  const handleExportarExcel = () => {
    if (linhas.length === 0) {
      mostrarNotificacao('Nenhum dado na planilha para exportar.', 'aviso');
      return;
    }
    exportarParaExcel(linhas, referenciaMes);
    mostrarNotificacao(`Planilha Excel relatorio_consolidado_${referenciaMes}.xlsx gerada!`, 'sucesso');
  };

  const handleCopiarClipboard = async () => {
    const ok = await copiarParaClipboard(linhas);
    if (ok) {
      mostrarNotificacao('Dados copiados para a área de transferência!', 'sucesso');
    } else {
      mostrarNotificacao('Falha ao copiar dados.', 'erro');
    }
    return ok;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800">
      
      <Header
        referenciaMes={referenciaMes}
        setReferenciaMes={setReferenciaMes}
        totalLinhas={linhas.length}
        onCarregarExemplos={handleCarregarExemplos}
        onAbrirModalPaste={() => setModalPasteAberto(true)}
        onAbrirModalPolos={() => setModalPolosAberto(true)}
        onExportarCSV={handleExportarCSV}
        onExportarExcel={handleExportarExcel}
        isProcessing={isProcessing}
      />

      {mensagemNotificacao && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            mensagemNotificacao.tipo === 'sucesso'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : mensagemNotificacao.tipo === 'aviso'
              ? 'bg-amber-900 text-amber-100 border-amber-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}>
            {mensagemNotificacao.tipo === 'sucesso' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {mensagemNotificacao.tipo === 'aviso' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {mensagemNotificacao.tipo === 'erro' && <Info className="w-4 h-4 text-rose-400" />}
            <span>{mensagemNotificacao.texto}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white mb-6 shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Consolidação Oficial ProLEEI • Rio Grande do Sul</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Automação de Relatórios Mensais de Formação
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Processa relatórios em PDF (com suporte a PDFs escaneados via OCR automático) e TXT, mapeando os municípios para os 15 Polos oficiais do RS.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalPolosAberto(true)}
              className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Guia dos 15 Polos</span>
            </button>
          </div>
        </div>

        <StatsCards linhas={linhas} totalArquivos={totalArquivos} />

        <DropZone
          onArquivosSelecionados={processarArquivos}
          onCarregarExemplos={handleCarregarExemplos}
          onAbrirModalPaste={() => setModalPasteAberto(true)}
          isProcessing={isProcessing}
          statusProcessamento={statusProcessamento}
        />

        <ConsolidatedTable
          linhas={linhas}
          onEditarLinha={handleEditarLinha}
          onExcluirLinha={handleExcluirLinha}
          onDuplicarLinha={handleDuplicarLinha}
          onAdicionarLinha={() => {
            setLinhaEmEdicao(null);
            setModalEditAberto(true);
          }}
          onLimparTudo={() => setConfirmarLimpezaAberto(true)}
          onExportarCSV={handleExportarCSV}
          onExportarExcel={handleExportarExcel}
          onCopiarClipboard={handleCopiarClipboard}
          referenciaMes={referenciaMes}
        />

      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Consolidação de Relatórios ProLEEI RS • Formação Leitura e Escrita na Educação Infantil
          </span>
          <span className="text-[11px] text-slate-400">
            OCR nativo e regras SEDUC RS integradas
          </span>
        </div>
      </footer>

      <PoloExplorerModal
        isOpen={modalPolosAberto}
        onClose={() => setModalPolosAberto(false)}
        onSelecionarMunicipio={(municipio, polo) => {
          setModalPolosAberto(false);
          setLinhaEmEdicao({
            id: `manual-${Date.now()}`,
            Polo: polo,
            Município: municipio,
            Formadora: '',
            DATA: '11/03/2026',
            'C.H.': 4.0,
            TURNOS: 'Noite',
            'Nº de cursistas': 15,
            'Nº de Presentes': 15,
            'Faltas justificadas': 0,
            OBSERVAÇÃO: '',
            Arquivo_Origem: 'Manual'
          });
          setModalEditAberto(true);
        }}
      />

      <ManualPasteModal
        isOpen={modalPasteAberto}
        onClose={() => setModalPasteAberto(false)}
        onAdicionarLinhas={handleAdicionarLinhasManuais}
      />

      <EditRowModal
        isOpen={modalEditAberto}
        onClose={() => {
          setModalEditAberto(false);
          setLinhaEmEdicao(null);
        }}
        onSalvar={handleSalvarLinha}
        linhaInicial={linhaEmEdicao}
      />

      {confirmarLimpezaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Deseja limpar todos os registros?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Esta ação removerá todos os {linhas.length} encontros atualmente consolidados na tabela.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarLimpezaAberto(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleLimparTudoConfirmado}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirmar e Limpar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
