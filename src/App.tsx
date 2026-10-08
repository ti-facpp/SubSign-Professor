import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  FileSignature,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Layers,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Prontuario, CertisignConfig, ProfessorProfile } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { ProntuariosTable } from './components/ProntuariosTable.tsx';
import { ProntuarioModal } from './components/ProntuarioModal.tsx';
import { CertisignSignModal } from './components/CertisignSignModal.tsx';
import { BatchSignModal } from './components/BatchSignModal.tsx';
import { ConsolidatedReportView } from './components/ConsolidatedReportView.tsx';
import { CertisignConfigModal } from './components/CertisignConfigModal.tsx';
import { NewWebhookSimulatorModal } from './components/NewWebhookSimulatorModal.tsx';
import { OfficialDocumentModal } from './components/OfficialDocumentModal.tsx';
import { CaixaEmailView } from './components/CaixaEmailView.tsx';
import { ProfessorLoginModal } from './components/ProfessorLoginModal.tsx';
import { DocumentosPdfView } from './components/DocumentosPdfView.tsx';

export default function App() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [certisignConfig, setCertisignConfig] = useState<CertisignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'caixa_email' | 'prontuarios' | 'documentos' | 'relatorio' | 'config'>('caixa_email');
  const [activeStatusFilter, setActiveStatusFilter] = useState('todos');

  // Professor Profile & Login State
  const [currentProfessor, setCurrentProfessor] = useState<ProfessorProfile | null>({
    email: 'renato.carvalho@facpp.edu.br',
    nome: 'Prof. Dr. Renato Carvalho',
    departamento: 'Endodontia & Periodontia Clínica',
    cro_crm: 'CRO-SP 98.412',
    matricula: 'DOC-3312',
    certificadoStatus: 'valido',
  });
  const [isProfessorLoginOpen, setIsProfessorLoginOpen] = useState(false);
  const [pendingPdfsCount, setPendingPdfsCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);

  // Modals
  const [selectedProntuario, setSelectedProntuario] = useState<Prontuario | null>(null);
  const [signingProntuario, setSigningProntuario] = useState<Prontuario | null>(null);
  const [batchSignIds, setBatchSignIds] = useState<string[]>([]);
  const [officialDocProntuario, setOfficialDocProntuario] = useState<Prontuario | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    const previousEmail = currentProfessor?.email;
    setCurrentProfessor(null);
    setPendingPdfsCount(0);
    showToast(
      previousEmail
        ? `Sessão de ${previousEmail} encerrada. Solicite um novo login para continuar.`
        : 'Sessão encerrada.',
      'info'
    );
    setIsProfessorLoginOpen(true);
  };

  const fetchProntuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/prontuarios');
      const data = await res.json();
      setProntuarios(data.prontuarios || []);
    } catch (err) {
      console.error('Erro ao buscar prontuários', err);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/certisign/config');
      const data = await res.json();
      setCertisignConfig(data);
    } catch (err) {
      console.error('Erro ao buscar configuração Certisign', err);
    }
  }, []);

  const fetchDocumentosStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documentos');
      const data = await res.json();
      setPendingDocsCount(data.totalPendentes || 0);
    } catch (err) {
      console.error('Erro ao buscar PDFs enviados', err);
    }
  }, []);

  const fetchEmailStats = useCallback(async (profEmail: string) => {
    try {
      const res = await fetch(`/api/caixa-email?email=${encodeURIComponent(profEmail)}`);
      const data = await res.json();
      setPendingPdfsCount(data.totalPdfsPendentes || 0);
    } catch (err) {
      console.error('Erro ao atualizar contagem de e-mails', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const promises: Promise<any>[] = [fetchProntuarios(), fetchConfig(), fetchDocumentosStats()];
    if (currentProfessor?.email) {
      promises.push(fetchEmailStats(currentProfessor.email));
    }
    await Promise.all(promises);
    setLoading(false);
  }, [fetchProntuarios, fetchConfig, fetchDocumentosStats, fetchEmailStats, currentProfessor?.email]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Resend single email
  const handleResendEmail = async (destinatarioId: string) => {
    try {
      const res = await fetch(`/api/emails/${destinatarioId}/reenviar`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Falha ao reenviar e-mail');
      showToast('E-mail reenviado com sucesso ao destinatário.');
      await refreshAll();
      if (selectedProntuario) {
        const updated = await fetch(`/api/prontuarios/${selectedProntuario.id}`).then((r) => r.json());
        setSelectedProntuario(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro no reenvio', 'error');
    }
  };

  // Resend all emails for a record
  const handleResendAllEmails = async (id: string) => {
    try {
      const res = await fetch(`/api/prontuarios/${id}/enviar-emails`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Falha ao disparar e-mails');
      showToast('Prontuário reenviado com sucesso para os 4 e-mails cadastrados.');
      await refreshAll();
      if (selectedProntuario?.id === id) {
        const updated = await fetch(`/api/prontuarios/${id}`).then((r) => r.json());
        setSelectedProntuario(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro no reenvio em massa', 'error');
    }
  };

  const pendingCount = prontuarios.filter((p) => p.status === 'aguardando_validacao').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-bounceIn">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toastMessage.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'info' && <Mail className="w-4 h-4 text-amber-400" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Institutional Top Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'config') setIsConfigOpen(true);
        }}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenProfessorLogin={() => setIsProfessorLoginOpen(true)}
        onLogout={handleLogout}
        certisignConfig={certisignConfig}
        currentProfessor={currentProfessor}
        pendingCount={pendingCount}
        pendingPdfsCount={pendingPdfsCount}
        pendingDocsCount={pendingDocsCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* VIEW 1: CAIXA DE E-MAIL DO PROFESSOR (PDFs RECEBIDOS PARA ASSINAR) */}
        {currentTab === 'caixa_email' && (
          <CaixaEmailView
            currentProfessor={currentProfessor}
            prontuarios={prontuarios}
            onChangeProfessor={() => setIsProfessorLoginOpen(true)}
            onOpenSignModal={(p) => setSigningProntuario(p)}
            onOpenOfficialDoc={(p) => setOfficialDocProntuario(p)}
            onSelectProntuario={(p) => setSelectedProntuario(p)}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
        )}

        {/* VIEW 2: FILA GERAL DE PRONTUÁRIOS */}
        {currentTab === 'prontuarios' && (
          <div className="space-y-6">
            {/* Operational Metrics Cards */}
            <StatsCards
              prontuarios={prontuarios}
              certisignConfig={certisignConfig}
              onFilterStatus={(st) => setActiveStatusFilter(st)}
              activeStatusFilter={activeStatusFilter}
            />

            {/* High-density Prontuários Table */}
            <ProntuariosTable
              prontuarios={prontuarios}
              onSelectProntuario={(p) => setSelectedProntuario(p)}
              onOpenSignModal={(p) => setSigningProntuario(p)}
              onOpenBatchSign={(ids) => setBatchSignIds(ids)}
              onOpenOfficialDoc={(p) => setOfficialDocProntuario(p)}
              activeStatusFilter={activeStatusFilter}
              onStatusFilterChange={(st) => setActiveStatusFilter(st)}
            />
          </div>
        )}

        {/* VIEW 2B: UPLOAD DE PDFs AVULSOS PARA ASSINATURA */}
        {currentTab === 'documentos' && (
          <DocumentosPdfView
            currentProfessor={currentProfessor}
            onRequestLogin={() => setIsProfessorLoginOpen(true)}
            onToast={showToast}
            onPendentesChange={setPendingDocsCount}
          />
        )}

        {/* VIEW 3: RELATÓRIO CONSOLIDADO */}
        {currentTab === 'relatorio' && (
          <ConsolidatedReportView
            onSelectProntuarioById={(id) => {
              const item = prontuarios.find((p) => p.id === id);
              if (item) setSelectedProntuario(item);
            }}
            onRefresh={refreshAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SubSign FACPP</span>
            <span>·</span>
            <span>Módulo Docente & Certisign ICP-Brasil</span>
            <span>·</span>
            <span className="text-[11px] text-slate-400">Medida Provisória 2.200-2/2001</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Conectado a subsign.facpp.edu.br · {currentProfessor ? `Vinculado a ${currentProfessor.email}` : 'Nenhum professor autenticado'}
          </div>
        </div>
      </footer>

      {/* MODAL 1: Detail Clinical Inspection Modal */}
      {selectedProntuario && (
        <ProntuarioModal
          prontuario={selectedProntuario}
          onClose={() => setSelectedProntuario(null)}
          onSign={(p) => {
            setSelectedProntuario(null);
            setSigningProntuario(p);
          }}
          onResendEmail={handleResendEmail}
          onResendAllEmails={handleResendAllEmails}
          onOpenOfficialDoc={(p) => setOfficialDocProntuario(p)}
        />
      )}

      {/* MODAL 2: Single Certisign Digital Sign Modal */}
      {signingProntuario && (
        <CertisignSignModal
          prontuario={signingProntuario}
          certisignConfig={certisignConfig}
          onClose={() => setSigningProntuario(null)}
          onSuccess={async (updated) => {
            showToast('Prontuário validado e assinado via Certisign ICP-Brasil. E-mails despachados!');
            await refreshAll();
          }}
        />
      )}

      {/* MODAL 3: Batch Certisign Digital Sign Modal */}
      {batchSignIds.length > 0 && (
        <BatchSignModal
          selectedIds={batchSignIds}
          prontuarios={prontuarios}
          certisignConfig={certisignConfig}
          onClose={() => setBatchSignIds([])}
          onSuccess={async () => {
            showToast('Assinatura em lote concluída com sucesso! E-mails despachados.');
            await refreshAll();
          }}
        />
      )}

      {/* MODAL 4: Official Document Viewer with Certisign Stamp & Print */}
      {officialDocProntuario && (
        <OfficialDocumentModal
          prontuario={officialDocProntuario}
          onClose={() => setOfficialDocProntuario(null)}
        />
      )}

      {/* MODAL 5: Certisign API & Certificate Config */}
      {isConfigOpen && (
        <CertisignConfigModal
          onClose={() => setIsConfigOpen(false)}
          onSaved={(cfg) => {
            setCertisignConfig(cfg);
            showToast('Configurações da API Certisign e Certificado Digital salvas.');
          }}
        />
      )}

      {/* MODAL 6: New Record SubSign Simulator Modal */}
      {isSimulatorOpen && (
        <NewWebhookSimulatorModal
          onClose={() => setIsSimulatorOpen(false)}
          onSuccess={async () => {
            showToast('Novo prontuário assinado pelo aluno recebido na fila do docente e na caixa de e-mails!');
            await refreshAll();
          }}
        />
      )}

      {/* MODAL 7: Professor Email Login Modal */}
      {isProfessorLoginOpen && (
        <ProfessorLoginModal
          currentProfessor={currentProfessor}
          onClose={() => setIsProfessorLoginOpen(false)}
          onLogout={handleLogout}
          onLoginSuccess={(prof) => {
            const isModified =
              currentProfessor &&
              currentProfessor.email.toLowerCase() !== prof.email.toLowerCase();
            setCurrentProfessor(prof);
            showToast(
              isModified
                ? `E-mail alterado para ${prof.email}. Novo login autenticado com sucesso e caixa vinculada!`
                : `Conectado como ${prof.nome} (${prof.email}). Caixa de e-mail sincronizada!`,
              'success'
            );
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
