import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Mail,
} from 'lucide-react';
import { Prontuario, CertisignConfig } from '../types/index.ts';

interface BatchSignModalProps {
  selectedIds: string[];
  prontuarios: Prontuario[];
  certisignConfig: CertisignConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchSignModal: React.FC<BatchSignModalProps> = ({
  selectedIds,
  prontuarios,
  certisignConfig,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [processedCount, setProcessedCount] = useState(0);

  const selectedProntuarios = prontuarios.filter((p) =>
    selectedIds.includes(p.id)
  );

  const handleExecuteBatch = async () => {
    if (!pin) {
      setError('Informe o PIN de autorização');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/prontuarios/assinar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, pin }),
      });

      if (!response.ok) {
        throw new Error('Falha ao processar assinatura em lote na API Certisign');
      }

      const data = await response.json();
      setProcessedCount(data.totalAssinados);
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro durante a assinatura em lote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Assinatura em Lote via Certisign ICP-Brasil
              </h3>
              <p className="text-[11px] text-emerald-200">
                Processamento Centralizado de Múltiplos Prontuários
              </p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1 text-emerald-200 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 text-xs space-y-4">
          {!success ? (
            <>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <span className="font-bold text-xs block">
                  Você está assinando {selectedProntuarios.length} prontuário(s) selecionado(s):
                </span>
                <p className="text-[11px] text-emerald-800">
                  Cada prontuário receberá uma assinatura digital individual com certificado e-CPF de{' '}
                  <strong>{certisignConfig?.titularNome}</strong>, carimbo do tempo ACT e disparo automático para os e-mails cadastrados.
                </p>
              </div>

              {/* List of items to be signed */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {selectedProntuarios.map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 font-mono">{item.numeroProntuario}</strong>
                      <div className="text-[11px] text-slate-500">
                        Paciente: {item.paciente.nome} · Aluno: {item.aluno.nome}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {item.disciplina}
                    </span>
                  </div>
                ))}
              </div>

              {/* PIN input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>PIN do Certificado Digital do Professor:</span>
                  <span className="text-[10px] text-slate-400">Padrão: 1234</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Digite o PIN do certificado..."
                    maxLength={8}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 space-y-4 text-center animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Assinatura em Lote Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>{processedCount} prontuário(s)</strong> assinado(s) digitalmente via Certisign ICP-Brasil.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Mail className="w-4 h-4" />
                  <span>Despacho Concluído</span>
                </div>
                <p>
                  Todos os e-mails dos alunos, pacientes, coordenação e SAME foram disparados automaticamente com os recibos criptográficos e documentos anexados.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          {!success ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteBatch}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assinando com Certisign...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Assinar Todos ({selectedProntuarios.length})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
