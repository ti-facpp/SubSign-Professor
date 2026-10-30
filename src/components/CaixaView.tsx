import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, FileText, Clock, CheckCircle2, AlertCircle, Search, RefreshCw, Download, Eye, Paperclip, User, GraduationCap, Loader2 } from 'lucide-react';
import { api, abrirPdf } from '../api.ts';
import { Documento, StatusDocumento } from '../types/index.ts';
import { EnviarAssinadoPanel } from './EnviarAssinadoPanel.tsx';

interface CaixaViewProps {
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onContagem: (aguardando: number) => void;
}

type Filtro = 'todos' | 'aguardando' | 'enviados';

const ATUALIZACAO_MS = 30_000;

const formatarData = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const formatarTamanho = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const Selo: React.FC<{ status: StatusDocumento }> = ({ status }) => {
  if (status === 'enviado')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enviado
      </span>
    );
  if (status === 'falha_parcial')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
        <AlertCircle className="w-3 h-3 text-rose-600" /> Envio com falha
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
      <Clock className="w-3 h-3 text-amber-600" /> Aguardando assinatura
    </span>
  );
};

export const CaixaView: React.FC<CaixaViewProps> = ({ onToast, onContagem }) => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('aguardando');
  const [busca, setBusca] = useState('');
  const [erroPdf, setErroPdf] = useState('');

  const carregar = useCallback(async () => {
    try {
      const res = await api('/api/documentos');
      if (!res.ok) return;
      const data = await res.json();
      setDocumentos(data.documentos || []);
      onContagem(data.aguardando || 0);
    } catch (err) {
      console.error('Erro ao buscar documentos', err);
    } finally {
      setCarregando(false);
    }
  }, [onContagem]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, ATUALIZACAO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  const aguardando = documentos.filter((d) => d.status === 'aguardando_assinatura');
  const enviados = documentos.filter((d) => d.status !== 'aguardando_assinatura');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return documentos.filter((d) => {
      if (filtro === 'aguardando' && d.status !== 'aguardando_assinatura') return false;
      if (filtro === 'enviados' && d.status === 'aguardando_assinatura') return false;
      if (!q) return true;
      return [d.pacienteNome, d.alunoNome, d.numero ?? '', d.nomeArquivo].some((t) => t.toLowerCase().includes(q));
    });
  }, [documentos, filtro, busca]);

  const selecionado = documentos.find((d) => d.id === selecionadoId) ?? filtrados[0] ?? null;

  const atualizarDocumento = useCallback(
    (doc: Documento) => {
      setSelecionadoId(doc.id);
      setDocumentos((atual) => atual.map((d) => (d.id === doc.id ? doc : d)));
      onContagem(documentos.filter((d) => (d.id === doc.id ? doc : d).status === 'aguardando_assinatura').length);
    },
    [documentos, onContagem]
  );

  const abrir = (doc: Documento) => {
    setSelecionadoId(doc.id);
    setErroPdf('');
    if (!doc.lido) {
      api(`/api/documentos/${doc.id}/lido`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lido: true }) }).then(() =>
        setDocumentos((atual) => atual.map((d) => (d.id === doc.id ? { ...d, lido: true } : d)))
      );
    }
  };

  const mostrarPdf = (doc: Documento, baixar: boolean) => {
    setErroPdf('');
    abrirPdf(`/api/documentos/${doc.id}/original`, doc.nomeArquivo, baixar).catch((e) => setErroPdf(e.message));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['Recebidos', documentos.length, 'bg-slate-50 border-slate-200/80 text-slate-900', FileText],
            ['Aguardando assinatura', aguardando.length, 'bg-amber-50/60 border-amber-200/80 text-amber-900', Clock],
            ['Enviados', enviados.length, 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900', CheckCircle2],
          ] as const
        ).map(([rotulo, total, cor, Icone]) => (
          <div key={rotulo} className={`p-3 rounded-xl border ${cor}`}>
            <div className="text-[11px] font-medium flex items-center justify-between opacity-80">
              <span>{rotulo}</span>
              <Icone className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-bold font-mono mt-0.5 tabular-nums">{total}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
        {/* Lista */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por paciente, aluno ou número..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => {
                  setCarregando(true);
                  carregar();
                }}
                className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
                title="Atualizar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              {(
                [
                  ['aguardando', `A assinar (${aguardando.length})`, 'bg-amber-600 text-white'],
                  ['enviados', `Enviados (${enviados.length})`, 'bg-emerald-700 text-white'],
                  ['todos', `Todos (${documentos.length})`, 'bg-slate-900 text-white'],
                ] as const
              ).map(([valor, rotulo, ativo]) => (
                <button
                  key={valor}
                  onClick={() => setFiltro(valor)}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${filtro === valor ? ativo : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {carregando && documentos.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : filtrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">{documentos.length === 0 ? 'Nenhum documento recebido ainda' : 'Nenhum documento neste filtro'}</p>
                <p className="text-[11px] mt-1">Os documentos chegam aqui assim que o aluno envia pelo app.</p>
              </div>
            ) : (
              filtrados.map((d) => (
                <div
                  key={d.id}
                  onClick={() => abrir(d)}
                  className={`p-3.5 cursor-pointer text-xs ${
                    selecionado?.id === d.id ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : d.lido ? 'hover:bg-slate-50 text-slate-600' : 'hover:bg-slate-50 font-semibold text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {!d.lido && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Não lido" />}
                      <span className="font-bold text-slate-900 truncate">{d.pacienteNome}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{formatarData(d.recebidoEm)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    Aluno: {d.alunoNome}
                    {d.numero ? ` · ${d.numero}` : ''}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono truncate max-w-[210px]">
                      <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{d.nomeArquivo}</span>
                    </span>
                    <Selo status={d.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {selecionado ? (
            <div>
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{selecionado.pacienteNome}</h2>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {selecionado.disciplinaNome}
                      {selecionado.numero ? ` · ${selecionado.numero}` : ''}
                      {selecionado.tipo ? ` · ${selecionado.tipo}` : ''}
                    </div>
                  </div>
                  <Selo status={selecionado.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1"><User className="w-3 h-3" /> E-mail do paciente (informado pelo aluno)</span>
                    <strong className="font-mono text-emerald-800 break-all">{selecionado.pacienteEmail}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Aluno</span>
                    <strong className="text-slate-800">{selecionado.alunoNome}</strong>
                    {selecionado.alunoRa && <span className="text-slate-500 font-mono text-[11px]"> (RA {selecionado.alunoRa})</span>}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Recebido em {formatarData(selecionado.recebidoEm)}</div>
              </div>

              <div className="p-5 bg-emerald-50/40 border-b border-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  <Paperclip className="w-4 h-4 text-emerald-700" /> 1. Baixe o PDF e assine no Adobe
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 text-xs truncate">{selecionado.nomeArquivo}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatarTamanho(selecionado.tamanhoBytes)} · {selecionado.totalPaginas} pág.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => mostrarPdf(selecionado, true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Baixar PDF original
                    </button>
                    <button onClick={() => mostrarPdf(selecionado, false)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Visualizar
                    </button>
                  </div>
                  {erroPdf && <div className="text-[11px] text-rose-700">{erroPdf}</div>}

                  <EnviarAssinadoPanel key={selecionado.id} documento={selecionado} onAtualizado={atualizarDocumento} onToast={onToast} />
                </div>
              </div>

              <details className="p-5 text-xs">
                <summary className="cursor-pointer font-semibold text-slate-700">Histórico ({selecionado.historico.length})</summary>
                <ul className="mt-3 space-y-2">
                  {[...selecionado.historico].reverse().map((h) => (
                    <li key={h.id} className="border-l-2 border-slate-200 pl-3">
                      <div className="font-semibold text-slate-800">{h.acao}</div>
                      <div className="text-slate-600">{h.detalhes}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{formatarData(h.dataHora)} · {h.autor}</div>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 text-sm">Selecione um documento</p>
              <p className="mt-1">Escolha um item da lista para baixar o PDF e enviar o assinado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
