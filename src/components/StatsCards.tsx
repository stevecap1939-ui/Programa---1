import React from 'react';
import { LinhaPlanilhaProLEEI } from '../utils/proleeiParser';
import { 
  Users, 
  Clock, 
  CalendarCheck, 
  MapPinned, 
  FileCheck2, 
  Percent 
} from 'lucide-react';

interface StatsCardsProps {
  linhas: LinhaPlanilhaProLEEI[];
  totalArquivos: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ linhas, totalArquivos }) => {
  const totalEncontros = linhas.length;
  
  const totalInscritos = linhas.reduce((acc, curr) => acc + (Number(curr['Nº de cursistas']) || 0), 0);
  const totalPresentes = linhas.reduce((acc, curr) => acc + (Number(curr['Nº de Presentes']) || 0), 0);
  const totalFaltasJustificadas = linhas.reduce((acc, curr) => acc + (Number(curr['Faltas justificadas']) || 0), 0);
  const totalCargaHoraria = linhas.reduce((acc, curr) => acc + (Number(curr['C.H.']) || 0), 0);

  const polosUnicos = new Set(linhas.map(l => l.Polo).filter(p => p && p !== 'Não Identificado')).size;
  const municipiosUnicos = new Set(linhas.map(l => l.Município).filter(m => m && m !== 'Não Identificado')).size;

  const taxaPresenca = totalInscritos > 0 
    ? Math.min(100, Math.round((totalPresentes / totalInscritos) * 100)) 
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      
      {/* Total Encontros */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Encontros</span>
          <CalendarCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">{totalEncontros}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {totalArquivos} relatório{totalArquivos === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Carga Horária Total */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Carga Horária</span>
          <Clock className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">{totalCargaHoraria}h</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            horas de formação
          </span>
        </div>
      </div>

      {/* Cursistas Inscritos */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Inscritos</span>
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">{totalInscritos}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            vagas ativas
          </span>
        </div>
      </div>

      {/* Total Presentes */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Presentes</span>
          <FileCheck2 className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">{totalPresentes}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            participações
          </span>
        </div>
      </div>

      {/* Taxa de Presença */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Frequência</span>
          <Percent className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">{taxaPresenca}%</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {totalFaltasJustificadas} faltas justif.
          </span>
        </div>
      </div>

      {/* Polos e Municípios */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Cobertura</span>
          <MapPinned className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-800">
            {polosUnicos}<span className="text-xs font-normal text-slate-400">/15</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {municipiosUnicos} município{municipiosUnicos === 1 ? '' : 's'}
          </span>
        </div>
      </div>

    </div>
  );
};
