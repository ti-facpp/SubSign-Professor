// Resolve para quem o documento assinado deve ser enviado.
// Fica fora do server.ts para poder ser testado sem subir o Express.
//
// Os 3 destinos (conforme o fluxo da clínica):
//   1) paciente     -> e-mail informado pelo aluno no app do aluno, gravado junto com o documento
//   2) coordenacao  -> e-mail da disciplina do documento (a mesma em que o professor está logado)
//   3) prontuario   -> e-mail fixo prontuarios@facpp.edu.br

import type { DestinoEnvio } from './src/types/index.ts';
import { EMAIL_PRONTUARIOS_PADRAO } from './disciplinas.ts';

type Env = Record<string, string | undefined>;

export interface DocumentoParaDestino {
  disciplinaEmail: string;
  disciplinaNome: string;
  pacienteNome: string;
  pacienteEmail: string;
}

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function emailValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length <= 254 && EMAIL_RE.test(valor.trim());
}

export function emailProntuarios(env: Env = process.env): string {
  const configurado = (env.EMAIL_PRONTUARIOS || '').trim();
  return emailValido(configurado) ? configurado : EMAIL_PRONTUARIOS_PADRAO;
}

export function resolverDestinos(d: DocumentoParaDestino, env: Env = process.env) {
  const avisos: string[] = [];

  const candidatos: DestinoEnvio[] = [
    { papel: 'paciente', nome: d.pacienteNome, email: (d.pacienteEmail || '').trim(), valido: false },
    { papel: 'coordenacao', nome: `Coordenação - ${d.disciplinaNome}`, email: (d.disciplinaEmail || '').trim(), valido: false },
    { papel: 'prontuario', nome: 'Prontuários FACPP', email: emailProntuarios(env), valido: false },
  ];
  for (const c of candidatos) c.valido = emailValido(c.email);

  if (candidatos[0].valido && /@facpp\.edu\.br$/i.test(candidatos[0].email)) {
    avisos.push(`O e-mail do paciente (${candidatos[0].email}) é institucional da FACPP. Confira com o aluno se está correto.`);
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
