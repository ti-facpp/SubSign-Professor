import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Loader2,
  X,
  KeyRound,
  Building2,
  Send,
} from 'lucide-react';
import { Prontuario, CertisignConfig } from '../types/index.ts';

interface CertisignSignModalProps {
  prontuario: Prontuario;
  certisignConfig: CertisignConfig | null;
  onClose: () => void;
  onSuccess: (updatedProntuario: Prontuario) => void;
}

export const CertisignSignModal: React.FC<CertisignSignModalProps> = ({
  prontuario,
  certisignConfig,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('1234');
  const [status, setStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [signedResult, setSignedResult] = useState<Prontuario | null>(null);

  const steps = [
    'Gerando hash SHA-256 dos dados clínicos do prontuário',
    'Conectando ao Assinador Certisign Hub (ICP-Brasil)',
    'Validando cadeia criptográfica e status de revogação OCSP',
    'Requisitando Carimbo do Tempo (ACT Certisign)',
    'Gravando assinatura digital com certificado e-CPF',
    'Despachando prontuário assinado aos 4 e-mails cadastrados',
  ];

  const handleSign = async () => {
    if (!pin) {
      setErrorMessage('Digite o PIN de autorização do certificado');
      return;
    }

    setStatus('signing');
    setErrorMessage('');
    setCurrentStep(0);

    // Animate the progression through real-world Certisign steps
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, 380));
    }

    try {
      const response = await fetch(`/api/prontuarios/${prontuario.id}/assinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a API Certisign');
      }

      const data = await response.json();
      setSignedResult(data.prontuario);
      setStatus('success');
      onSuccess(data.prontuario);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Erro ao processar assinatura na API Certisign');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Assinador Digital Certisign ICP-Brasil
              </h3>
              <p className="text-[11px] text-emerald-200">
                Validação Institucional · Portaria ICP-Brasil DOC-ICP-15
              </p>
            </div>
          </div>
          {status !== 'signing' && (
            <button
              onClick={onClose}
              className="p-1 text-emerald-200 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 text-xs space-y-4">
          {status === 'idle' && (
            <>
              {/* Document Summary Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>Prontuário: {prontuario.numeroProntuario}</span>
                  <span className="font-normal text-slate-500">
                    {new Date(prontuario.dataAtendimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="text-slate-600">
                  Paciente: <strong className="text-slate-800">{prontuario.paciente.nome}</strong> (CPF: {prontuario.paciente.cpf})
                </div>
                <div className="text-slate-600">
                  Aluno Supervisor: <strong className="text-slate-800">{prontuario.aluno.nome}</strong> (RA: {prontuario.aluno.ra})
                </div>
                <div className="text-slate-600 truncate">
                  Procedimento: <span className="font-medium text-slate-700">{prontuario.dadosClinicos.procedimentoRealizado}</span>
                </div>
              </div>

              {/* Certificate Information */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-700" />
                    <span>Certificado Digital Vinculado</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    ICP-BRASIL A1
                  </span>
                </div>
                <div className="text-slate-700 space-y-1">
                  <div>
                    <span className="text-slate-400">Titular: </span>
                    <strong className="text-slate-900">{certisignConfig?.titularNome}</strong>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span>
                      <span className="text-slate-400">CPF:</span> {certisignConfig?.titularCpf}
                    </span>
                    <span>
                      <span className="text-slate-400">Registro:</span> {certisignConfig?.cro_crm}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Emissor: {certisignConfig?.emissor}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Carimbo do Tempo: {certisignConfig?.autoridadeCarimbo}
                  </div>
                </div>
              </div>

              {/* Automatic Email Notification Notice */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
                <Send className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Despacho Automatizado:</strong> Ao assinar, o prontuário será enviado imediatamente para{' '}
                  <strong>{prontuario.aluno.email}</strong>, <strong>{prontuario.paciente.email}</strong>, Coordenação e SAME.
                </div>
              </div>

              {/* PIN input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>PIN de Autorização do Certificado Digital:</span>
                  <span className="text-[10px] text-slate-400">Padrão simulador: 1234</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Digite seu PIN..."
                    maxLength={8}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                {errorMessage && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>
            </>
          )}

          {status === 'signing' && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center animate-pulse">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Processando Assinatura via Certisign
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Aguarde a autenticação criptográfica e carimbo do tempo...
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-[11px]">
                    {idx < currentStep ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : idx === currentStep ? (
                      <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span
                      className={`${
                        idx === currentStep
                          ? 'font-bold text-slate-900'
                          : idx < currentStep
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'success' && signedResult && (
            <div className="py-4 space-y-4 animate-fadeIn">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Prontuário Assinado & Despachado com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm">
                  A assinatura digital ICP-Brasil foi aplicada com carimbo do tempo ACT Certisign e enviada aos 4 e-mails cadastrados.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="text-slate-500">
                  Código de Verificação: <strong className="text-emerald-800">{signedResult.assinaturaCertisign?.codigoVerificacao}</strong>
                </div>
                <div className="text-slate-500 break-all">
                  Hash SHA-256: <span className="text-slate-700">{signedResult.assinaturaCertisign?.hashDocumento}</span>
                </div>
                <div className="text-slate-500">
                  Carimbo do Tempo: <span className="text-slate-700">{signedResult.assinaturaCertisign?.carimboTempoACT}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 space-y-1">
                <strong>Status de Envio de E-mails:</strong>
                <p>
                  ✓ Aluno: {signedResult.aluno.email} (Entregue)
                  <br />
                  ✓ Paciente: {signedResult.paciente.email} (Entregue)
                  <br />
                  ✓ Coordenação Clínica FACPP (Entregue)
                  <br />
                  ✓ SAME - Arquivo Geral (Entregue)
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Falha na Assinatura Certisign</span>
              </div>
              <p className="text-xs">{errorMessage}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 text-xs font-semibold text-rose-700 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          {status === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSign}
                className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar & Assinar com Certisign</span>
              </button>
            </>
          )}

          {status === 'success' && (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
