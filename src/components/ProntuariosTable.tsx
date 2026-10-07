import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  FileText,
  Mail,
  Eye,
  Send,
  Layers,
  ArrowUpDown,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Prontuario } from '../types/index.ts';

interface ProntuariosTableProps {
  prontuarios: Prontuario[];
  onSelectProntuario: (prontuario: Prontuario) => void;
  onOpenSignModal: (prontuario: Prontuario) => void;
  onOpenBatchSign: (selectedIds: string[]) => void;
  onOpenOfficialDoc: (prontuario: Prontuario) => void;
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const ProntuariosTable: React.FC<ProntuariosTableProps> = ({
  prontuarios,
  onSelectProntuario,
  onOpenSignModal,
  onOpenBatchSign,
  onOpenOfficialDoc,
  activeStatusFilter,
  onStatusFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('todas');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Disciplinas list
  const disciplinas = useMemo(() => {
    const list = Array.from(new Set(prontuarios.map((p) => p.disciplina)));
    return list;
  }, [prontuarios]);

  // Filtered prontuarios
  const filteredProntuarios = useMemo(() => {
    return prontuarios.filter((p) => {
      // Status filter
      if (activeStatusFilter !== 'todos' && p.status !== activeStatusFilter) {
        return false;
      }

      // Disciplina filter
      if (selectedDisciplina !== 'todas' && p.disciplina !== selectedDisciplina) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          p.numeroProntuario.toLowerCase().includes(q) ||
          p.paciente.nome.toLowerCase().includes(q) ||
          p.paciente.cpf.includes(q) ||
          p.aluno.nome.toLowerCase().includes(q) ||
          p.aluno.ra.includes(q) ||
          p.dadosClinicos.procedimentoRealizado.toLowerCase().includes(q) ||
          p.dadosClinicos.diagnostico.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [prontuarios, activeStatusFilter, selectedDisciplina, searchTerm]);

  // Handle batch selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProntuarios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProntuarios.map((p) => p.id));
    }
  };

  // Only allow batch signing for pending records
  const selectedPendingIds = useMemo(() => {
    return selectedIds.filter((id) => {
      const item = prontuarios.find((p) => p.id === id);
      return item && item.status === 'aguardando_validacao';
    });
  }, [selectedIds, prontuarios]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            <button
              onClick={() => onStatusFilterChange('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeStatusFilter === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({prontuarios.length})
            </button>
            <button
              onClick={() => onStatusFilterChange('aguardando_validacao')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeStatusFilter === 'aguardando_validacao'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Aguardando Docente</span>
              <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                {prontuarios.filter((p) => p.status === 'aguardando_validacao').length}
              </span>
            </button>
            <button
              onClick={() => onStatusFilterChange('assinado_certisign')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeStatusFilter === 'assinado_certisign'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assinados Certisign</span>
              <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                {prontuarios.filter((p) => p.status === 'assinado_certisign').length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar prontuário, paciente, aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Secondary filters & info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Disciplina:</span>
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="todas">Todas as Disciplinas</option>
                {disciplinas.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-slate-300">|</span>
            <span>
              Exibindo <strong className="text-slate-800 font-mono">{filteredProntuarios.length}</strong> de{' '}
              <strong className="text-slate-800 font-mono">{prontuarios.length}</strong> prontuários
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sincronizado com subsign.facpp.edu.br
            </span>
          </div>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between transition-all animate-fadeIn">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold bg-emerald-800 px-2.5 py-1 rounded-md font-mono">
              {selectedIds.length} selecionado(s)
            </span>
            <span>
              {selectedPendingIds.length} apto(s) para assinatura digital Certisign
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedPendingIds.length > 0 ? (
              <button
                onClick={() => onOpenBatchSign(selectedPendingIds)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assinar em Lote ({selectedPendingIds.length}) com Certisign</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-200 italic">
                Nenhum dos selecionados está pendente de assinatura
              </span>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-emerald-200 hover:text-white px-2 py-1"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredProntuarios.length > 0 &&
                    selectedIds.length === filteredProntuarios.length
                  }
                  onChange={handleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="py-3 px-3">Prontuário & Atendimento</th>
              <th className="py-3 px-3">Paciente</th>
              <th className="py-3 px-3">Aluno (SubSign)</th>
              <th className="py-3 px-3">Disciplina / Clínica</th>
              <th className="py-3 px-3">Procedimento Clínico</th>
              <th className="py-3 px-3 text-center">Status / Certisign</th>
              <th className="py-3 px-3 text-center">E-mails</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProntuarios.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Nenhum prontuário encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Altere os filtros de busca ou utilize o botão &quot;Simular Webhook SubSign&quot; para inserir atendimentos.
                  </p>
                </td>
              </tr>
            ) : (
              filteredProntuarios.map((prontuario) => {
                const isSelected = selectedIds.includes(prontuario.id);
                const isSigned = prontuario.status === 'assinado_certisign';
                const isPending = prontuario.status === 'aguardando_validacao';
                const isRejected = prontuario.status === 'rejeitado_ajustes';

                const totalEmails = prontuario.envioEmails.destinatarios?.length || 0;
                const entreguesEmails =
                  prontuario.envioEmails.destinatarios?.filter(
                    (d) => d.status === 'entregue' || d.status === 'aberto'
                  ).length || 0;

                return (
                  <tr
                    key={prontuario.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(prontuario.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Prontuario & Atendimento */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-slate-900">
                        {prontuario.numeroProntuario}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(prontuario.dataAtendimento).toLocaleDateString('pt-BR')} às{' '}
                        {prontuario.horaAtendimento}
                      </div>
                    </td>

                    {/* Paciente */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {prontuario.paciente.nome}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        CPF: {prontuario.paciente.cpf} · {prontuario.paciente.idade} anos
                      </div>
                    </td>

                    {/* Aluno */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {prontuario.aluno.nome}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        RA: <span className="font-mono">{prontuario.aluno.ra}</span> · {prontuario.aluno.semestre}
                      </div>
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Assinado pelo aluno</span>
                      </div>
                    </td>

                    {/* Disciplina */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium truncate max-w-[180px]">
                        {prontuario.disciplina}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {prontuario.boxClinico}
                      </div>
                    </td>

                    {/* Procedimento */}
                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="text-slate-800 line-clamp-1 font-medium" title={prontuario.dadosClinicos.procedimentoRealizado}>
                        {prontuario.dadosClinicos.procedimentoRealizado}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate" title={prontuario.dadosClinicos.diagnostico}>
                        {prontuario.dadosClinicos.diagnostico}
                      </div>
                    </td>

                    {/* Status / Certisign */}
                    <td className="py-3 px-3 text-center">
                      {isSigned ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Assinado Certisign
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5" title={prontuario.assinaturaCertisign?.hashDocumento}>
                            ICP-Brasil A1 · ACT OK
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Aguardando Docente
                          </span>
                          <span className="text-[10px] text-amber-700 mt-0.5">
                            Pronto para assinatura
                          </span>
                        </div>
                      )}
                    </td>

                    {/* E-mails */}
                    <td className="py-3 px-3 text-center">
                      {isSigned ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 font-mono">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {entreguesEmails}/{totalEmails} enviados
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Disparo automático
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Após assinatura
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSigned && (
                          <button
                            onClick={() => onOpenSignModal(prontuario)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1 whitespace-nowrap"
                            title="Validar informações e assinar com Certisign ICP-Brasil"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Assinar</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectProntuario(prontuario)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Inspecionar detalhes clínicos completos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isSigned && (
                          <button
                            onClick={() => onOpenOfficialDoc(prontuario)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Visualizar e imprimir documento oficial com selo ICP-Brasil"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
