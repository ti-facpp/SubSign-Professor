import { Sessao } from './types/index.ts';

const CHAVE_SESSAO = 'subsign.sessao';

// A sessão fica só na aba (sessionStorage): fechar a aba encerra o acesso.
export function lerSessao(): Sessao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const s: Sessao = JSON.parse(bruto);
    return new Date(s.expiraEm).getTime() > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: Sessao | null) {
  try {
    if (sessao) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem armazenamento: a sessão vale só enquanto a página estiver aberta
  }
}

export const EVENTO_SESSAO_EXPIRADA = 'subsign:sessao-expirada';

// fetch com o token da sessão; resposta 401 derruba a sessão.
export async function api(caminho: string, init: RequestInit = {}): Promise<Response> {
  const sessao = lerSessao();
  const headers = new Headers(init.headers);
  if (sessao) headers.set('Authorization', `Bearer ${sessao.token}`);
  const res = await fetch(caminho, { ...init, headers });
  if (res.status === 401 && sessao) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  return res;
}

// PDF protegido por token: baixa como blob e abre/salva no navegador.
export async function abrirPdf(caminho: string, nomeArquivo: string, baixar: boolean): Promise<void> {
  const res = await api(`${caminho}${caminho.includes('?') ? '&' : '?'}download=${baixar ? '1' : '0'}`);
  if (!res.ok) {
    let mensagem = 'Não foi possível abrir o PDF.';
    try {
      mensagem = (await res.json()).error || mensagem;
    } catch {
      // resposta sem JSON
    }
    throw new Error(mensagem);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  if (baixar) a.download = nomeArquivo;
  else a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
