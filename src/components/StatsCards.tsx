import React from 'react';
import {
  FileText,
  Clock,
  ShieldCheck,
  Send,
  Building2,
} from 'lucide-react';
import { Prontuario, CertisignConfig } from '../types/index.ts';

interface StatsCardsProps {
  prontuarios: Prontuario[];
  certisignConfig: CertisignConfig | null;
  onFilterStatus?: (status: string) => void;
  activeStatusFilter: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  prontuarios,
  certisignConfig,
  onFilterStatus,
  activeStatusFilter,
}) => {
  const total = prontuarios.length;
  const aguardando = prontuarios.filter((p) => p.status === 'aguardando_validacao').length;
  const assinados = prontuarios.filter((p) => p.status === 'assinado_certisign').length;
  const rejeitados = prontuarios.filter((p) => p.status === 'rejeitado_ajustes').length;

  let totalEmailsDisparados = 0;
  let totalEmailsEntregues = 0;

  prontuarios.forEach((p) => {
    const dests = p.envioEmails.destinatarios || [];
    totalEmailsDisparados += dests.length;
    totalEmailsEntregues += dests.filter(
      (d) => d.status === 'entregue' || d.status === 'aberto'
    ).length;
  });

  const taxaEntrega =
    totalEmailsDisparados > 0
      ? Math.round((totalEmailsEntregues / totalEmailsDisparados) * 100)
      : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      {/* 1. Total Recebidos */}
      <button
        onClick={() => onFilterStatus && onFilterStatus('todos')}
        className={`p-4 rounded-xl border text-left transition-all ${
          activeStatusFilter === 'todos'
            ? 'bg-white border-emerald-500 ring-2 ring-emerald-100 shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Total Recebidos</span>
          <FileText className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {total}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <span>subsign.facpp.edu.br</span>
        </div>
      </button>

      {/* 2. Aguardando Validação */}
      <button
        onClick={() => onFilterStatus && onFilterStatus('aguardando_validacao')}
        className={`p-4 rounded-xl border text-left transition-all ${
          activeStatusFilter === 'aguardando_validacao'
            ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-100 shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-xs font-medium">Aguardando Docente</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-800 font-mono tabular-nums">
          {aguardando}
        </div>
        <div className="text-[11px] text-amber-700 mt-1">
          Pendentes de assinatura digital
        </div>
      </button>

      {/* 3. Assinados Certisign ICP-Brasil */}
      <button
        onClick={() => onFilterStatus && onFilterStatus('assinado_certisign')}
        className={`p-4 rounded-xl border text-left transition-all ${
          activeStatusFilter === 'assinado_certisign'
            ? 'bg-emerald-50/50 border-emerald-600 ring-2 ring-emerald-100 shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between text-emerald-800 mb-1">
          <span className="text-xs font-medium">Assinados Certisign</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-2xl font-bold text-emerald-900 font-mono tabular-nums">
          {assinados}
        </div>
        <div className="text-[11px] text-emerald-700 mt-1">
          ICP-Brasil com carimbo ACT
        </div>
      </button>

      {/* 4. Despacho de E-mails */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Envios por E-mail</span>
          <Send className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalEmailsEntregues}
          </span>
          <span className="text-xs text-slate-500">/ {totalEmailsDisparados} total</span>
        </div>
        <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
          <span>{taxaEntrega}% taxa de entrega</span>
        </div>
      </div>

      {/* 5. Certisign API Status */}
      <div className="col-span-2 lg:col-span-1 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">API Certisign Hub</span>
          <Building2 className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="text-sm font-semibold text-slate-800">
            {certisignConfig?.ambiente === 'producao' ? 'Produção ICP' : 'Homologação'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 truncate">
          {certisignConfig?.carimboTempoAtivo ? 'Carimbo ACT Ativo' : 'Carimbo Inativo'}
        </div>
      </div>
    </div>
  );
};
