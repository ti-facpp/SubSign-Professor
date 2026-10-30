import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, UploadCloud, CheckCircle2, AlertCircle, AlertTriangle, Loader2, RefreshCw, FileText, Download } from 'lucide-react';
import { api, abrirPdf } from '../api.ts';
import { DestinoEnvio, Documento, EmailDestinatario, EmailPapel, InfoEnvio } from '../types/index.ts';

const TAMANHO_MAXIMO_MB = 25;
const CHAVE_AUTOMATICO = 'subsign.envioAutomatico';

const ROTULO_PAPEL: Record<EmailPapel, string> = {
  paciente: 'Paciente',
  coordenacao: 'Disciplina (coordenação/professores)',
  prontuario: 'Prontuários',
};

interface EnviarAssinadoPanelProps {
  documento: Documento;
  onAtualizado: (documento: Documento) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const formatarTamanho = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function lerAutomatico(): boolean {
  try {
    return localStorage.getItem(CHAVE_AUTOMATICO) === '1';
  } catch {
    return false;
  }
}

async function erroDe(res: Response, padrao: string): Promise<string> {
  try {
    return (await res.json()).error || padrao;
  } catch {
    return padrao;
  }
}

export const EnviarAssinadoPanel: React.FC<EnviarAssinadoPanelProps> = ({ documento, onAtualizado, onToast }) => {
  const [info, setInfo] = useState<InfoEnvio | null>(null);
  const [ocupado, setOcupado] = useState<'subindo' | 'enviando' | null>(null);
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [automatico, setAutomatico] = useState(lerAutomatico);
  const [confirmado, setConfirmado] = useState(false);
  const [novoUpload, setNovoUpload] = useState(false);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pdf = documento.pdfAssinado;
  const enviado = !!pdf?.dataEnvio && !novoUpload;
  const avulso = documento.origem === 'avulso';
  const requerConfirmacao = !!pdf && (pdf.conferencia !== 'identico' || !pdf.temAssinaturaDigital);

  const carregarDestinos = useCallback(async () => {
    try {
      const res = await api(`/api/documentos/${documento.id}/destinos`);
      if (!res.ok) throw new Error(await erroDe(res, 'Falha ao carregar os destinatários.'));
      setInfo(await res.json());
    } catch (err: any) {
      setErro(err.message);
    }
  }, [documento.id]);

  useEffect(() => {
    carregarDestinos();
  }, [carregarDestinos]);

  const alternarAutomatico = (valor: boolean) => {
    setAutomatico(valor);
    try {
      localStorage.setItem(CHAVE_AUTOMATICO, valor ? '1' : '0');
    } catch {
      // vale só nesta tela
    }
  };

  const enviar = async (opcoes: { confirmarConferencia?: boolean; confirmarReenvio?: boolean } = {}) => {
    setErro('');
    setOcupado('enviando');
    try {
      const res = await api(`/api/documentos/${documento.id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmarConferencia: opcoes.confirmarConferencia ?? confirmado,
          confirmarReenvio: opcoes.confirmarReenvio === true,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.jaEnviado) {
        setOcupado(null);
        if (window.confirm(data.error)) return enviar({ ...opcoes, confirmarReenvio: true });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Falha no envio');
      onAtualizado(data.documento);
      setNovoUpload(false);
      setConfirmado(false);
      if (!data.documento.pdfAssinado?.dataEnvio) setErro(data.mensagem);
      onToast(data.mensagem, data.sucesso ? 'success' : 'error');
    } catch (err: any) {
      setErro(err.message || 'Falha no envio');
    } finally {
      setOcupado(null);
    }
  };

  const subir = async (arquivo: File) => {
    setErro('');
    const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
    if (!ehPdf) return setErro('Apenas arquivos PDF são aceitos.');
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return setErro(`O arquivo é maior que ${TAMANHO_MAXIMO_MB} MB.`);

    setOcupado('subindo');
    try {
      const res = await api(`/api/documentos/${documento.id}/pdf-assinado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf', 'X-Nome-Arquivo': encodeURIComponent(arquivo.name) },
        body: arquivo,
      });
      if (!res.ok) throw new Error(await erroDe(res, `Falha ao subir o PDF (HTTP ${res.status})`));
      const data = await res.json();
      const atualizado: Documento = { ...documento, pdfAssinado: data.pdfAssinado };
      onAtualizado(atualizado);
      setNovoUpload(false);
      setConfirmado(false);
      setOcupado(null);

      // Envio automático só quando nada precisa ser conferido: PDF idêntico ao original, com assinatura
      // nova, e sem avisos sobre os destinatários.
      if (automatico && !data.requerConfirmacao && (info?.avisos.length ?? 0) === 0) await enviar({ confirmarConferencia: false });
    } catch (err: any) {
      setErro(err.message || 'Falha ao subir o PDF');
    } finally {
      setOcupado((o) => (o === 'subindo' ? null : o));
    }
  };

  const reenviar = async (dest: EmailDestinatario) => {
    setReenviando(dest.id);
    try {
      const res = await api(`/api/documentos/${documento.id}/destinatarios/${dest.id}/reenviar`, { method: 'POST' });
      const data = await res.json();
      if (data.documento) onAtualizado(data.documento);
      if (!res.ok) throw new Error(data.error || 'Falha no reenvio');
      onToast(`Reenviado para ${dest.email}.`);
    } catch (err: any) {
      onToast(err.message || 'Falha no reenvio', 'error');
    } finally {
      setReenviando(null);
    }
  };

  const podeEnviar = !!pdf && !ocupado && (!requerConfirmacao || confirmado);

  return (
    <div className="mt-4 pt-4 border-t border-emerald-100 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-emerald-700" />
        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Enviar o PDF assinado (Adobe)</span>
      </div>

      {info?.modoTeste && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Modo de teste ativo:</strong> tudo que for enviado aqui chega em <strong className="font-mono">{info.redirecionarPara}</strong>,
            e não nos destinatários abaixo. Para enviar de verdade, deixe <code>EMAIL_REDIRECIONAR_PARA</code> vazio no servidor.
          </span>
        </div>
      )}
      {info && !info.smtpAtivo && (
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>SMTP não configurado: o envio é <strong>simulado</strong> (nenhum e-mail sai de verdade).</span>
        </div>
      )}

      {/* Destinos: vêm do próprio documento, sem digitação */}
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
        {(info?.destinos || []).map((d: DestinoEnvio) => (
          <div key={d.papel} className={`px-3 py-2 text-xs ${d.papel === 'paciente' ? 'bg-emerald-50/50' : ''}`}>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              {ROTULO_PAPEL[d.papel]}
              {d.papel === 'paciente' && ` · e-mail informado pelo ${avulso ? 'professor' : 'aluno'}`}
            </div>
            <div className="font-medium text-slate-800 truncate">{d.nome}</div>
            <div className={`font-mono text-[11px] truncate ${d.valido ? 'text-emerald-800' : 'text-rose-700 font-semibold'}`}>{d.email || 'sem e-mail'}</div>
          </div>
        ))}
      </div>

      {(info?.avisos.length ?? 0) > 0 && !enviado && (
        <ul className="space-y-1">
          {info!.avisos.map((aviso, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{aviso}</span>
            </li>
          ))}
        </ul>
      )}

      {!enviado && (
        <>
          <button
            type="button"
            disabled={!!ocupado}
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
            {ocupado === 'subindo' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <UploadCloud className="w-4 h-4 text-emerald-700" />}
            <span className="font-semibold text-slate-800">
              {ocupado === 'subindo' ? 'Subindo PDF...' : pdf ? 'Trocar o PDF assinado' : 'Clique ou arraste aqui o PDF assinado no Adobe'}
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-mono font-semibold text-slate-800 truncate flex-1">{pdf.nomeArquivo}</span>
                <span className="text-slate-500 shrink-0">
                  {formatarTamanho(pdf.tamanhoBytes)} · {pdf.totalPaginas} pág.
                </span>
              </div>
              {pdf.conferencia === 'identico' && pdf.temAssinaturaDigital && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confere com o documento recebido e tem assinatura digital nova.
                </div>
              )}
              {requerConfirmacao && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1.5">
                  {pdf.conferencia === 'divergente' && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Não consegui confirmar que é o mesmo documento recebido (o Adobe pode ter regravado o arquivo).</span>
                    </div>
                  )}
                  {pdf.conferencia === 'avulso' && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Envio avulso: não há documento do app do aluno para comparar. Confira o paciente e o e-mail acima.</span>
                    </div>
                  )}
                  {!pdf.temAssinaturaDigital && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Não encontrei uma assinatura digital {avulso ? '' : 'nova '}neste PDF.</span>
                    </div>
                  )}
                  <label className="flex items-start gap-2 cursor-pointer select-none font-semibold">
                    <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="w-3.5 h-3.5 mt-0.5 accent-emerald-700" />
                    Conferi: é o documento do paciente {documento.pacienteNome} e está assinado.
                  </label>
                </div>
              )}
            </div>
          )}

          {!avulso && (
            <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={automatico} onChange={(e) => alternarAutomatico(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-700" />
              Enviar automaticamente ao subir o PDF (só quando confere com o original e está assinado)
            </label>
          )}

          <button
            type="button"
            disabled={!podeEnviar}
            onClick={() => enviar()}
            className="w-full px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {ocupado === 'enviando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {ocupado === 'enviando' ? 'Enviando...' : `Enviar para os ${info?.destinos.length || 3} destinatários`}
          </button>
        </>
      )}

      {enviado && pdf && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Enviado em {new Date(pdf.dataEnvio!).toLocaleString('pt-BR')}
            <span className="font-mono font-normal text-slate-500 truncate">· {pdf.nomeArquivo}</span>
          </div>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
            {(documento.envio?.destinatarios || []).map((d) => (
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => abrirPdf(`/api/documentos/${documento.id}/assinado`, pdf.nomeArquivo, true).catch((e) => setErro(e.message))}
              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Baixar o PDF assinado
            </button>
            <button type="button" onClick={() => setNovoUpload(true)} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline">
              Subir outro PDF assinado
            </button>
          </div>
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
