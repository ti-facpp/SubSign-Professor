import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api.ts';
import { Documento } from '../types/index.ts';

const TAMANHO_MAXIMO_MB = 25;
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

interface EnviarAvulsoModalProps {
  disciplinaNome: string;
  onFechar: () => void;
  onCriado: (documento: Documento) => void;
}

const formatarTamanho = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const CAMPO = 'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500';

// PDF assinado no Adobe que não veio do app do aluno: o professor informa o paciente e sobe o arquivo.
// Depois de criado, o documento abre na caixa e o envio segue pelo painel normal (com "Conferi").
export const EnviarAvulsoModal: React.FC<EnviarAvulsoModalProps> = ({ disciplinaNome, onFechar, onCriado }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteEmail, setPacienteEmail] = useState('');
  const [confirmaEmail, setConfirmaEmail] = useState('');
  const [alunoNome, setAlunoNome] = useState('');
  const [numero, setNumero] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const escolher = (f: File | undefined) => {
    setErro('');
    if (!f) return;
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) return setErro('Apenas arquivos PDF são aceitos.');
    if (f.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return setErro(`O arquivo é maior que ${TAMANHO_MAXIMO_MB} MB.`);
    setArquivo(f);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const email = pacienteEmail.trim().toLowerCase();
    if (!arquivo) return setErro('Escolha o PDF assinado no Adobe.');
    if (pacienteNome.trim().length < 2) return setErro('Informe o nome do paciente.');
    if (!EMAIL_RE.test(email)) return setErro('Informe um e-mail válido do paciente.');
    if (email !== confirmaEmail.trim().toLowerCase()) return setErro('Os dois e-mails do paciente não são iguais.');

    setEnviando(true);
    try {
      const res = await api('/api/documentos/avulso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Nome-Arquivo': encodeURIComponent(arquivo.name),
          'X-Paciente-Nome': encodeURIComponent(pacienteNome.trim()),
          'X-Paciente-Email': encodeURIComponent(email),
          'X-Aluno-Nome': encodeURIComponent(alunoNome.trim()),
          'X-Numero': encodeURIComponent(numero.trim()),
        },
        body: arquivo,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Falha ao subir o PDF (HTTP ${res.status})`);
      onCriado(data.documento);
    } catch (err: any) {
      setErro(err.message || 'Falha ao subir o PDF');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !enviando && onFechar()}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Enviar PDF assinado avulso</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Para documentos que não vieram do app do aluno. Vai para o paciente, para {disciplinaNome} e para prontuarios@.
            </p>
          </div>
          <button type="button" onClick={onFechar} disabled={enviando} className="p-1 text-slate-400 hover:text-slate-700 rounded" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <button
            type="button"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              escolher(e.dataTransfer.files?.[0]);
            }}
            className={`w-full rounded-xl border-2 border-dashed px-4 py-4 flex items-center justify-center gap-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              arrastando ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            {arquivo ? <FileText className="w-4 h-4 text-emerald-700 shrink-0" /> : <UploadCloud className="w-4 h-4 text-emerald-700 shrink-0" />}
            <span className="font-semibold text-slate-800 truncate">
              {arquivo ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}` : 'Clique ou arraste aqui o PDF assinado no Adobe'}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              escolher(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <label className="block space-y-1.5">
            <span className="font-semibold text-slate-700">Nome do paciente</span>
            <input type="text" value={pacienteNome} onChange={(e) => setPacienteNome(e.target.value)} required minLength={2} className={CAMPO} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700">E-mail do paciente</span>
              <input type="email" value={pacienteEmail} onChange={(e) => setPacienteEmail(e.target.value)} required autoComplete="off" className={`${CAMPO} font-mono`} />
            </label>
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700">Repita o e-mail</span>
              <input
                type="email"
                value={confirmaEmail}
                onChange={(e) => setConfirmaEmail(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                required
                autoComplete="off"
                className={`${CAMPO} font-mono`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700">Aluno <span className="font-normal text-slate-400">(opcional)</span></span>
              <input type="text" value={alunoNome} onChange={(e) => setAlunoNome(e.target.value)} className={CAMPO} />
            </label>
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700">Nº do documento <span className="font-normal text-slate-400">(opcional)</span></span>
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className={`${CAMPO} font-mono`} />
            </label>
          </div>

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
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Subir e conferir antes de enviar
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Nada é enviado ainda: o documento abre na caixa para você conferir os destinatários e confirmar o envio.
          </p>
        </div>
      </form>
    </div>
  );
};
