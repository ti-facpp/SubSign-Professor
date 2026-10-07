import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  ArrowRight,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { ProfessorProfile } from '../types/index.ts';

interface ProfessorLoginModalProps {
  currentProfessor: ProfessorProfile | null;
  onClose: () => void;
  onLoginSuccess: (prof: ProfessorProfile) => void;
  onLogout?: () => void;
  initialMode?: 'login' | 'modificar_email';
}

const PRESET_PROFESSORES = [
  {
    email: 'renato.carvalho@facpp.edu.br',
    nome: 'Prof. Dr. Renato Carvalho',
    departamento: 'Endodontia & Periodontia Clínica',
    cro_crm: 'CRO-SP 98.412',
    matricula: 'DOC-3312',
    badge: 'Docente Titular',
    senhaPadrao: 'facpp@2026',
  },
  {
    email: 'martins1987@gmail.com',
    nome: 'Prof. Dr. Martins Silveira',
    departamento: 'Coordenação & Supervisão Clínica Odontológica FACPP',
    cro_crm: 'CRO-SP 104.821',
    matricula: 'DOC-4819',
    badge: 'Supervisor Geral',
    senhaPadrao: 'facpp@2026',
  },
  {
    email: 'marcos.silveira@facpp.edu.br',
    nome: 'Dr. Marcos Antonio Silveira',
    departamento: 'Clínica Odontológica Integrada & Cirurgia',
    cro_crm: 'CRO-SP 104.821',
    matricula: 'DOC-4819',
    badge: 'Docente Especialista',
    senhaPadrao: 'facpp@2026',
  },
];

export const ProfessorLoginModal: React.FC<ProfessorLoginModalProps> = ({
  currentProfessor,
  onClose,
  onLoginSuccess,
  onLogout,
  initialMode = 'login',
}) => {
  const [emailInput, setEmailInput] = useState(currentProfessor?.email || 'renato.carvalho@facpp.edu.br');
  const [senhaInput, setSenhaInput] = useState('facpp@2026');
  const [pinInput, setPinInput] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if current input email differs from currently authenticated session
  const isEmailModified = Boolean(
    currentProfessor &&
    emailInput.trim().toLowerCase() !== currentProfessor.email.toLowerCase()
  );

  const handleSelectPreset = (preset: typeof PRESET_PROFESSORES[0]) => {
    setEmailInput(preset.email);
    setSenhaInput(preset.senhaPadrao);
    setErrorMessage('');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Informe um e-mail institucional válido (ex: professor@facpp.edu.br).');
      return;
    }

    if (!senhaInput || senhaInput.trim().length < 4) {
      setErrorMessage('Informe sua senha institucional de acesso (mínimo 4 caracteres).');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          senha: senhaInput.trim(),
          pin: pinInput.trim(),
          isEmailModification: isEmailModified,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar professor.');
      }

      onLoginSuccess(data.professor);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login institucional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center font-bold shadow-inner">
              <KeyRound className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>
                  {currentProfessor ? 'Modificar E-mail / Solicitar Novo Login' : 'Login do Docente'}
                </span>
                {isEmailModified && (
                  <span className="text-[10px] bg-amber-400 text-amber-950 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Novo E-mail
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-200">
                Acesso institucional com certificado digital ICP-Brasil e caixa de PDFs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning when Modifying Email */}
        {currentProfessor && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold">Sessão ativa:</span>{' '}
                <strong className="text-amber-950 font-mono">{currentProfessor.email}</strong>
                <span className="text-amber-700 block">
                  Ao modificar o e-mail, é obrigatório solicitar um novo login institucional.
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 shrink-0"
                title="Encerrar sessão atual do professor"
              >
                <LogOut className="w-3 h-3" />
                <span>Desconectar</span>
              </button>
            )}
          </div>
        )}

        {/* Content Form */}
        <form onSubmit={handleLogin} className="p-6 text-xs space-y-4">
          {/* Quick Select Presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-2">
              Selecione uma conta docente cadastrada:
            </label>
            <div className="space-y-2">
              {PRESET_PROFESSORES.map((preset) => {
                const isSelected = preset.email.toLowerCase() === emailInput.toLowerCase();
                const isCurrentlyLoggedIn =
                  currentProfessor?.email.toLowerCase() === preset.email.toLowerCase();

                return (
                  <button
                    type="button"
                    key={preset.email}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 text-xs">{preset.nome}</strong>
                          {isCurrentlyLoggedIn ? (
                            <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              Conectado Agora
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                              {preset.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {preset.email}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {preset.departamento} · {preset.cro_crm}
                        </div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Email Input */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700">
                E-mail Institucional do Docente:
              </label>
              {isEmailModified && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Modificação Detectada
                </span>
              )}
            </div>

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="professor@facpp.edu.br ou gmail.com"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono ${
                  isEmailModified
                    ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500'
                    : 'border-slate-300 focus:border-emerald-600'
                }`}
              />
            </div>
            {isEmailModified && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Você modificou o e-mail para <strong className="font-mono">{emailInput}</strong>. Para vincular a nova caixa de e-mails com prontuários de alunos, informe as credenciais de login abaixo.
              </p>
            )}
          </div>

          {/* Password & Credential Verification */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700">
                Senha Institucional / Credencial Docente:
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Padrão: facpp@2026
              </span>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Senha de acesso"
                className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security PIN for Certisign */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-600">
                PIN de Segurança / Token Docente (Opcional):
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                PIN: 1234
              </span>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN numérico do Certificado / 2FA"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Submit Button */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || !emailInput.trim()}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando novo login...</span>
                </>
              ) : isEmailModified ? (
                <>
                  <span>Autenticar & Realizar Novo Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Confirmar Login & Vincular Caixa</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
