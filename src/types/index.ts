export interface Disciplina {
  email: string;
  nome: string;
}

export type EmailPapel = 'paciente' | 'coordenacao' | 'prontuario';

export type EmailStatus = 'pendente' | 'entregue' | 'falha';

export interface EmailDestinatario {
  id: string;
  papel: EmailPapel;
  nome: string;
  email: string;
  status: EmailStatus;
  tentativas: number;
  dataHoraEnvio?: string;
  mensagemId?: string;
  erroMotivo?: string;
}

// Para quem o documento assinado vai ser enviado (resolvido a partir do próprio documento).
export interface DestinoEnvio {
  papel: EmailPapel;
  nome: string;
  email: string;
  valido: boolean;
}

export interface EventoHistorico {
  id: string;
  dataHora: string;
  autor: string;
  acao: string;
  detalhes: string;
}

// Como o PDF assinado se compara ao original recebido do app do aluno.
//  identico:  o arquivo começa exatamente com os bytes do original (assinatura do Adobe "por cima").
//  divergente: o Adobe regravou o arquivo; não dá para provar que é o mesmo documento.
//  avulso:    enviado pelo professor sem documento do app do aluno; não há original para comparar.
export type ConferenciaPdf = 'identico' | 'divergente' | 'avulso';

export interface PdfAssinado {
  nomeArquivo: string;
  tamanhoBytes: number;
  totalPaginas: number;
  hashSha256: string;
  dataUpload: string;
  enviadoPor: string;
  conferencia: ConferenciaPdf;
  temAssinaturaDigital: boolean;
  dataEnvio?: string; // preenchido quando os e-mails saíram com este PDF
}

export type StatusDocumento = 'aguardando_assinatura' | 'enviado' | 'falha_parcial';

// Documento na caixa de uma disciplina: recebido do app do aluno ou enviado avulso pelo professor.
export interface Documento {
  id: string;
  origem?: 'app_aluno' | 'avulso'; // ausente = app_aluno
  idExterno?: string;
  numero?: string;
  tipo?: string;
  recebidoEm: string;
  disciplinaEmail: string;
  disciplinaNome: string;
  pacienteNome: string;
  pacienteEmail: string;
  alunoNome: string; // pode ser vazio no avulso
  alunoRa?: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  totalPaginas: number;
  hashSha256: string;
  lido: boolean;
  status: StatusDocumento;
  pdfAssinado?: PdfAssinado;
  envio?: {
    dataDisparo: string;
    destinatarios: EmailDestinatario[];
  };
  historico: EventoHistorico[];
}

export interface Sessao {
  token: string;
  disciplinaEmail: string;
  disciplinaNome: string;
  professor: string;
  expiraEm: string;
}

export interface EstadoEmail {
  smtpAtivo: boolean;
  modoTeste: boolean;
  redirecionarPara: string | null;
}

export interface InfoEnvio extends EstadoEmail {
  destinos: DestinoEnvio[];
  avisos: string[];
}
