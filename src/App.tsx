import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, CheckCircle2, AlertTriangle, Mail, ShieldCheck } from 'lucide-react';
import { api, lerSessao, salvarSessao, EVENTO_SESSAO_EXPIRADA } from './api.ts';
import { Sessao } from './types/index.ts';
import { LoginView } from './components/LoginView.tsx';
import { CaixaView } from './components/CaixaView.tsx';

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao);
  const [aviso, setAviso] = useState('');
  const [aguardando, setAguardando] = useState(0);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const mostrarToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const entrar = (nova: Sessao) => {
    salvarSessao(nova);
    setAviso('');
    setSessao(nova);
  };

  const sair = useCallback(async (mensagem = '') => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // sai mesmo se o servidor não responder
    }
    salvarSessao(null);
    setAguardando(0);
    setAviso(mensagem);
    setSessao(null);
  }, []);

  // Token vencido/revogado (ex.: servidor reiniciado): volta para o login.
  useEffect(() => {
    const aoExpirar = () => {
      salvarSessao(null);
      setSessao(null);
      setAviso('Sua sessão expirou. Entre novamente.');
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  if (!sessao) return <LoginView onEntrar={entrar} aviso={aviso} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
              toast.type === 'success' ? 'bg-emerald-900 text-white border-emerald-700' : toast.type === 'info' ? 'bg-slate-900 text-white border-slate-700' : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'info' && <Mail className="w-4 h-4 text-amber-400" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <header className="bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">
                {sessao.disciplinaNome}
                {aguardando > 0 && (
                  <span className="ml-2 text-[10px] font-bold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full">{aguardando} a assinar</span>
                )}
              </div>
              <div className="text-[11px] text-emerald-200 truncate">
                {sessao.disciplinaEmail} · {sessao.professor}
              </div>
            </div>
          </div>
          <button
            onClick={() => sair()}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:text-white hover:bg-emerald-800 border border-emerald-700 rounded-lg flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CaixaView disciplinaNome={sessao.disciplinaNome} onToast={mostrarToast} onContagem={setAguardando} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">SubSign FACPP · Módulo Professor</div>
      </footer>
    </div>
  );
}
