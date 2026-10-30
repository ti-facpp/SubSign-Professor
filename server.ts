import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { PDFDocument } from 'pdf-lib';
import { Documento, EmailDestinatario, Sessao } from './src/types/index.ts';
import { DISCIPLINAS, buscarDisciplina } from './disciplinas.ts';
import { resolverDestinos, emailValido } from './destinos.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Atrás do proxy reverso do Docker: usa o IP real do cliente (limite de tentativas de login).
app.set('trust proxy', 1);

// O app do aluno manda o PDF em base64 dentro do JSON: essa rota precisa de um limite maior.
const TAMANHO_MAXIMO_PDF = 25 * 1024 * 1024;
app.use('/api/recebimento', express.json({ limit: '40mb' }));
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------------------------
// Armazenamento em disco (volume do Docker em DATA_DIR). Nada de dados de exemplo: o app começa vazio.
// ---------------------------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const RECEBIDOS_DIR = path.join(DATA_DIR, 'recebidos'); // PDF original vindo do app do aluno
const ASSINADOS_DIR = path.join(DATA_DIR, 'assinados'); // PDF assinado no Adobe, subido pelo professor
const INDICE = path.join(DATA_DIR, 'recebidos.json');
const ACESSOS_ARQ = path.join(DATA_DIR, 'acessos.json');

fs.mkdirSync(RECEBIDOS_DIR, { recursive: true });
fs.mkdirSync(ASSINADOS_DIR, { recursive: true });

function gravarJson(arquivo: string, dados: unknown) {
  const temp = `${arquivo}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(dados, null, 2));
  fs.renameSync(temp, arquivo);
}

let documentosDb: Documento[] = [];
try {
  documentosDb = JSON.parse(fs.readFileSync(INDICE, 'utf8'));
} catch {
  documentosDb = [];
}
console.log(`[Documentos] ${documentosDb.length} documento(s) carregado(s) de ${DATA_DIR}`);

const salvarIndice = () => gravarJson(INDICE, documentosDb);
const caminhoOriginal = (id: string) => path.join(RECEBIDOS_DIR, `${id}.pdf`);
const caminhoAssinado = (id: string) => path.join(ASSINADOS_DIR, `${id}.pdf`);
const ID_RE = /^doc-[a-z0-9-]+$/;

const sha256 = (dados: Uint8Array) => crypto.createHash('sha256').update(dados).digest('hex');
const texto = (valor: unknown, max: number) =>
  typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ').slice(0, max) : '';
const formatarDataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function evento(doc: Documento, autor: string, acao: string, detalhes: string) {
  doc.historico.push({ id: `evt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`, dataHora: new Date().toISOString(), autor, acao, detalhes });
}

function contarOcorrencias(dados: Buffer, trecho: string): number {
  let total = 0;
  let pos = dados.indexOf(trecho);
  while (pos !== -1) {
    total++;
    pos = dados.indexOf(trecho, pos + trecho.length);
  }
  return total;
}

// ---------------------------------------------------------------------------------------------
// Envio de e-mails via SMTP
// Sem SMTP_HOST/SMTP_USER/SMTP_PASS o envio é apenas simulado (desenvolvimento).
// EMAIL_REDIRECIONAR_PARA desvia TODAS as mensagens para um único endereço (modo de teste).
// ---------------------------------------------------------------------------------------------
const smtpConfigurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const smtpPorta = Number(process.env.SMTP_PORT || 465);
const emailRemetente = process.env.SMTP_FROM || `SubSign Professor FACPP <${process.env.SMTP_USER}>`;
const emailRedirecionarPara = (process.env.EMAIL_REDIRECIONAR_PARA || '').trim();

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPorta,
      secure: smtpPorta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

console.log(
  smtpConfigurado
    ? `[SMTP] Envio real via ${process.env.SMTP_HOST}:${smtpPorta}` +
        (emailRedirecionarPara ? ` (MODO TESTE: tudo redirecionado para ${emailRedirecionarPara})` : '')
    : '[SMTP] Não configurado — envio de e-mails simulado.'
);

interface AnexoEmail {
  filename: string;
  path: string;
}

function escaparHtml(valor: string): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nunca lança: o resultado vira o status do destinatário.
async function enviarEmail(para: string, assunto: string, html: string, anexos: AnexoEmail[] = []) {
  if (!transporter) return { ok: true, mensagemId: `MSG-SIMULADO-${Date.now()}`, erro: '' };

  const destino = emailRedirecionarPara || para;
  const assuntoFinal = emailRedirecionarPara ? `[TESTE → ${para}] ${assunto}` : assunto;
  const aviso = emailRedirecionarPara
    ? `<p style="background:#fef3c7;padding:8px;border-radius:4px;font-size:12px">
         Modo de teste: esta mensagem seria enviada para <b>${escaparHtml(para)}</b>.</p>`
    : '';
  try {
    const info = await transporter.sendMail({
      from: emailRemetente,
      to: destino,
      subject: assuntoFinal,
      html: aviso + html,
      attachments: anexos.map((a) => ({ filename: a.filename, path: a.path, contentType: 'application/pdf' })),
    });
    return { ok: true, mensagemId: String(info.messageId), erro: '' };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    console.error(`[SMTP] Falha ao enviar para ${destino}: ${erro}`);
    return { ok: false, mensagemId: '', erro };
  }
}

function estadoEmail() {
  return {
    smtpAtivo: Boolean(transporter),
    modoTeste: Boolean(transporter && emailRedirecionarPara),
    redirecionarPara: transporter && emailRedirecionarPara ? emailRedirecionarPara : null,
  };
}

function htmlDocumentoAssinado(doc: Documento, nomeDestinatario: string): string {
  const linha = (rotulo: string, valor: string) =>
    `<tr><td style="padding:4px 12px 4px 0"><b>${rotulo}</b></td><td>${escaparHtml(valor)}</td></tr>`;
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px">
      <h2 style="color:#047857">Documento clínico assinado</h2>
      <p>Olá, ${escaparHtml(nomeDestinatario)}.</p>
      <p>O documento abaixo foi conferido e assinado digitalmente pelo professor responsável. O PDF assinado segue em anexo.</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${doc.numero ? linha('Documento', doc.numero) : ''}
        ${linha('Paciente', doc.pacienteNome)}
        ${doc.alunoNome ? linha('Aluno', doc.alunoNome) : ''}
        ${linha('Disciplina', doc.disciplinaNome)}
        ${linha('Assinado por', doc.pdfAssinado?.enviadoPor ?? '')}
        ${linha('Data do envio', formatarDataHora(new Date().toISOString()))}
        <tr><td style="padding:4px 12px 4px 0"><b>SHA-256</b></td><td style="font-family:monospace;font-size:12px">${escaparHtml(doc.pdfAssinado?.hashSha256 ?? '')}</td></tr>
      </table>
      <p style="font-size:12px;color:#64748b;margin-top:24px">Mensagem automática do SubSign Professor — FACPP. Não responda este e-mail.</p>
    </div>`;
}

const assuntoDocumento = (doc: Documento) =>
  `Documento assinado — ${doc.disciplinaNome}${doc.numero ? ` (${doc.numero})` : ''} — FACPP`;

async function enviarParaDestinatario(dest: EmailDestinatario, doc: Documento): Promise<void> {
  const anexos: AnexoEmail[] = doc.pdfAssinado
    ? [{ filename: doc.pdfAssinado.nomeArquivo, path: caminhoAssinado(doc.id) }]
    : [];
  const resultado = await enviarEmail(dest.email, assuntoDocumento(doc), htmlDocumentoAssinado(doc, dest.nome), anexos);
  dest.tentativas += 1;
  dest.dataHoraEnvio = new Date().toISOString();
  if (resultado.ok) {
    dest.status = 'entregue';
    dest.mensagemId = resultado.mensagemId;
    delete dest.erroMotivo;
  } else {
    dest.status = 'falha';
    dest.erroMotivo = resultado.erro;
  }
}

function atualizarStatus(doc: Documento) {
  const dests = doc.envio?.destinatarios ?? [];
  const falhas = dests.filter((d) => d.status === 'falha').length;
  if (dests.length === 0 || falhas === dests.length) doc.status = 'aguardando_assinatura';
  else doc.status = falhas > 0 ? 'falha_parcial' : 'enviado';
}

// ---------------------------------------------------------------------------------------------
// Acesso por disciplina: cada disciplina tem um código próprio. Quem entra com o código da
// Clínica Integrada II só vê e só envia documentos da Clínica Integrada II.
// ---------------------------------------------------------------------------------------------
interface Acesso {
  salt: string;
  hash: string;
}

let acessos: Record<string, Acesso> = {};
try {
  acessos = JSON.parse(fs.readFileSync(ACESSOS_ARQ, 'utf8'));
} catch {
  acessos = {};
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L para não confundir ao digitar
const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCodigo = (codigo: string, salt: string) =>
  crypto.scryptSync(normalizarCodigo(codigo), salt, 32).toString('hex');

function gerarCodigo(): string {
  const letras = Array.from({ length: 8 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');
  return `${letras.slice(0, 4)}-${letras.slice(4)}`;
}

function conferirCodigo(codigo: string, acesso: Acesso | undefined): boolean {
  if (!acesso) return false;
  const a = Buffer.from(hashCodigo(codigo, acesso.salt), 'hex');
  const b = Buffer.from(acesso.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function definirCodigo(email: string, codigo: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  acessos[email] = { salt, hash: hashCodigo(codigo, salt) };
}

// DISCIPLINAS_CODIGOS (JSON {"email": "código"}) define/atualiza códigos. Disciplina sem código
// recebe um gerado ao iniciar, impresso UMA vez no log do servidor (só o hash fica gravado).
function iniciarAcessos() {
  let fixos: Record<string, unknown> = {};
  try {
    if (process.env.DISCIPLINAS_CODIGOS) fixos = JSON.parse(process.env.DISCIPLINAS_CODIGOS);
  } catch {
    console.error('[Acessos] DISCIPLINAS_CODIGOS não é um JSON válido; ignorado.');
  }
  let mudou = false;
  for (const d of DISCIPLINAS) {
    const fixo = fixos[d.email];
    if (typeof fixo === 'string' && normalizarCodigo(fixo).length >= 6) {
      if (!conferirCodigo(fixo, acessos[d.email])) {
        definirCodigo(d.email, fixo);
        mudou = true;
      }
    } else if (!acessos[d.email]) {
      const codigo = gerarCodigo();
      definirCodigo(d.email, codigo);
      mudou = true;
      console.log(`[Acessos] Código gerado para ${d.email}: ${codigo}  (anote agora; não será mostrado de novo)`);
    }
  }
  if (mudou) gravarJson(ACESSOS_ARQ, acessos);
}
iniciarAcessos();

const SESSAO_MS = 12 * 60 * 60 * 1000;
const sessoes = new Map<string, Sessao>();

// Limite de tentativas: 5 erros por IP+disciplina bloqueiam 10 minutos; 30 erros na disciplina, 10 minutos.
const falhasLogin = new Map<string, { falhas: number; bloqueadoAte: number }>();
const LIMITES: [number, number][] = [[5, 10 * 60 * 1000], [30, 10 * 60 * 1000]];

function bloqueado(chaves: string[]): number {
  const agora = Date.now();
  return Math.max(0, ...chaves.map((c) => (falhasLogin.get(c)?.bloqueadoAte ?? 0) - agora));
}

function registrarFalha(chaves: string[]) {
  chaves.forEach((chave, i) => {
    const reg = falhasLogin.get(chave) ?? { falhas: 0, bloqueadoAte: 0 };
    reg.falhas += 1;
    if (reg.falhas >= LIMITES[i][0]) {
      reg.bloqueadoAte = Date.now() + LIMITES[i][1];
      reg.falhas = 0;
    }
    falhasLogin.set(chave, reg);
  });
}

app.get('/api/disciplinas', (_req: Request, res: Response) => {
  res.json(DISCIPLINAS);
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { disciplinaEmail, codigo, professor } = req.body || {};
  const disciplina = buscarDisciplina(disciplinaEmail);
  const nome = texto(professor, 120);
  if (!disciplina || typeof codigo !== 'string' || !codigo.trim()) {
    return res.status(400).json({ error: 'Escolha a disciplina e informe o código de acesso.' });
  }
  if (nome.length < 3) return res.status(400).json({ error: 'Informe o seu nome completo.' });

  const chaves = [`${req.ip}|${disciplina.email}`, `*|${disciplina.email}`];
  const espera = bloqueado(chaves);
  if (espera > 0) {
    return res.status(429).json({ error: `Muitas tentativas. Aguarde ${Math.ceil(espera / 60000)} min e tente de novo.` });
  }
  if (!conferirCodigo(codigo, acessos[disciplina.email])) {
    registrarFalha(chaves);
    return res.status(401).json({ error: 'Código de acesso inválido para esta disciplina.' });
  }

  for (const [token, s] of sessoes) if (new Date(s.expiraEm).getTime() < Date.now()) sessoes.delete(token);
  const sessao: Sessao = {
    token: crypto.randomBytes(32).toString('hex'),
    disciplinaEmail: disciplina.email,
    disciplinaNome: disciplina.nome,
    professor: nome,
    expiraEm: new Date(Date.now() + SESSAO_MS).toISOString(),
  };
  sessoes.set(sessao.token, sessao);
  res.json({ sessao });
});

function exigirSessao(req: Request, res: Response, next: NextFunction) {
  const cabecalho = String(req.headers.authorization || '');
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  const sessao = sessoes.get(token);
  if (!sessao || new Date(sessao.expiraEm).getTime() < Date.now()) {
    sessoes.delete(token);
    return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
  (req as any).sessao = sessao;
  next();
}

app.post('/api/auth/logout', exigirSessao, (req: Request, res: Response) => {
  sessoes.delete((req as any).sessao.token);
  res.json({ sucesso: true });
});

// ---------------------------------------------------------------------------------------------
// Recebimento: o app do aluno envia o documento (PDF + dados) para cá. O e-mail do paciente
// chega junto, digitado pelo aluno, e fica preso ao documento: o professor nunca digita nem troca.
// ---------------------------------------------------------------------------------------------
const tokenRecebimento = (process.env.RECEBIMENTO_TOKEN || '').trim();
if (!tokenRecebimento) console.warn('[Recebimento] RECEBIMENTO_TOKEN não definido: o app do aluno não consegue enviar documentos.');

function tokenConfere(recebido: unknown): boolean {
  if (typeof recebido !== 'string' || !tokenRecebimento) return false;
  const a = crypto.createHash('sha256').update(recebido).digest();
  const b = crypto.createHash('sha256').update(tokenRecebimento).digest();
  return crypto.timingSafeEqual(a, b);
}

app.post('/api/recebimento', async (req: Request, res: Response) => {
  if (!tokenRecebimento) {
    return res.status(503).json({ error: 'Recebimento desativado: defina RECEBIMENTO_TOKEN no servidor.' });
  }
  if (!tokenConfere(req.headers['x-api-key'])) return res.status(401).json({ error: 'Chave de API inválida.' });

  const b = req.body || {};
  const disciplina = buscarDisciplina(b.disciplinaEmail);
  if (!disciplina) {
    return res.status(422).json({
      error: 'disciplinaEmail inválido. Use exatamente um dos e-mails das disciplinas.',
      disciplinasValidas: DISCIPLINAS.map((d) => d.email),
    });
  }
  const pacienteNome = texto(b.pacienteNome, 150);
  const alunoNome = texto(b.alunoNome, 150);
  const pacienteEmail = texto(b.pacienteEmail, 254).toLowerCase();
  if (pacienteNome.length < 2) return res.status(422).json({ error: 'pacienteNome é obrigatório.' });
  if (alunoNome.length < 2) return res.status(422).json({ error: 'alunoNome é obrigatório.' });
  if (!emailValido(pacienteEmail)) return res.status(422).json({ error: 'pacienteEmail ausente ou inválido.' });

  const idExterno = texto(b.idExterno, 100) || undefined;
  if (idExterno) {
    const existente = documentosDb.find((d) => d.idExterno === idExterno);
    if (existente) return res.status(200).json({ sucesso: true, duplicado: true, id: existente.id });
  }

  if (typeof b.pdfBase64 !== 'string' || !b.pdfBase64) return res.status(422).json({ error: 'pdfBase64 é obrigatório.' });
  const dados = Buffer.from(b.pdfBase64, 'base64');
  if (dados.length === 0 || dados.length > TAMANHO_MAXIMO_PDF) {
    return res.status(422).json({ error: `O PDF deve ter até ${TAMANHO_MAXIMO_PDF / 1024 / 1024} MB.` });
  }
  if (dados.subarray(0, 1024).indexOf('%PDF-') === -1) return res.status(422).json({ error: 'pdfBase64 não é um PDF válido.' });
  let totalPaginas: number;
  try {
    totalPaginas = (await PDFDocument.load(dados, { ignoreEncryption: true })).getPageCount();
  } catch {
    return res.status(422).json({ error: 'Não foi possível ler o PDF enviado.' });
  }

  const nomeArquivo =
    path.basename(texto(b.nomeArquivo, 200) || `documento-${pacienteNome}`).replace(/[\\/:*?"<>|]/g, '_').replace(/\.pdf$/i, '') + '.pdf';
  const doc: Documento = {
    id: `doc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    idExterno,
    numero: texto(b.numero, 60) || undefined,
    tipo: texto(b.tipo, 60) || undefined,
    recebidoEm: new Date().toISOString(),
    disciplinaEmail: disciplina.email,
    disciplinaNome: disciplina.nome,
    pacienteNome,
    pacienteEmail,
    alunoNome,
    alunoRa: texto(b.alunoRa, 40) || undefined,
    nomeArquivo,
    tamanhoBytes: dados.length,
    totalPaginas,
    hashSha256: sha256(dados),
    lido: false,
    status: 'aguardando_assinatura',
    historico: [],
  };
  evento(doc, `${alunoNome} (app do aluno)`, 'Documento recebido', `Paciente ${pacienteNome} <${pacienteEmail}>, disciplina ${disciplina.nome}.`);

  fs.writeFileSync(caminhoOriginal(doc.id), dados);
  documentosDb.push(doc);
  salvarIndice();
  res.status(201).json({ sucesso: true, id: doc.id });
});

// ---------------------------------------------------------------------------------------------
// Área do professor (tudo restrito à disciplina da sessão)
// ---------------------------------------------------------------------------------------------
function docDaSessao(req: Request, res: Response): Documento | undefined {
  const sessao = (req as any).sessao as Sessao;
  const id = String(req.params.id);
  const doc = ID_RE.test(id) ? documentosDb.find((d) => d.id === id && d.disciplinaEmail === sessao.disciplinaEmail) : undefined;
  if (!doc) res.status(404).json({ error: 'Documento não encontrado nesta disciplina.' });
  return doc;
}

function enviarPdf(res: Response, caminho: string, nome: string, baixar: boolean) {
  if (!fs.existsSync(caminho)) return res.status(404).json({ error: 'Arquivo não localizado no armazenamento.' });
  const nomeAscii = nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${baixar ? 'attachment' : 'inline'}; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nome)}`);
  fs.createReadStream(caminho).pipe(res);
}

app.get('/api/email/estado', exigirSessao, (_req: Request, res: Response) => {
  res.json(estadoEmail());
});

app.get('/api/documentos', exigirSessao, (req: Request, res: Response) => {
  const sessao = (req as any).sessao as Sessao;
  const documentos = documentosDb
    .filter((d) => d.disciplinaEmail === sessao.disciplinaEmail)
    .sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm));
  res.json({
    total: documentos.length,
    aguardando: documentos.filter((d) => d.status === 'aguardando_assinatura').length,
    naoLidos: documentos.filter((d) => !d.lido).length,
    documentos,
  });
});

app.get('/api/documentos/:id', exigirSessao, (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (doc) res.json(doc);
});

app.put('/api/documentos/:id/lido', exigirSessao, (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  doc.lido = req.body?.lido !== false;
  salvarIndice();
  res.json({ sucesso: true, lido: doc.lido });
});

app.get('/api/documentos/:id/original', exigirSessao, (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  if (req.query.download === '1' && !doc.historico.some((h) => h.acao === 'PDF original baixado')) {
    evento(doc, (req as any).sessao.professor, 'PDF original baixado', doc.nomeArquivo);
    salvarIndice();
  }
  enviarPdf(res, caminhoOriginal(doc.id), doc.nomeArquivo, req.query.download === '1');
});

app.get('/api/documentos/:id/assinado', exigirSessao, (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  if (!doc.pdfAssinado) return res.status(409).json({ error: 'Este documento ainda não tem PDF assinado.' });
  enviarPdf(res, caminhoAssinado(doc.id), doc.pdfAssinado.nomeArquivo, req.query.download === '1');
});

// Para quem o envio vai sair (o professor confere antes de enviar)
app.get('/api/documentos/:id/destinos', exigirSessao, (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  const { destinos, avisos } = resolverDestinos(doc);
  res.json({ destinos, avisos, ...estadoEmail() });
});

// Cabeçalho de texto enviado com encodeURIComponent (nomes com acento).
function cabecalho(req: Request, nome: string, max: number): string {
  const bruto = req.headers[nome];
  if (typeof bruto !== 'string' || !bruto) return '';
  try {
    return texto(decodeURIComponent(bruto), max);
  } catch {
    return '';
  }
}

function nomeArquivoPdf(req: Request): string {
  const nome = path.basename(cabecalho(req, 'x-nome-arquivo', 200) || 'documento-assinado.pdf').replace(/[\\/:*?"<>|]/g, '_');
  return /\.pdf$/i.test(nome) ? nome : `${nome}.pdf`;
}

// Valida o corpo binário de um upload de PDF; responde o erro e devolve null quando não serve.
async function lerPdfEnviado(req: Request, res: Response): Promise<{ dados: Buffer; totalPaginas: number } | null> {
  const dados: unknown = req.body;
  if (!Buffer.isBuffer(dados) || dados.length === 0) {
    res.status(400).json({ error: 'Nenhum arquivo PDF recebido.' });
    return null;
  }
  if (dados.subarray(0, 1024).indexOf('%PDF-') === -1) {
    res.status(415).json({ error: 'O arquivo enviado não é um PDF válido.' });
    return null;
  }
  try {
    return { dados, totalPaginas: (await PDFDocument.load(dados, { ignoreEncryption: true })).getPageCount() };
  } catch {
    res.status(422).json({ error: 'Não foi possível ler o PDF. O arquivo pode estar corrompido.' });
    return null;
  }
}

// Envio avulso: o professor sobe um PDF já assinado no Adobe sem que o documento tenha vindo do
// app do aluno, e informa o paciente. Vira um documento normal da disciplina da sessão; como não
// há original para comparar, o envio sempre pede a confirmação "Conferi" do professor.
app.post(
  '/api/documentos/avulso',
  exigirSessao,
  express.raw({ type: 'application/pdf', limit: TAMANHO_MAXIMO_PDF }),
  async (req: Request, res: Response) => {
    const sessao = (req as any).sessao as Sessao;
    const pacienteNome = cabecalho(req, 'x-paciente-nome', 150);
    const pacienteEmail = cabecalho(req, 'x-paciente-email', 254).toLowerCase();
    if (pacienteNome.length < 2) return res.status(422).json({ error: 'Informe o nome do paciente.' });
    if (!emailValido(pacienteEmail)) return res.status(422).json({ error: 'Informe um e-mail válido do paciente.' });

    const pdf = await lerPdfEnviado(req, res);
    if (!pdf) return;
    const { dados, totalPaginas } = pdf;

    const nomeArquivo = nomeArquivoPdf(req);
    const agora = new Date().toISOString();
    const temAssinaturaDigital = contarOcorrencias(dados, '/ByteRange') > 0;
    const doc: Documento = {
      id: `doc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      origem: 'avulso',
      numero: cabecalho(req, 'x-numero', 60) || undefined,
      recebidoEm: agora,
      disciplinaEmail: sessao.disciplinaEmail,
      disciplinaNome: sessao.disciplinaNome,
      pacienteNome,
      pacienteEmail,
      alunoNome: cabecalho(req, 'x-aluno-nome', 150),
      nomeArquivo,
      tamanhoBytes: dados.length,
      totalPaginas,
      hashSha256: sha256(dados),
      lido: true,
      status: 'aguardando_assinatura',
      pdfAssinado: {
        nomeArquivo,
        tamanhoBytes: dados.length,
        totalPaginas,
        hashSha256: sha256(dados),
        dataUpload: agora,
        enviadoPor: `${sessao.professor} (${sessao.disciplinaNome})`,
        conferencia: 'avulso',
        temAssinaturaDigital,
      },
      historico: [],
    };
    evento(
      doc,
      sessao.professor,
      'PDF assinado enviado avulso',
      `${nomeArquivo} (${totalPaginas} pág.). Paciente ${pacienteNome} <${pacienteEmail}> informado pelo professor; assinatura digital: ${temAssinaturaDigital ? 'sim' : 'não encontrada'}.`
    );

    // Sem original do aluno: o próprio PDF assinado serve de "original" para baixar/visualizar.
    fs.writeFileSync(caminhoOriginal(doc.id), dados);
    fs.writeFileSync(caminhoAssinado(doc.id), dados);
    documentosDb.push(doc);
    salvarIndice();

    const { avisos } = resolverDestinos(doc);
    if (!temAssinaturaDigital) avisos.push('Não encontrei assinatura digital neste PDF. Confira se ele foi assinado antes de enviar.');
    res.status(201).json({ sucesso: true, documento: doc, avisos });
  }
);

// O professor sobe o PDF assinado no Adobe (corpo binário; nome no cabeçalho X-Nome-Arquivo).
// Os bytes são guardados exatamente como chegaram para não invalidar a assinatura.
app.post(
  '/api/documentos/:id/pdf-assinado',
  exigirSessao,
  express.raw({ type: 'application/pdf', limit: TAMANHO_MAXIMO_PDF }),
  async (req: Request, res: Response) => {
    const doc = docDaSessao(req, res);
    if (!doc) return;
    const sessao = (req as any).sessao as Sessao;

    const pdf = await lerPdfEnviado(req, res);
    if (!pdf) return;
    const { dados, totalPaginas } = pdf;
    const avulso = doc.origem === 'avulso';

    const original = fs.readFileSync(caminhoOriginal(doc.id));
    if (!avulso && dados.equals(original)) {
      return res.status(422).json({ error: 'Este PDF é idêntico ao original recebido: ele ainda não foi assinado.' });
    }

    const identico = !avulso && dados.length >= original.length && dados.subarray(0, original.length).equals(original);
    const temAssinaturaDigital = avulso
      ? contarOcorrencias(dados, '/ByteRange') > 0
      : contarOcorrencias(dados, '/ByteRange') > contarOcorrencias(original, '/ByteRange');
    const nomeArquivo = nomeArquivoPdf(req);

    fs.writeFileSync(caminhoAssinado(doc.id), dados);
    if (avulso) fs.writeFileSync(caminhoOriginal(doc.id), dados);
    doc.pdfAssinado = {
      nomeArquivo,
      tamanhoBytes: dados.length,
      totalPaginas,
      hashSha256: sha256(dados),
      dataUpload: new Date().toISOString(),
      enviadoPor: `${sessao.professor} (${sessao.disciplinaNome})`,
      conferencia: avulso ? 'avulso' : identico ? 'identico' : 'divergente',
      temAssinaturaDigital,
    };
    evento(
      doc,
      sessao.professor,
      'PDF assinado recebido',
      avulso
        ? `${nomeArquivo} (${totalPaginas} pág.). Envio avulso; assinatura digital: ${temAssinaturaDigital ? 'sim' : 'não encontrada'}.`
        : `${nomeArquivo} (${totalPaginas} pág.). Conferência com o original: ${identico ? 'idêntico' : 'divergente'}; assinatura digital nova: ${temAssinaturaDigital ? 'sim' : 'não'}.`
    );
    salvarIndice();

    const avisos: string[] = [];
    if (!avulso && !identico) {
      avisos.push(
        `Não consegui confirmar que este PDF é o mesmo documento recebido (o Adobe pode ter regravado o arquivo). Confira se é do paciente ${doc.pacienteNome}.`
      );
    }
    if (!temAssinaturaDigital) {
      avisos.push('Não encontrei uma assinatura digital nova neste PDF. Confira se ele foi assinado antes de enviar.');
    }
    res.status(201).json({ sucesso: true, pdfAssinado: doc.pdfAssinado, avisos, requerConfirmacao: avulso || avisos.length > 0 });
  }
);

const enviosEmAndamento = new Set<string>();

app.post('/api/documentos/:id/enviar', exigirSessao, async (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  const sessao = (req as any).sessao as Sessao;
  const pdf = doc.pdfAssinado;
  if (!pdf || !fs.existsSync(caminhoAssinado(doc.id))) return res.status(409).json({ error: 'Suba o PDF assinado antes de enviar.' });
  if (enviosEmAndamento.has(doc.id)) return res.status(409).json({ error: 'O envio deste documento já está em andamento.' });

  const { confirmarConferencia, confirmarReenvio } = req.body || {};
  if ((pdf.conferencia !== 'identico' || !pdf.temAssinaturaDigital) && confirmarConferencia !== true) {
    return res.status(409).json({ error: 'Confirme que o PDF é do paciente correto e que está assinado.', precisaConfirmar: true });
  }
  if (pdf.dataEnvio && confirmarReenvio !== true) {
    return res.status(409).json({ error: `Este PDF já foi enviado em ${formatarDataHora(pdf.dataEnvio)}. Confirme para enviar novamente.`, jaEnviado: true });
  }

  const { destinos } = resolverDestinos(doc);
  if (!destinos.some((d) => d.papel === 'paciente' && d.valido)) {
    return res.status(422).json({
      error:
        doc.origem === 'avulso'
          ? 'O documento não tem e-mail válido do paciente.'
          : 'O documento não tem e-mail válido do paciente. Peça ao aluno para reenviar pelo app.',
    });
  }

  enviosEmAndamento.add(doc.id);
  try {
    const destinatarios: EmailDestinatario[] = destinos.map((d) => ({
      id: `dest-${doc.id}-${d.papel}`,
      papel: d.papel,
      nome: d.nome,
      email: d.email,
      status: 'pendente',
      tentativas: 0,
    }));
    await Promise.all(
      destinatarios.map(async (dest, i) => {
        if (!destinos[i].valido) {
          dest.status = 'falha';
          dest.erroMotivo = `Endereço de e-mail inválido: ${dest.email}`;
          return;
        }
        await enviarParaDestinatario(dest, doc);
      })
    );
    doc.envio = { dataDisparo: new Date().toISOString(), destinatarios };
    atualizarStatus(doc);
    if (destinatarios.some((d) => d.status !== 'falha')) pdf.dataEnvio = doc.envio.dataDisparo;
    doc.lido = true;

    const falhas = destinatarios.filter((d) => d.status === 'falha');
    evento(
      doc,
      sessao.professor,
      'Envio do PDF assinado',
      falhas.length === 0
        ? `Enviado para ${destinatarios.map((d) => `${d.papel} (${d.email})`).join(', ')}.`
        : `Falhas: ${falhas.map((d) => `${d.email} (${d.erroMotivo})`).join('; ')}.`
    );
    salvarIndice();
    res.json({
      sucesso: falhas.length === 0,
      mensagem:
        falhas.length === 0
          ? `PDF assinado enviado para ${destinatarios.length} destinatários.`
          : `Enviado, mas ${falhas.length} destinatário(s) falharam: ${falhas.map((d) => d.email).join(', ')}.`,
      documento: doc,
    });
  } finally {
    enviosEmAndamento.delete(doc.id);
  }
});

app.post('/api/documentos/:id/destinatarios/:destId/reenviar', exigirSessao, async (req: Request, res: Response) => {
  const doc = docDaSessao(req, res);
  if (!doc) return;
  const dest = doc.envio?.destinatarios.find((d) => d.id === req.params.destId);
  if (!dest || !doc.pdfAssinado) return res.status(404).json({ error: 'Destinatário não localizado.' });

  await enviarParaDestinatario(dest, doc);
  atualizarStatus(doc);
  evento(
    doc,
    (req as any).sessao.professor,
    `Reenvio para ${dest.email}`,
    dest.status === 'falha' ? `Tentativa ${dest.tentativas} falhou: ${dest.erroMotivo}` : `Tentativa ${dest.tentativas} bem-sucedida.`
  );
  salvarIndice();
  if (dest.status === 'falha') return res.status(502).json({ error: `Falha no reenvio: ${dest.erroMotivo}`, documento: doc });
  res.json({ sucesso: true, mensagem: 'E-mail reenviado com sucesso.', documento: doc });
});

// Upload maior que o limite: devolve JSON em vez da página de erro do Express.
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: `Arquivo excede o limite de ${TAMANHO_MAXIMO_PDF / 1024 / 1024} MB.` });
  }
  next(err);
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[SubSign Professor FACPP] Servidor rodando na porta ${PORT}`);
  });
}

startServer();
