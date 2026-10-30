// Resolve para quem o prontuário assinado deve ser enviado.
// Fica fora do server.ts para poder ser testado sem subir o Express.

import type { DestinoEnvio } from './src/types/index.ts';

type Env = Record<string, string | undefined>;

export interface ProntuarioParaDestino {
  disciplina: string;
  paciente: { nome: string; email: string };
  aluno: { nome: string; email: string };
  // Destinatários gravados quando o prontuário chegou do app do aluno:
  // é de lá que sai a coordenação correta da disciplina.
  envioEmails?: { destinatarios: { papel: string; nome: string; email: string }[] };
}

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function emailValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length <= 254 && EMAIL_RE.test(valor.trim());
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Trecho do nome da disciplina (sem acento, minúsculo) -> e-mail da coordenação.
const COORDENACAO_POR_DISCIPLINA_PADRAO: [string, string][] = [
  ['bucomaxilofacial', 'cirurgia.buco@facpp.edu.br'],
  ['periodontia', 'periodontia@facpp.edu.br'],
  ['dentistica', 'dentistica@facpp.edu.br'],
  ['endodontia', 'endodontia@facpp.edu.br'],
];

// EMAIL_COORDENACAO_POR_DISCIPLINA: JSON {"trecho do nome": "email"} (vale antes do padrão).
// EMAIL_COORDENACAO_PADRAO: usado quando nenhuma disciplina bate.
export function emailCoordenacaoDaDisciplina(disciplina: string, env: Env = process.env): string {
  const alvo = normalizar(disciplina || '');
  const doAmbiente: [string, string][] = [];
  try {
    const bruto = env.EMAIL_COORDENACAO_POR_DISCIPLINA;
    if (bruto) {
      for (const [trecho, email] of Object.entries(JSON.parse(bruto))) {
        if (typeof email === 'string') doAmbiente.push([normalizar(trecho), email.trim()]);
      }
    }
  } catch {
    console.error('[Destinos] EMAIL_COORDENACAO_POR_DISCIPLINA não é um JSON válido; ignorado.');
  }
  for (const [trecho, email] of [...doAmbiente, ...COORDENACAO_POR_DISCIPLINA_PADRAO]) {
    if (trecho && alvo.includes(trecho) && emailValido(email)) return email;
  }
  const padrao = (env.EMAIL_COORDENACAO_PADRAO || 'clinica.odontologia@facpp.edu.br').trim();
  return padrao;
}

// Os 3 destinos: paciente (e-mail do próprio prontuário), aluno e coordenação da disciplina.
export function resolverDestinos(p: ProntuarioParaDestino, env: Env = process.env) {
  const avisos: string[] = [];

  const coordenacaoDoRegistro = p.envioEmails?.destinatarios.find(
    (d) => d.papel === 'coordenacao' && emailValido(d.email)
  );
  const coordenacao = coordenacaoDoRegistro
    ? { nome: coordenacaoDoRegistro.nome, email: coordenacaoDoRegistro.email.trim() }
    : {
        nome: `Coordenação - ${p.disciplina}`,
        email: emailCoordenacaoDaDisciplina(p.disciplina, env),
      };

  const candidatos: DestinoEnvio[] = [
    { papel: 'paciente', nome: p.paciente.nome, email: (p.paciente.email || '').trim(), valido: false },
    { papel: 'aluno', nome: p.aluno.nome, email: (p.aluno.email || '').trim(), valido: false },
    { papel: 'coordenacao', nome: coordenacao.nome, email: coordenacao.email, valido: false },
  ];
  for (const c of candidatos) c.valido = emailValido(c.email);

  const pacienteEmail = candidatos[0].email.toLowerCase();
  if (candidatos[0].valido && /@facpp\.edu\.br$/.test(pacienteEmail)) {
    avisos.push(`O e-mail do paciente (${candidatos[0].email}) é institucional da FACPP. Confira se não é o do aluno.`);
  }

  const vistos = new Set<string>();
  const destinos: DestinoEnvio[] = [];
  for (const c of candidatos) {
    const chave = c.email.toLowerCase();
    if (c.valido && vistos.has(chave)) {
      avisos.push(`${c.email} aparece mais de uma vez (${c.papel}); a mensagem será enviada uma única vez para ele.`);
      continue;
    }
    if (c.valido) vistos.add(chave);
    destinos.push(c);
  }

  return { destinos, avisos };
}
