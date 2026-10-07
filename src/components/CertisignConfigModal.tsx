import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';
import { CertisignConfig } from '../types/index.ts';

interface CertisignConfigModalProps {
  onClose: () => void;
  onSaved: (config: CertisignConfig) => void;
}

export const CertisignConfigModal: React.FC<CertisignConfigModalProps> = ({
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<CertisignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/certisign/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/certisign/testar-conexao', {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult(data);
      setFeedback({
        type: 'success',
        message: 'Conexão validada com sucesso com a API Certisign Signer Hub!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha ao conectar com o serviço Certisign.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/certisign/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setFeedback({
        type: 'success',
        message: 'Configurações do Certificado Digital e API Certisign salvas com sucesso!',
      });
      onSaved(data.config);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao salvar configurações.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Configuração da API Certisign & Certificado Digital
              </h3>
              <p className="text-[11px] text-emerald-200">
                Integração Criptográfica ICP-Brasil para Assinatura do Docente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 text-xs space-y-5">
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {/* Section 1: API Certisign Hub */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>1. Parâmetros da API Certisign Signer Hub</span>
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
              >
                {testing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Testar Conexão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Ambiente da API:
                </label>
                <select
                  value={config.ambiente}
                  onChange={(e) =>
                    setConfig({ ...config, ambiente: e.target.value as any })
                  }
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="homologacao">Homologação / Sandbox Certisign</option>
                  <option value="producao">Produção Oficial ICP-Brasil</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Endpoint URL Signer Hub:
                </label>
                <input
                  type="text"
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Client ID (Chave Pública de Integração):
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Client Secret (Token da Faculdade):
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
                />
              </div>
            </div>

            {testResult && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-[10px] text-slate-700">
                <div className="font-bold text-emerald-800">✓ Resposta da API Certisign:</div>
                <div>Status OCSP: {testResult.detalhes?.statusOCSP}</div>
                <div>Carimbo do Tempo ACT: {testResult.detalhes?.carimboTempo}</div>
                <div>Emissor: {testResult.detalhes?.emissor}</div>
              </div>
            )}
          </div>

          {/* Section 2: Certificado Digital ICP-Brasil */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Certificado Digital do Professor Supervisor</span>
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {config.tipoCertificado}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nome Completo do Titular:
                </label>
                <input
                  type="text"
                  value={config.titularNome}
                  onChange={(e) => setConfig({ ...config, titularNome: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Registro Profissional (CRO / CRM):
                </label>
                <input
                  type="text"
                  value={config.cro_crm}
                  onChange={(e) => setConfig({ ...config, cro_crm: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  e-CPF do Docente:
                </label>
                <input
                  type="text"
                  value={config.titularCpf}
                  onChange={(e) => setConfig({ ...config, titularCpf: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Número de Série do Certificado:
                </label>
                <input
                  type="text"
                  value={config.certificadoSerial}
                  onChange={(e) => setConfig({ ...config, certificadoSerial: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Autoridade Certificadora Emissora:
                </label>
                <input
                  type="text"
                  value={config.emissor}
                  onChange={(e) => setConfig({ ...config, emissor: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Data de Validade do Certificado:
                </label>
                <input
                  type="date"
                  value={config.dataValidade}
                  onChange={(e) => setConfig({ ...config, dataValidade: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="checkbox"
                id="carimboCheck"
                checked={config.carimboTempoAtivo}
                onChange={(e) =>
                  setConfig({ ...config, carimboTempoAtivo: e.target.checked })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="carimboCheck" className="text-slate-700 cursor-pointer">
                <strong>Ativar Carimbo do Tempo (ACT Certisign ICP-Brasil)</strong>
                <span className="block text-[10px] text-slate-500">
                  Garante tempestividade jurídica irrefutável com carimbo criptográfico oficial da Autoridade Certificadora do Tempo.
                </span>
              </label>
            </div>
          </div>

          {/* Form Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
