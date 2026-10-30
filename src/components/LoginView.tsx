import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Disciplina, Sessao } from '../types/index.ts';

interface LoginViewProps {
  onEntrar: (sessao: Sessao) => void;
  aviso?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onEntrar, aviso }) => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [disciplinaEmail, setDisciplinaEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [professor, setProfessor] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch('/api/disciplinas')
      .then((r) => r.json())
      .then(setDisciplinas)
      .catch(() => setErro('Não foi possível carregar a lista de disciplinas.'));
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disciplinaEmail, codigo, professor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível entrar.');
      onEntrar(data.sessao);
    } catch (err: any) {
      setErro(err.message || 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={entrar} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-emerald-900 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold">SubSign Professor · FACPP</h1>
            <p className="text-[11px] text-emerald-200">Acesso por disciplina</p>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {aviso && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">{aviso}</div>
          )}

          <label className="block space-y-1.5">
            <span className="font-semibold text-slate-700">Disciplina</span>
            <select
              value={disciplinaEmail}
              onChange={(e) => setDisciplinaEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Selecione a disciplina...</option>
              {disciplinas.map((d) => (
                <option key={d.email} value={d.email}>
                  {d.nome} — {d.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Código de acesso da disciplina
            </span>
            <input
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              placeholder="XXXX-XXXX"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="font-semibold text-slate-700">Seu nome (professor responsável pela assinatura)</span>
            <input
              type="text"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              required
              minLength={3}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          {erro && (
            <div className="flex items-start gap-1.5 text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-lg flex items-center justify-center gap-2"
          >
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
          </button>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Cada disciplina tem o seu código. Você só vê e só envia documentos da disciplina em que entrou.
          </p>
        </div>
      </form>
    </div>
  );
};
