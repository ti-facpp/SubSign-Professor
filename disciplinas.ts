// Disciplinas da clínica. O e-mail é a chave: é o endereço da coordenação/professores da disciplina,
// recebe o documento assinado e também é o "login" de acesso ao app (junto com o código da disciplina).
// O nome é só para exibição.

export interface Disciplina {
  email: string;
  nome: string;
}

export const DISCIPLINAS: Disciplina[] = [
  { email: 'introducao.odontologia@facpp.edu.br', nome: 'Introdução à Odontologia' },
  { email: 'estudo.adequacao@facpp.edu.br', nome: 'Estudo e Adequação' },
  { email: 'clinica.integrada1@facpp.edu.br', nome: 'Clínica Integrada I' },
  { email: 'clinica.integrada2@facpp.edu.br', nome: 'Clínica Integrada II' },
  { email: 'clinica.dtm@facpp.edu.br', nome: 'Clínica DTM' },
  { email: 'clinica.integrada3@facpp.edu.br', nome: 'Clínica Integrada III' },
  { email: 'cirurgia.bucomaxilofacial@facpp.edu.br', nome: 'Cirurgia Bucomaxilofacial' },
  { email: 'clinica.integrada4@facpp.edu.br', nome: 'Clínica Integrada IV' },
  { email: 'clinica.infantil@facpp.edu.br', nome: 'Clínica Infantil' },
  { email: 'clinica.integrada5@facpp.edu.br', nome: 'Clínica Integrada V' },
  { email: 'estagio.integrada1@facpp.edu.br', nome: 'Estágio Integrada I' },
  { email: 'estagio.integrada2@facpp.edu.br', nome: 'Estágio Integrada II' },
  { email: 'estagio.pne@facpp.edu.br', nome: 'Estágio PNE' },
];

// Destinatário fixo de todo documento assinado.
export const EMAIL_PRONTUARIOS_PADRAO = 'prontuarios@facpp.edu.br';

export function buscarDisciplina(email: unknown): Disciplina | undefined {
  if (typeof email !== 'string') return undefined;
  const alvo = email.trim().toLowerCase();
  return DISCIPLINAS.find((d) => d.email === alvo);
}
