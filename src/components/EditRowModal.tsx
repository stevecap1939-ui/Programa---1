import React, { useState, useEffect } from 'react';
import { LinhaPlanilhaProLEEI, identificarPolo } from '../utils/proleeiParser';
import { MAPEAMENTO_POLOS } from '../utils/polosData';
import { X, Save, Edit3, Sparkles } from 'lucide-react';

interface EditRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (linha: LinhaPlanilhaProLEEI) => void;
  linhaInicial: LinhaPlanilhaProLEEI | null;
}

export const EditRowModal: React.FC<EditRowModalProps> = ({
  isOpen,
  onClose,
  onSalvar,
  linhaInicial
}) => {
  const [formData, setFormData] = useState<LinhaPlanilhaProLEEI>({
    id: '',
    Polo: 'Bagé',
    Município: '',
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

  const listaPolos = Object.keys(MAPEAMENTO_POLOS).sort();

  useEffect(() => {
    if (linhaInicial) {
      setFormData(linhaInicial);
    } else {
      setFormData({
        id: `manual-${Date.now()}`,
        Polo: 'Bagé',
        Município: '',
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
    }
  }, [linhaInicial, isOpen]);

  if (!isOpen) return null;

  const handleMunicipioChange = (mun: string) => {
    const poloIdentificado = identificarPolo(mun);
    setFormData(prev => ({
      ...prev,
      Município: mun,
      Polo: poloIdentificado !== 'Não Identificado' ? poloIdentificado : prev.Polo
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Município.trim()) {
      alert('Por favor, informe o município.');
      return;
    }
    onSalvar(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {linhaInicial ? 'Editar Encontro ProLEEI' : 'Novo Encontro ProLEEI'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha ou ajuste os dados do encontro de formação
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Município */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Município *
              </label>
              <input
                type="text"
                required
                value={formData.Município}
                onChange={(e) => handleMunicipioChange(e.target.value)}
                placeholder="Ex: Candiota, Bento Gonçalves, Carazinho..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                O polo é associado automaticamente pelo município
              </span>
            </div>

            {/* Polo */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Polo RS *
              </label>
              <select
                value={formData.Polo}
                onChange={(e) => setFormData(prev => ({ ...prev, Polo: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs cursor-pointer"
              >
                {listaPolos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="Não Identificado">Não Identificado</option>
              </select>
            </div>
          </div>

          {/* Formadora */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Formadora Municipal
            </label>
            <input
              type="text"
              value={formData.Formadora}
              onChange={(e) => setFormData(prev => ({ ...prev, Formadora: e.target.value }))}
              placeholder="Nome da formadora ou formador..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Data, Carga Horária e Turno */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Data
              </label>
              <input
                type="text"
                value={formData.DATA}
                onChange={(e) => setFormData(prev => ({ ...prev, DATA: e.target.value }))}
                placeholder="DD/MM/AAAA"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Carga Horária (h)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="40"
                value={formData['C.H.']}
                onChange={(e) => setFormData(prev => ({ ...prev, 'C.H.': parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Turno
              </label>
              <select
                value={formData.TURNOS}
                onChange={(e) => setFormData(prev => ({ ...prev, TURNOS: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
          </div>

          {/* Cursistas, Presentes e Faltas Justificadas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nº Cursistas
              </label>
              <input
                type="number"
                min="0"
                value={formData['Nº de cursistas']}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Nº de cursistas': parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nº Presentes
              </label>
              <input
                type="number"
                min="0"
                value={formData['Nº de Presentes']}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Nº de Presentes': parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Faltas Justif.
              </label>
              <input
                type="number"
                min="0"
                value={formData['Faltas justificadas']}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Faltas justificadas': parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Observação (Opcional)
            </label>
            <textarea
              rows={2}
              value={formData.OBSERVAÇÃO}
              onChange={(e) => setFormData(prev => ({ ...prev, OBSERVAÇÃO: e.target.value }))}
              placeholder="Pauta do encontro, módulo formativo, justificativas de ausências..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Arquivo de Origem */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Arquivo de Origem / Referência
            </label>
            <input
              type="text"
              value={formData.Arquivo_Origem}
              onChange={(e) => setFormData(prev => ({ ...prev, Arquivo_Origem: e.target.value }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-mono"
            />
          </div>

          {/* Botões */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Registro</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
