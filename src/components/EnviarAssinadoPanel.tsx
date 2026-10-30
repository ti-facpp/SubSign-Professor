import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Pencil,
  FileText,
} from 'lucide-react';
import { DestinoEnvio, EmailDestinatario, PdfAssinadoProntuario, ProfessorProfile, Prontuario } from '../types/index.ts';

const TAMANHO_MAXIMO_MB = 25;
const CHAVE_AUTOMATICO = 'subsign.envioAutomatico';

const ROTULO_PAPEL: Record<DestinoEnvio['papel'], string> = {
  paciente: 'Paciente',
  aluno: 'Aluno',
  coordenacao: 'Coordenação da disciplina',
};

interface InfoEnvio {
  destinos: DestinoEnvio[];
  avisos: string[];
  pdfAssinado: PdfAssinadoProntuario | null;
  smtpAtivo: boolean;
  modoTeste: boolean;
  redirecionarPara: string | null;
}

interface EnviarAssinadoPanelProps {
  prontuarioId: string;
  professor: ProfessorProfile | null;
  onAtualizado: () => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function lerAutomatico(): boolean {
  try {
    return localStorage.getItem(CHAVE_AUTOMATICO) === '1';
  } catch {
    return false;
  }
}

export const EnviarAssinadoPanel: React.FC<EnviarAssinadoPanelProps> = ({
  prontuarioId,
  professor,
  onAtualizado,
  onToast,
}) => {
  const [info, setInfo] = useState<InfoEnvio | null>(null);
  const [fase, setFase] = useState<'idle' | 'subindo' | 'pronto' | 'enviando' | 'enviado'>('idle');
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [automatico, setAutomatico] = useState(lerAutomatico);
  const [editandoPaciente, setEditandoPaciente] = useState(false);
  const [emailPaciente, setEmailPaciente] = useState('');
  const [resultado, setResultado] = useState<EmailDestinatario[]>([]);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregarResultado = useCallback(async () => {
    const res = await fetch(`/api/prontuarios/${prontuarioId}`);
    if (!res.ok) return;
    const p: Prontuario = await res.json();
    setResultado(p.envioEmails?.destinatarios || []);
  }, [prontuarioId]);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/prontuarios/${prontuarioId}/destinos-envio`);
      if (!res.ok) throw new Error();
      const data: InfoEnvio = await res.json();
      setInfo(data);
      if (data.pdfAssinado?.dataEnvio) {
        await carregarResultado();
        setFase('enviado');
      } else {
        setFase(data.pdfAssinado ? 'pronto' : 'idle');
      }
    } catch {
      setErro('Não foi possível carregar os destinatários deste prontuário.');
    }
  }, [prontuarioId, carregarResultado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pacienteDestino = info?.destinos.find((d) => d.papel === 'paciente');
  const precisaEmailPaciente = !pacienteDestino?.valido;
  const pacienteInformado = emailPaciente.trim();

  const alternarAutomatico = (valor: boolean) => {
    setAutomatico(valor);
    try {
      localStorage.setItem(CHAVE_AUTOMATICO, valor ? '1' : '0');
    } catch {
      // sem armazenamento local: a opção vale só nesta tela
    }
  };

  const enviar = async (opcoes: { confirmarReenvio?: boolean; pacienteEmail?: string } = {}) => {
    setErro('');
    setFase('enviando');
    try {
      const res = await fetch(`/api/prontuarios/${prontuarioId}/enviar-assinado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteEmail: opcoes.pacienteEmail,
          confirmarReenvio: opcoes.confirmarReenvio === true,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.jaEnviado) {
        setFase('pronto');
        if (window.confirm(`${data.error}`)) return enviar({ ...opcoes, confirmarReenvio: true });
        return;
      }
      if (!res.ok) {
        setFase('pronto');
        if (data.precisaEmailPaciente) setEditandoPaciente(true);
        throw new Error(data.error || 'Falha no envio');
      }
      const p: Prontuario = data.prontuario;
      setResultado(p.envioEmails.destinatarios);
      setEditandoPaciente(false);
      setEmailPaciente('');
      setInfo((atual) => (atual ? { ...atual, pdfAssinado: p.pdfAssinado ?? atual.pdfAssinado } : atual));
      if (p.pdfAssinado?.dataEnvio) {
        setFase('enviado');
      } else {
        // Nenhum dos destinatários recebeu: continua em "pronto" para tentar de novo.
        setFase('pronto');
        setErro(data.mensagem);
      }
      onAtualizado();
      onToast(data.mensagem, data.sucesso ? 'success' : 'error');
    } catch (err: any) {
      setErro(err.message || 'Falha no envio');
    }
  };

  const subir = async (arquivo: File) => {
    setErro('');
    const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
    if (!ehPdf) return setErro('Apenas arquivos PDF são aceitos.');
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return setErro(`O arquivo é maior que ${TAMANHO_MAXIMO_MB} MB.`);

    setFase('subindo');
    try {
      const res = await fetch(`/api/prontuarios/${prontuarioId}/pdf-assinado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Nome-Arquivo': encodeURIComponent(arquivo.name),
          'X-Enviado-Por': encodeURIComponent(professor ? `${professor.nome} <${professor.email}>` : 'Professor não identificado'),
        },
        body: arquivo,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Falha no envio (HTTP ${res.status})`);

      setInfo({
        destinos: data.destinos,
        avisos: data.avisos,
        pdfAssinado: data.pdfAssinado,
        smtpAtivo: data.smtpAtivo,
        modoTeste: data.modoTeste,
        redirecionarPara: data.redirecionarPara,
      });
      setFase('pronto');

      // Envio automático só quando não há nada a conferir: sem avisos e com os 3 endereços válidos.
      const tudoCerto = data.avisos.length === 0 && data.destinos.every((d: DestinoEnvio) => d.valido);
      if (automatico && tudoCerto) await enviar();
    } catch (err: any) {
      setFase(info?.pdfAssinado ? 'pronto' : 'idle');
      setErro(err.message || 'Falha ao subir o PDF');
    }
  };

  const reenviar = async (dest: EmailDestinatario) => {
    setReenviando(dest.id);
    try {
      const res = await fetch(`/api/emails/${dest.id}/reenviar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no reenvio');
      onToast(`Reenviado para ${dest.email}.`);
    } catch (err: any) {
      onToast(err.message || 'Falha no reenvio', 'error');
    } finally {
      await carregarResultado();
      onAtualizado();
      setReenviando(null);
    }
  };

  const pdf = info?.pdfAssinado;
  const ocupado = fase === 'subindo' || fase === 'enviando';
  const podeEnviar =
    fase === 'pronto' && !!pdf && (!precisaEmailPaciente || pacienteInformado.length > 0) && !ocupado;

  return (
    <div className="mt-4 pt-4 border-t border-emerald-100 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-emerald-700" />
        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
          Enviar o PDF assinado (Adobe)
        </span>
      </div>

      {info?.modoTeste && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Modo de teste ativo:</strong> tudo que for enviado aqui chega em{' '}
            <strong className="font-mono">{info.redirecionarPara}</strong>, e não nos destinatários abaixo. Para enviar de
            verdade, deixe <code>EMAIL_REDIRECIONAR_PARA</code> vazio no servidor.
          </span>
        </div>
      )}
      {info && !info.smtpAtivo && (
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            SMTP não configurado: o envio é <strong>simulado</strong> (nenhum e-mail sai de verdade).
          </span>
        </div>
      )}

      {/* Destinos resolvidos a partir do próprio prontuário */}
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
        {(info?.destinos || []).map((d) => {
          const ehPaciente = d.papel === 'paciente';
          return (
            <div key={d.papel} className={`px-3 py-2 text-xs ${ehPaciente ? 'bg-emerald-50/50' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {ROTULO_PAPEL[d.papel]}
                    {ehPaciente && ' · e-mail do prontuário'}
                  </div>
                  <div className="font-medium text-slate-800 truncate">{d.nome}</div>
                  <div className={`font-mono text-[11px] truncate ${d.valido ? 'text-emerald-800' : 'text-rose-700 font-semibold'}`}>
                    {d.email || 'sem e-mail cadastrado'}
                  </div>
                </div>
                {ehPaciente && !editandoPaciente && fase !== 'enviado' && (
                  <button
                    type="button"
                    onClick={() => setEditandoPaciente(true)}
                    className="shrink-0 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> {d.valido ? 'Corrigir' : 'Informar'}
                  </button>
                )}
              </div>
              {ehPaciente && (editandoPaciente || !d.valido) && fase !== 'enviado' && (
                <div className="mt-2">
                  <input
                    type="email"
                    value={emailPaciente}
                    onChange={(e) => setEmailPaciente(e.target.value)}
                    placeholder="E-mail correto do paciente"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Será gravado no prontuário (com registro no histórico) e usado neste envio.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(info?.avisos.length ?? 0) > 0 && fase !== 'enviado' && (
        <ul className="space-y-1">
          {info!.avisos.map((aviso, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{aviso}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Upload do PDF assinado */}
      {fase !== 'enviado' && (
        <>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              const arquivo = e.dataTransfer.files?.[0];
              if (arquivo) subir(arquivo);
            }}
            className={`w-full rounded-xl border-2 border-dashed px-4 py-4 flex items-center justify-center gap-2.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 ${
              arrastando ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            {fase === 'subindo' ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            ) : (
              <UploadCloud className="w-4 h-4 text-emerald-700" />
            )}
            <span className="font-semibold text-slate-800">
              {fase === 'subindo'
                ? 'Subindo PDF...'
                : pdf
                ? 'Trocar o PDF assinado'
                : 'Clique ou arraste aqui o PDF assinado no Adobe'}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) subir(arquivo);
              e.target.value = '';
            }}
          />

          {pdf && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-mono font-semibold text-slate-800 truncate flex-1">{pdf.nomeArquivo}</span>
              <span className="text-slate-500 shrink-0">
                {formatarTamanho(pdf.tamanhoBytes)} · {pdf.totalPaginas} pág.
              </span>
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={automatico}
              onChange={(e) => alternarAutomatico(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-700"
            />
            Enviar automaticamente ao subir o PDF (só quando os 3 e-mails estão corretos e sem avisos)
          </label>

          <button
            type="button"
            disabled={!podeEnviar}
            onClick={() => enviar({ pacienteEmail: pacienteInformado || undefined })}
            className="w-full px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {fase === 'enviando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {fase === 'enviando' ? 'Enviando...' : `Enviar para os ${info?.destinos.length || 3} destinatários`}
          </button>
        </>
      )}

      {/* Resultado do envio */}
      {fase === 'enviado' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {pdf?.dataEnvio ? `Enviado em ${new Date(pdf.dataEnvio).toLocaleString('pt-BR')}` : 'Enviado'}
            {pdf && <span className="font-mono font-normal text-slate-500 truncate">· {pdf.nomeArquivo}</span>}
          </div>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
            {resultado.map((d) => (
              <div key={d.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-slate-800 truncate">{d.email || '(sem e-mail)'}</div>
                  {d.status === 'falha' && <div className="text-[11px] text-rose-700">{d.erroMotivo}</div>}
                </div>
                {d.status === 'falha' ? (
                  <button
                    type="button"
                    disabled={reenviando === d.id}
                    onClick={() => reenviar(d)}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${reenviando === d.id ? 'animate-spin' : ''}`} /> Reenviar
                  </button>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Entregue
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setFase(pdf ? 'pronto' : 'idle');
              setErro('');
            }}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Subir outro PDF assinado para este prontuário
          </button>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
};
