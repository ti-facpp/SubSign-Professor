import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Search,
  Filter,
  RefreshCw,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { RelatorioConsolidado, ItemRelatorio, Prontuario } from '../types/index.ts';

interface ConsolidatedReportViewProps {
  onSelectProntuarioById: (id: string) => void;
  onRefresh: () => void;
}

export const ConsolidatedReportView: React.FC<ConsolidatedReportViewProps> = ({
  onSelectProntuarioById,
  onRefresh,
}) => {
  const [reportData, setReportData] = useState<RelatorioConsolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'assinados' | 'pendentes'>('todos');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/relatorios/consolidado');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error('Erro ao carregar relatório consolidado', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!reportData) return [];
    return reportData.itens.filter((item) => {
      if (statusFilter === 'assinados' && !item.assinadoCertisign) return false;
      if (statusFilter === 'pendentes' && item.assinadoCertisign) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          item.numeroProntuario.toLowerCase().includes(q) ||
          item.pacienteNome.toLowerCase().includes(q) ||
          item.pacienteEmail.toLowerCase().includes(q) ||
          item.alunoNome.toLowerCase().includes(q) ||
          item.alunoEmail.toLowerCase().includes(q) ||
          item.disciplina.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reportData, statusFilter, searchTerm]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    const headers = [
      'Nº Prontuário',
      'Data Atendimento',
      'Paciente',
      'Email Paciente',
      'Aluno',
      'Email Aluno',
      'Disciplina',
      'Assinado Certisign',
      'Data Assinatura',
      'Hash SHA-256',
      'Total Emails',
      'Emails Entregues',
      'Status Aluno',
      'Status Paciente',
      'Status Coordenacao',
      'Status SAME',
    ];

    const rows = filteredItems.map((item) => {
      const statusAluno = item.destinatarios.find((d) => d.papel === 'aluno')?.status || 'N/A';
      const statusPaciente = item.destinatarios.find((d) => d.papel === 'paciente')?.status || 'N/A';
      const statusCoord = item.destinatarios.find((d) => d.papel === 'coordenacao')?.status || 'N/A';
      const statusSame = item.destinatarios.find((d) => d.papel === 'same_arquivo')?.status || 'N/A';

      return [
        `"${item.numeroProntuario}"`,
        `"${item.dataAtendimento}"`,
        `"${item.pacienteNome}"`,
        `"${item.pacienteEmail}"`,
        `"${item.alunoNome}"`,
        `"${item.alunoEmail}"`,
        `"${item.disciplina}"`,
        item.assinadoCertisign ? '"SIM"' : '"NÃO"',
        `"${item.dataAssinatura || '-'}"`,
        `"${item.hashCertisign || '-'}"`,
        item.totalEmails,
        item.emailsEntregues,
        `"${statusAluno}"`,
        `"${statusPaciente}"`,
        `"${statusCoord}"`,
        `"${statusSame}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_consolidado_subsign_facpp_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel-compatible table
  const handleExportExcel = () => {
    handleExportCSV();
  };

  // Print compliance report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Relatório Consolidado de Assinaturas & Envios
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              ICP-Brasil Certisign
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoria centralizada dos prontuários recebidos de subsign.facpp.edu.br e status individual de entrega por e-mail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir Relatório</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[11px] font-medium block">Total Prontuários</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalProntuarios}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Submetidos por alunos</span>
          </div>

          {/* Assinados */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-emerald-700 text-[11px] font-medium block">Assinados Certisign</span>
            <div className="text-2xl font-bold text-emerald-800 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalAssinados}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Certificado ICP-Brasil</span>
          </div>

          {/* E-mails Disparados */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[11px] font-medium block">E-mails Disparados</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalEmailsDisparados}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Destinatários oficiais</span>
          </div>

          {/* Entregues */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[11px] font-medium block">Entregues com Sucesso</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalEmailsEntregues}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
              {reportData.resumo.taxaEntregaGeral}% taxa de entrega
            </span>
          </div>

          {/* Abertos */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[11px] font-medium block">Confirmados / Abertos</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalEmailsAbertos}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Leituras registradas</span>
          </div>

          {/* Falhas */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[11px] font-medium block">Falhas de Envio</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
              {reportData.resumo.totalEmailsFalhas}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Reenvio automático</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'todos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos os Registros
          </button>
          <button
            onClick={() => setStatusFilter('assinados')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'assinados'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assinados & Despachados
          </button>
          <button
            onClick={() => setStatusFilter('pendentes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'pendentes'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aguardando Assinatura
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por paciente, aluno ou prontuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Consolidated Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Prontuário Nº</th>
                <th className="py-3 px-3">Paciente & E-mail</th>
                <th className="py-3 px-3">Aluno (SubSign)</th>
                <th className="py-3 px-3">Disciplina</th>
                <th className="py-3 px-3 text-center">Assinatura Certisign</th>
                <th className="py-3 px-3 text-center">Aluno</th>
                <th className="py-3 px-3 text-center">Paciente</th>
                <th className="py-3 px-3 text-center">Coordenação</th>
                <th className="py-3 px-3 text-center">SAME</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    Nenhum registro encontrado no relatório consolidado.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusAluno = item.destinatarios.find((d) => d.papel === 'aluno');
                  const statusPaciente = item.destinatarios.find((d) => d.papel === 'paciente');
                  const statusCoord = item.destinatarios.find((d) => d.papel === 'coordenacao');
                  const statusSame = item.destinatarios.find((d) => d.papel === 'same_arquivo');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nº Prontuario */}
                      <td className="py-3 px-3.5">
                        <strong className="text-slate-900 font-mono block">
                          {item.numeroProntuario}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.dataAtendimento).toLocaleDateString('pt-BR')}
                        </span>
                      </td>

                      {/* Paciente */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.pacienteNome}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                          {item.pacienteEmail}
                        </div>
                      </td>

                      {/* Aluno */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.alunoNome}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                          {item.alunoEmail}
                        </div>
                      </td>

                      {/* Disciplina */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium truncate max-w-[140px]" title={item.disciplina}>
                          {item.disciplina}
                        </div>
                      </td>

                      {/* Assinatura Certisign */}
                      <td className="py-3 px-3 text-center">
                        {item.assinadoCertisign ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ICP-Brasil OK
                            </span>
                            {item.hashCertisign && (
                              <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                {item.hashCertisign.slice(0, 10)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Pendente Docente
                          </span>
                        )}
                      </td>

                      {/* Aluno Email Status */}
                      <td className="py-3 px-3 text-center">
                        {renderEmailBadge(statusAluno?.status)}
                      </td>

                      {/* Paciente Email Status */}
                      <td className="py-3 px-3 text-center">
                        {renderEmailBadge(statusPaciente?.status)}
                      </td>

                      {/* Coordenação Email Status */}
                      <td className="py-3 px-3 text-center">
                        {renderEmailBadge(statusCoord?.status)}
                      </td>

                      {/* SAME Email Status */}
                      <td className="py-3 px-3 text-center">
                        {renderEmailBadge(statusSame?.status)}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onSelectProntuarioById(item.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function renderEmailBadge(status?: string) {
  if (status === 'entregue') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        Entregue
      </span>
    );
  }
  if (status === 'aberto') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
        Aberto
      </span>
    );
  }
  if (status === 'falha') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
        Falha
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">
      Pendente
    </span>
  );
}
