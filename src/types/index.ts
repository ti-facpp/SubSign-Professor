export interface Paciente {
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento: string;
  idade: number;
  telefone: string;
  email: string;
  sexo: 'M' | 'F' | 'Outro';
  endereco?: string;
  responsavelLegal?: string;
  emailResponsavel?: string;
}

export interface Aluno {
  nome: string;
  ra: string;
  email: string;
  semestre: string;
  curso: string;
  assinaturaData: string;
  assinaturaHash: string;
  ipOrigem: string;
  dispositivo: string;
}

export interface Professor {
  nome: string;
  matricula: string;
  cpf: string;
  cro_crm: string;
  email: string;
}

export interface DadosClinicos {
  queixaPrincipal: string;
  anamneseResumida: string;
  diagnostico: string;
  cid10_cfo: string;
  procedimentoRealizado: string;
  materiaisUtilizados: string;
  prescricaoMedicamentosa?: string;
  recomendacoesPosOperatorias?: string;
  proximoRetorno?: string;
  observacoesSupervisor?: string;
}

export interface AssinaturaCertisign {
  assinado: boolean;
  dataAssinatura: string;
  autoridadeCertificadora: string;
  titularCertificado: string;
  cpfTitular: string;
  numeroSerieCertificado: string;
  algoritmoAssinatura: string;
  hashDocumento: string;
  carimboTempoACT: string;
  politicaAssinatura: string;
  statusCertificado: 'VALIDO' | 'REVOGADO' | 'EXPIRADO';
  codigoVerificacao: string;
}

export type EmailPapel = 'aluno' | 'paciente' | 'coordenacao' | 'same_arquivo';

export type EmailStatus = 'pendente' | 'enviado' | 'entregue' | 'aberto' | 'falha';

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

export interface AuditoriaEvento {
  id: string;
  dataHora: string;
  autor: string;
  acao: string;
  detalhes: string;
  ip?: string;
}

export interface Prontuario {
  id: string;
  numeroProntuario: string;
  dataAtendimento: string;
  horaAtendimento: string;
  disciplina: string;
  boxClinico: string;
  paciente: Paciente;
  aluno: Aluno;
  professor: Professor;
  dadosClinicos: DadosClinicos;
  status: 'aguardando_validacao' | 'assinado_certisign' | 'rejeitado_ajustes';
  motivoRejeicao?: string;
  assinaturaCertisign?: AssinaturaCertisign;
  envioEmails: {
    statusGeral: 'pendente' | 'em_processamento' | 'concluido' | 'falha_parcial';
    dataDisparo?: string;
    destinatarios: EmailDestinatario[];
  };
  historico: AuditoriaEvento[];
}

export interface CertisignConfig {
  ambiente: 'homologacao' | 'producao';
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tipoCertificado: 'A1_REMOTA' | 'BIRD_ID' | 'CERTISIGN_HUB' | 'TOKEN_A3';
  titularNome: string;
  titularCpf: string;
  cro_crm: string;
  certificadoSerial: string;
  dataValidade: string;
  emissor: string;
  carimboTempoAtivo: boolean;
  autoridadeCarimbo: string;
  statusConexao: 'conectado' | 'desconectado' | 'erro';
  ultimoTeste: string;
}

export interface ItemRelatorio {
  id: string;
  numeroProntuario: string;
  dataAtendimento: string;
  pacienteNome: string;
  pacienteEmail: string;
  alunoNome: string;
  alunoEmail: string;
  disciplina: string;
  statusProntuario: 'aguardando_validacao' | 'assinado_certisign' | 'rejeitado_ajustes';
  assinadoCertisign: boolean;
  dataAssinatura?: string;
  hashCertisign?: string;
  totalEmails: number;
  emailsEntregues: number;
  emailsFalhas: number;
  statusEnvioGeral: 'pendente' | 'em_processamento' | 'concluido' | 'falha_parcial';
  destinatarios: EmailDestinatario[];
}

export interface ProfessorProfile {
  email: string;
  nome: string;
  departamento: string;
  cro_crm: string;
  matricula: string;
  certificadoStatus: 'valido' | 'pendente';
  avatarUrl?: string;
  ultimoLogin?: string;
}

export interface EmailNotificacaoRecebida {
  id: string;
  destinatarioEmail: string;
  remetente: string;
  remetenteNome: string;
  assunto: string;
  dataRecebimento: string;
  lido: boolean;
  prontuarioId: string;
  prontuarioNumero: string;
  anexoPdf: {
    nomeArquivo: string;
    tamanhoBytes: number;
    tamanhoFormatado: string;
    hashSha256: string;
    statusAssinatura: 'aguardando_validacao' | 'assinado_certisign' | 'rejeitado_ajustes';
  };
  corpoMensagem: string;
  alunoNome: string;
  alunoRa: string;
  pacienteNome: string;
  disciplina: string;
}

export interface RelatorioConsolidado {
  resumo: {
    totalProntuarios: number;
    totalAssinados: number;
    totalAguardando: number;
    totalRejeitados: number;
    totalEmailsDisparados: number;
    totalEmailsEntregues: number;
    totalEmailsAbertos: number;
    totalEmailsFalhas: number;
    taxaEntregaGeral: number;
  };
  itens: ItemRelatorio[];
}
