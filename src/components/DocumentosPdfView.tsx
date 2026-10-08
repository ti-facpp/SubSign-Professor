import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSignature,
  ShieldCheck,
  Clock,
  Eye,
  Download,
  Trash2,
  Search,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { DocumentoPdf, ProfessorProfile } from '../types/index.ts';

const TAMANHO_MAXIMO_MB = 25;

interface DocumentosPdfViewProps {
  currentProfessor: ProfessorProfile | null;
  onRequestLogin: () => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onPendentesChange: (total: number) => void;
}

interface EnvioEmAndamento {
  chave: string;
  nome: string;
  progresso: number;
  erro?: string;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// XHR em vez de fetch para ter o progresso do upload.
function enviarPdf(arquivo: File, enviadoPor: string, onProgresso: (pct: number) => void): Promise<DocumentoPdf> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/documentos');
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('X-Nome-Arquivo', encodeURIComponent(arquivo.name));
    xhr.setRequestHeader('X-Enviado-Por', encodeURIComponent(enviadoPor));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let corpo: any = null;
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {
        // resposta sem JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && corpo?.documento) resolve(corpo.documento);
      else reject(new Error(corpo?.error || `Falha no envio (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Falha de conexão durante o envio'));
    xhr.send(arquivo);
  });
}

export const DocumentosPdfView: React.FC<DocumentosPdfViewProps> = ({
  currentProfessor,
  onRequestLogin,
  onToast,
  onPendentesChange,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoPdf[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [envios, setEnvios] = useState<EnvioEmAndamento[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'assinados'>('todos');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [paraAssinar, setParaAssinar] = useState<DocumentoPdf[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/documentos');
      const data = await res.json();
      setDocumentos(data.documentos || []);
    } catch (err) {
      console.error('Erro ao buscar documentos', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pendentes = documentos.filter((d) => d.status === 'aguardando_assinatura');
  const assinados = documentos.filter((d) => d.status === 'assinado');

  useEffect(() => {
    onPendentesChange(pendentes.length);
  }, [pendentes.length, onPendentesChange]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return documentos.filter((d) => {
      if (filtro === 'pendentes' && d.status !== 'aguardando_assinatura') return false;
      if (filtro === 'assinados' && d.status !== 'assinado') return false;
      if (q && !d.nomeOriginal.toLowerCase().includes(q) && !d.enviadoPor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [documentos, filtro, busca]);

  const processarArquivos = async (lista: FileList | File[]) => {
    const arquivos = Array.from(lista);
    if (arquivos.length === 0) return;

    const enviadoPor = currentProfessor
      ? `${currentProfessor.nome} <${currentProfessor.email}>`
      : 'Professor não identificado';

    const fila: { arquivo: File; envio: EnvioEmAndamento }[] = arquivos.map((arquivo, i) => {
      const chave = `${Date.now()}-${i}-${arquivo.name}`;
      let erro: string | undefined;
      const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
      if (!ehPdf) erro = 'Apenas arquivos PDF são aceitos';
      else if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) erro = `Maior que ${TAMANHO_MAXIMO_MB} MB`;
      return { arquivo, envio: { chave, nome: arquivo.name, progresso: 0, erro } };
    });

    setEnvios((atual) => [...fila.map((f) => f.envio), ...atual]);

    let enviados = 0;
    for (const { arquivo, envio } of fila) {
      if (envio.erro) continue;
      try {
        const doc = await enviarPdf(arquivo, enviadoPor, (pct) =>
          setEnvios((atual) => atual.map((e) => (e.chave === envio.chave ? { ...e, progresso: pct } : e)))
        );
        enviados++;
        setDocumentos((atual) => [doc, ...atual]);
        setEnvios((atual) => atual.filter((e) => e.chave !== envio.chave));
      } catch (err: any) {
        setEnvios((atual) =>
          atual.map((e) => (e.chave === envio.chave ? { ...e, erro: err.message || 'Falha no envio' } : e))
        );
      }
    }

    if (enviados > 0) {
      onToast(enviados === 1 ? 'PDF enviado e pronto para assinatura.' : `${enviados} PDFs enviados e prontos para assinatura.`);
      setFiltro('todos');
    }
    if (enviados < fila.length) {
      onToast('Alguns arquivos não foram enviados. Veja os detalhes na área de upload.', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    processarArquivos(e.dataTransfer.files);
  };

  const handleExcluir = async (doc: DocumentoPdf) => {
    if (!window.confirm(`Excluir "${doc.nomeOriginal}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocumentos((atual) => atual.filter((d) => d.id !== doc.id));
      setSelecionados((atual) => atual.filter((id) => id !== doc.id));
      onToast(data.mensagem, 'info');
    } catch (err: any) {
      onToast(err.message || 'Erro ao excluir documento', 'error');
    }
  };

  const abrirAssinatura = (docs: DocumentoPdf[]) => {
    if (!currentProfessor) {
      onToast('Faça login como docente para assinar documentos.', 'info');
      onRequestLogin();
      return;
    }
    setParaAssinar(docs);
  };

  const alternarSelecao = (id: string) => {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  };

  const selecionadosPendentes = pendentes.filter((d) => selecionados.includes(d.id));

  return (
    <div className="space-y-6">
      {/* 1. Cabeçalho + área de upload */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">Enviar PDFs para Assinatura</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Envie documentos avulsos (laudos, termos, declarações) e assine com seu certificado de docente.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCarregando(true);
              carregar();
            }}
            className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${carregando ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={handleDrop}
            className={`lg:col-span-2 rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              arrastando
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${arrastando ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-emerald-700'}`}>
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {arrastando ? 'Solte os arquivos para enviar' : 'Clique para selecionar ou arraste os PDFs aqui'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Somente arquivos .pdf · até {TAMANHO_MAXIMO_MB} MB cada · vários arquivos de uma vez
              </div>
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg shadow-xs">
              <FileText className="w-3.5 h-3.5" />
              Selecionar PDFs
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processarArquivos(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Contadores */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                <span>Enviados</span>
                <FileText className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">{documentos.length}</div>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <div className="text-[11px] font-medium text-amber-800 flex items-center justify-between">
                <span>Aguardando assinatura</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-900 mt-0.5 tabular-nums">{pendentes.length}</div>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
              <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
                <span>Assinados</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-900 mt-0.5 tabular-nums">{assinados.length}</div>
            </div>
          </div>
        </div>

        {/* Uploads em andamento / com erro */}
        {envios.length > 0 && (
          <div className="space-y-2">
            {envios.map((envio) => (
              <div
                key={envio.chave}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
                  envio.erro ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {envio.erro ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                )}
                <span className="font-medium text-slate-800 truncate flex-1">{envio.nome}</span>
                {envio.erro ? (
                  <>
                    <span className="text-rose-700 font-medium">{envio.erro}</span>
                    <button
                      onClick={() => setEnvios((atual) => atual.filter((e) => e.chave !== envio.chave))}
                      className="p-0.5 text-rose-400 hover:text-rose-700"
                      title="Dispensar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="w-32 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 transition-all" style={{ width: `${envio.progresso}%` }} />
                    </div>
                    <span className="font-mono text-slate-500 w-8 text-right">{envio.progresso}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Barra de filtros e ações em lote */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              ['todos', `Todos (${documentos.length})`, 'bg-slate-900 text-white'],
              ['pendentes', `A assinar (${pendentes.length})`, 'bg-amber-600 text-white'],
              ['assinados', `Assinados (${assinados.length})`, 'bg-emerald-700 text-white'],
            ] as const
          ).map(([valor, rotulo, ativo]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-colors ${
                filtro === valor ? ativo : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {selecionadosPendentes.length > 0 ? (
            <button
              onClick={() => abrirAssinatura(selecionadosPendentes)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Assinar selecionados ({selecionadosPendentes.length})
            </button>
          ) : (
            pendentes.length > 1 && (
              <button
                onClick={() => abrirAssinatura(pendentes)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-900 border border-emerald-300 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Assinar todos ({pendentes.length})
              </button>
            )
          )}
        </div>
      </div>

      {/* 3. Grade de documentos */}
      {carregando && documentos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center text-xs text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando documentos...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          {documentos.length === 0
            ? 'Nenhum PDF enviado ainda. Use a área acima para enviar o primeiro documento.'
            : 'Nenhum documento corresponde ao filtro selecionado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((doc) => {
            const assinado = doc.status === 'assinado';
            const selecionado = selecionados.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`bg-white rounded-2xl border shadow-xs p-4 flex flex-col gap-3 transition-colors ${
                  selecionado ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      assinado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate" title={doc.nomeOriginal}>
                      {doc.nomeOriginal}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      {formatarTamanho(doc.tamanhoBytes)} · {doc.totalPaginas} pág. · {formatarData(doc.dataEnvio)}
                    </div>
                  </div>
                  {!assinado && (
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => alternarSelecao(doc.id)}
                      className="mt-1 w-4 h-4 accent-emerald-700 cursor-pointer"
                      title="Selecionar para assinatura em lote"
                    />
                  )}
                </div>

                <div className="text-[11px] text-slate-500 truncate" title={doc.enviadoPor}>
                  Enviado por <span className="text-slate-700 font-medium">{doc.enviadoPor}</span>
                </div>

                {assinado && doc.assinatura ? (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5" /> Assinado em {formatarData(doc.assinatura.dataAssinatura)}
                    </div>
                    <div className="text-emerald-900 truncate">{doc.assinatura.signatarioNome}</div>
                    <div className="font-mono text-emerald-700">{doc.assinatura.codigoVerificacao}</div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] flex items-center gap-1.5 font-semibold text-amber-800">
                    <Clock className="w-3.5 h-3.5" /> Aguardando sua assinatura
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-auto pt-1">
                  <a
                    href={`/api/documentos/${doc.id}/arquivo${assinado ? '?versao=assinado' : ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </a>
                  {assinado ? (
                    <a
                      href={`/api/documentos/${doc.id}/arquivo?versao=assinado&download=1`}
                      className="flex-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar assinado
                    </a>
                  ) : (
                    <button
                      onClick={() => abrirAssinatura([doc])}
                      className="flex-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center justify-center gap-1"
                    >
                      <FileSignature className="w-3.5 h-3.5" /> Assinar
                    </button>
                  )}
                  <button
                    onClick={() => handleExcluir(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paraAssinar.length > 0 && currentProfessor && (
        <AssinarDocumentosModal
          documentos={paraAssinar}
          professor={currentProfessor}
          onClose={() => setParaAssinar([])}
          onAssinado={(doc) => {
            setDocumentos((atual) => atual.map((d) => (d.id === doc.id ? doc : d)));
            setSelecionados((atual) => atual.filter((id) => id !== doc.id));
          }}
          onConcluido={(total) => {
            if (total > 0) onToast(total === 1 ? 'Documento assinado com sucesso.' : `${total} documentos assinados com sucesso.`);
          }}
        />
      )}
    </div>
  );
};

interface AssinarDocumentosModalProps {
  documentos: DocumentoPdf[];
  professor: ProfessorProfile;
  onClose: () => void;
  onAssinado: (doc: DocumentoPdf) => void;
  onConcluido: (total: number) => void;
}

type ResultadoAssinatura = { estado: 'aguardando' | 'assinando' | 'ok' | 'erro'; erro?: string };

const AssinarDocumentosModal: React.FC<AssinarDocumentosModalProps> = ({
  documentos,
  professor,
  onClose,
  onAssinado,
  onConcluido,
}) => {
  const [pin, setPin] = useState('');
  const [erroPin, setErroPin] = useState('');
  const [fase, setFase] = useState<'confirmar' | 'assinando' | 'fim'>('confirmar');
  const [resultados, setResultados] = useState<Record<string, ResultadoAssinatura>>({});

  const handleAssinar = async () => {
    if (pin.trim().length < 4) {
      setErroPin('Digite o PIN do certificado (mínimo de 4 dígitos).');
      return;
    }
    setErroPin('');
    setFase('assinando');

    let total = 0;
    for (const doc of documentos) {
      setResultados((r) => ({ ...r, [doc.id]: { estado: 'assinando' } }));
      try {
        const res = await fetch(`/api/documentos/${doc.id}/assinar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin,
            signatario: { nome: professor.nome, email: professor.email, registro: professor.cro_crm },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha na assinatura');
        total++;
        onAssinado(data.documento);
        setResultados((r) => ({ ...r, [doc.id]: { estado: 'ok' } }));
      } catch (err: any) {
        setResultados((r) => ({ ...r, [doc.id]: { estado: 'erro', erro: err.message } }));
      }
    }
    setFase('fim');
    onConcluido(total);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Assinar {documentos.length === 1 ? 'documento' : `${documentos.length} documentos`}
              </h3>
              <p className="text-[11px] text-emerald-200">Faixa de assinatura em cada página + manifesto final</p>
            </div>
          </div>
          {fase !== 'assinando' && (
            <button onClick={onClose} className="p-1 text-emerald-200 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 text-xs space-y-4">
          <div className="max-h-56 overflow-y-auto space-y-1.5">
            {documentos.map((doc) => {
              const r = resultados[doc.id];
              return (
                <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {!r || r.estado === 'aguardando' ? (
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : r.estado === 'assinando' ? (
                    <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                  ) : r.estado === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="truncate flex-1 font-medium text-slate-800">{doc.nomeOriginal}</span>
                  {r?.estado === 'erro' && <span className="text-rose-700 shrink-0">{r.erro}</span>}
                  {r?.estado !== 'erro' && <span className="text-slate-400 font-mono shrink-0">{doc.totalPaginas} pág.</span>}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-0.5">
            <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Signatário</div>
            <div className="font-bold text-slate-900">{professor.nome}</div>
            <div className="text-slate-600 font-mono">
              {professor.cro_crm} · {professor.email}
            </div>
          </div>

          {fase === 'confirmar' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> PIN do certificado
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAssinar()}
                placeholder="••••"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {erroPin && <div className="text-rose-700 font-medium">{erroPin}</div>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {fase === 'confirmar' && (
              <>
                <button onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={handleAssinar}
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Assinar agora
                </button>
              </>
            )}
            {fase === 'assinando' && (
              <span className="px-4 py-2 text-slate-500 flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Assinando...
              </span>
            )}
            {fase === 'fim' && (
              <button onClick={onClose} className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg">
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
