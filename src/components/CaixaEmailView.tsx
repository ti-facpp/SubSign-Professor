import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  FileCheck2,
  Send,
  User,
  GraduationCap,
  Paperclip,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { EmailNotificacaoRecebida, ProfessorProfile, Prontuario } from '../types/index.ts';

interface CaixaEmailViewProps {
  currentProfessor: ProfessorProfile | null;
  prontuarios: Prontuario[];
  onChangeProfessor: () => void;
  onOpenSignModal: (prontuario: Prontuario) => void;
  onOpenOfficialDoc: (prontuario: Prontuario) => void;
  onSelectProntuario: (prontuario: Prontuario) => void;
  onOpenSimulator: () => void;
}

export const CaixaEmailView: React.FC<CaixaEmailViewProps> = ({
  currentProfessor,
  prontuarios,
  onChangeProfessor,
  onOpenSignModal,
  onOpenOfficialDoc,
  onSelectProntuario,
  onOpenSimulator,
}) => {
  const [emails, setEmails] = useState<EmailNotificacaoRecebida[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'pendentes' | 'assinados' | 'nao_lidos'>('todos');

  // Fetch emails for the logged-in professor
  const fetchEmails = async () => {
    if (!currentProfessor) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/caixa-email?email=${encodeURIComponent(currentProfessor.email)}`);
      const data = await res.json();
      setEmails(data.emails || []);
      if (!selectedEmailId && data.emails?.length > 0) {
        setSelectedEmailId(data.emails[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar caixa de e-mails', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [currentProfessor?.email, prontuarios]);

  // Synchronize mailbox
  const handleSync = async () => {
    if (!currentProfessor) return;
    setSyncing(true);
    try {
      await fetch('/api/caixa-email/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentProfessor.email }),
      });
      await fetchEmails();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle read status
  const handleToggleRead = async (emailItem: EmailNotificacaoRecebida, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newLido = !emailItem.lido;
      await fetch(`/api/caixa-email/${emailItem.id}/lido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lido: newLido }),
      });
      setEmails((prev) =>
        prev.map((item) => (item.id === emailItem.id ? { ...item, lido: newLido } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Mark as read when selected
  const handleSelectEmail = (emailItem: EmailNotificacaoRecebida) => {
    setSelectedEmailId(emailItem.id);
    if (!emailItem.lido) {
      fetch(`/api/caixa-email/${emailItem.id}/lido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lido: true }),
      }).then(() => {
        setEmails((prev) =>
          prev.map((item) => (item.id === emailItem.id ? { ...item, lido: true } : item))
        );
      });
    }
  };

  // Metrics
  const totalPdfsRecebidos = emails.length;
  const totalPdfsPendentes = emails.filter((e) => e.anexoPdf.statusAssinatura === 'aguardando_validacao').length;
  const totalPdfsAssinados = emails.filter((e) => e.anexoPdf.statusAssinatura === 'assinado_certisign').length;
  const totalNaoLidos = emails.filter((e) => !e.lido).length;

  // Filtered email list
  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      if (filterType === 'pendentes' && e.anexoPdf.statusAssinatura !== 'aguardando_validacao') {
        return false;
      }
      if (filterType === 'assinados' && e.anexoPdf.statusAssinatura !== 'assinado_certisign') {
        return false;
      }
      if (filterType === 'nao_lidos' && e.lido) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          e.assunto.toLowerCase().includes(q) ||
          e.prontuarioNumero.toLowerCase().includes(q) ||
          e.alunoNome.toLowerCase().includes(q) ||
          e.pacienteNome.toLowerCase().includes(q) ||
          e.anexoPdf.nomeArquivo.toLowerCase().includes(q) ||
          e.disciplina.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [emails, filterType, searchTerm]);

  // Selected email item
  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, selectedEmailId, filteredEmails]);

  // Find linked prontuario for quick actions
  const linkedProntuario = useMemo(() => {
    if (!selectedEmail) return null;
    return prontuarios.find((p) => p.id === selectedEmail.prontuarioId) || null;
  }, [selectedEmail, prontuarios]);

  return (
    <div className="space-y-6">
      {/* 1. Account Link & Metrics Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  Caixa de E-mail do Professor
                </span>
                {currentProfessor ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Vinculada e Sincronizada
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                    Sessão Desconectada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                {currentProfessor ? (
                  <>
                    <span>E-mail conectado:</span>
                    <strong className="text-slate-800 font-mono">{currentProfessor.email}</strong>
                    <span>·</span>
                    <span>{currentProfessor.nome}</span>
                  </>
                ) : (
                  <span>Nenhum e-mail de professor vinculado. Solicite um novo login para visualizar seus PDFs.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentProfessor && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Buscar novos e-mails e PDFs de subsign.facpp.edu.br"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar Caixa</span>
              </button>
            )}

            <button
              onClick={onChangeProfessor}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
              title="Modificar e-mail conectado (solicitará um novo login com credenciais)"
            >
              <span>{currentProfessor ? 'Modificar E-mail / Novo Login' : 'Realizar Login do Docente'}</span>
            </button>
          </div>
        </div>

        {/* The 4 KPI Counters: Quais e quantos PDFs recebeu para assinar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>PDFs Recebidos no Total</span>
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {totalPdfsRecebidos}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Anexos de subsign.facpp.edu.br
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div className="text-[11px] font-medium text-amber-800 flex items-center justify-between">
              <span>PDFs Pendentes para Assinar</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 mt-0.5 tabular-nums">
              {totalPdfsPendentes}
            </div>
            <div className="text-[10px] text-amber-700 font-medium mt-0.5">
              Requerem assinatura do docente
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
              <span>PDFs Já Assinados</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-0.5 tabular-nums">
              {totalPdfsAssinados}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Validados via Certisign ICP-Brasil
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>E-mails Não Lidos</span>
              <Mail className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800 mt-0.5 tabular-nums">
              {totalNaoLidos}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Notificações recentes
            </div>
          </div>
        </div>
      </div>

      {/* 2. Email Inbox Split Screen View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left Side: Email Messages List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por aluno, paciente, PDF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
              <button
                onClick={() => setFilterType('todos')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap transition-colors ${
                  filterType === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos ({emails.length})
              </button>
              <button
                onClick={() => setFilterType('pendentes')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterType === 'pendentes'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>PDFs a Assinar ({totalPdfsPendentes})</span>
              </button>
              <button
                onClick={() => setFilterType('assinados')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterType === 'assinados'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Assinados ({totalPdfsAssinados})</span>
              </button>
            </div>
          </div>

          {/* Email Item Cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Nenhum e-mail localizado</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Altere os filtros de busca ou utilize o botão &quot;Sincronizar Caixa&quot;.
                </p>
              </div>
            ) : (
              filteredEmails.map((emailItem) => {
                const isSelected = selectedEmail?.id === emailItem.id;
                const isPendingSign = emailItem.anexoPdf.statusAssinatura === 'aguardando_validacao';
                const isSigned = emailItem.anexoPdf.statusAssinatura === 'assinado_certisign';

                return (
                  <div
                    key={emailItem.id}
                    onClick={() => handleSelectEmail(emailItem)}
                    className={`p-3.5 cursor-pointer transition-colors relative text-xs ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                        : !emailItem.lido
                        ? 'bg-white hover:bg-slate-50 font-semibold text-slate-900'
                        : 'bg-white hover:bg-slate-50/70 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {!emailItem.lido && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Não lido"></span>
                        )}
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {emailItem.alunoNome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          (RA {emailItem.alunoRa})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(emailItem.dataRecebimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="font-medium text-slate-800 truncate mt-1 text-xs">
                      {emailItem.assunto}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Paciente: {emailItem.pacienteNome} · {emailItem.disciplina}
                    </div>

                    {/* Attached PDF Badge */}
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono truncate max-w-[210px]">
                        <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{emailItem.anexoPdf.nomeArquivo}</span>
                        <span className="text-slate-400">({emailItem.anexoPdf.tamanhoFormatado})</span>
                      </div>

                      {isPendingSign && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Aguardando Assinatura
                        </span>
                      )}

                      {isSigned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Assinado ICP-Brasil
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Email Message & PDF Actions (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {selectedEmail ? (
            <div className="flex-1 flex flex-col">
              {/* Message Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {selectedEmail.assunto}
                  </h2>
                  <button
                    onClick={(e) => handleToggleRead(selectedEmail, e)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 transition-colors shrink-0"
                  >
                    {selectedEmail.lido ? 'Marcar como não lido' : 'Marcar como lido'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 text-[11px] block">De (Remetente):</span>
                    <strong className="text-slate-800">{selectedEmail.remetenteNome}</strong>
                    <span className="text-slate-500 font-mono text-[11px] block">
                      &lt;{selectedEmail.remetente}&gt;
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Para (Destinatário):</span>
                    <strong className="text-slate-800">{currentProfessor?.nome || 'Docente Vinculado'}</strong>
                    <span className="text-emerald-800 font-mono text-[11px] block">
                      &lt;{selectedEmail.destinatarioEmail}&gt;
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Recebido em: {new Date(selectedEmail.dataRecebimento).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* PROMINENT ATTACHED PDF CARD */}
              <div className="p-5 bg-emerald-50/40 border-b border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      PDF do Prontuário Clínico Recebido para Validação
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedEmail.anexoPdf.tamanhoFormatado}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {selectedEmail.anexoPdf.nomeArquivo}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Prontuário: <span className="font-mono font-semibold text-slate-700">{selectedEmail.prontuarioNumero}</span> · Paciente: {selectedEmail.pacienteNome}
                        </div>
                      </div>
                    </div>

                    <div>
                      {selectedEmail.anexoPdf.statusAssinatura === 'aguardando_validacao' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          PDF Pendente para Assinar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PDF Assinado Digitalmente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hash info */}
                  <div className="p-2 bg-slate-50 rounded text-[10px] font-mono text-slate-600 break-all border border-slate-100">
                    <strong>Hash SHA-256 do Documento:</strong> {selectedEmail.anexoPdf.hashSha256}
                  </div>

                  {/* ACTION BUTTONS ON THE ATTACHED PDF */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {linkedProntuario && (
                        <button
                          onClick={() => onOpenOfficialDoc(linkedProntuario)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Visualizar PDF do Prontuário</span>
                        </button>
                      )}

                      {linkedProntuario && (
                        <button
                          onClick={() => onSelectProntuario(linkedProntuario)}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>Ver Ficha Clínica Completa</span>
                        </button>
                      )}
                    </div>

                    {/* Direct Sign Button right from the email */}
                    {linkedProntuario && linkedProntuario.status === 'aguardando_validacao' && (
                      <button
                        onClick={() => onOpenSignModal(linkedProntuario)}
                        className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Assinar Este PDF via Certisign</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body Content */}
              <div className="p-6 flex-1 overflow-y-auto text-xs space-y-4">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                  {selectedEmail.corpoMensagem}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-4 text-[11px] text-slate-600">
                  <div className="font-bold text-slate-800">
                    Instruções para o Docente Supervisor:
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Verifique os dados clínicos, anamnese e procedimentos realizados no prontuário.
                    </li>
                    <li>
                      O aluno já efetuou sua assinatura no app móvel <code className="text-emerald-800">subsign.facpp.edu.br</code>.
                    </li>
                    <li>
                      Ao confirmar a assinatura digital via Certisign ICP-Brasil, o prontuário será carimbado com carimbo do tempo oficial e disparado aos e-mails do aluno, paciente e arquivo.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 my-auto text-xs">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 text-sm">Selecione um e-mail para visualizar</p>
              <p className="text-slate-400 mt-1">
                Clique em qualquer mensagem da lista para inspecionar o PDF recebido e realizar a assinatura.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
