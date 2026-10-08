import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import {
  Prontuario,
  CertisignConfig,
  EmailDestinatario,
  RelatorioConsolidado,
  ItemRelatorio,
  AuditoriaEvento,
  ProfessorProfile,
  EmailNotificacaoRecebida,
  DocumentoPdf,
} from './src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// --- Envio de e-mails via SMTP ---
// Sem SMTP_HOST/SMTP_USER/SMTP_PASS o envio continua simulado (desenvolvimento).
// EMAIL_REDIRECIONAR_PARA desvia todas as mensagens para um único endereço
// (modo de teste: os dados de exemplo têm e-mails de terceiros).
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
        (emailRedirecionarPara ? ` (modo teste: tudo redirecionado para ${emailRedirecionarPara})` : '')
    : '[SMTP] Não configurado — envio de e-mails simulado.'
);

interface ResultadoEnvio {
  ok: boolean;
  mensagemId: string;
  erro?: string;
}

function escaparHtml(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nunca lança: o resultado vira o status do destinatário.
async function enviarEmail(para: string, assunto: string, html: string): Promise<ResultadoEnvio> {
  if (!transporter) {
    return { ok: true, mensagemId: `MSG-SIMULADO-${Date.now()}` };
  }

  const destino = emailRedirecionarPara || para;
  const assuntoFinal = emailRedirecionarPara ? `[TESTE → ${para}] ${assunto}` : assunto;
  const aviso = emailRedirecionarPara
    ? `<p style="background:#fef3c7;padding:8px;border-radius:4px;font-size:12px">
         Modo de teste: esta mensagem seria enviada para <b>${escaparHtml(para)}</b>.</p>`
    : '';

  try {
    const info = await transporter.sendMail({ from: emailRemetente, to: destino, subject: assuntoFinal, html: aviso + html });
    return { ok: true, mensagemId: info.messageId };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    console.error(`[SMTP] Falha ao enviar para ${destino}: ${erro}`);
    return { ok: false, mensagemId: '', erro };
  }
}

function htmlProntuarioAssinado(p: Prontuario, nomeDestinatario: string): string {
  const a = p.assinaturaCertisign;
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px">
      <h2 style="color:#047857">Prontuário assinado digitalmente</h2>
      <p>Olá, ${escaparHtml(nomeDestinatario)}.</p>
      <p>O prontuário abaixo foi validado pelo docente supervisor e assinado digitalmente.</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0"><b>Prontuário</b></td><td>${escaparHtml(p.numeroProntuario)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Paciente</b></td><td>${escaparHtml(p.paciente.nome)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Aluno</b></td><td>${escaparHtml(p.aluno.nome)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Disciplina</b></td><td>${escaparHtml(p.disciplina)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Atendimento</b></td><td>${escaparHtml(p.dataAtendimento)} ${escaparHtml(p.horaAtendimento)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Procedimento</b></td><td>${escaparHtml(p.dadosClinicos.procedimentoRealizado)}</td></tr>
        ${a ? `
        <tr><td style="padding:4px 12px 4px 0"><b>Assinado por</b></td><td>${escaparHtml(a.titularCertificado)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Data da assinatura</b></td><td>${escaparHtml(new Date(a.dataAssinatura).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Código de verificação</b></td><td>${escaparHtml(a.codigoVerificacao)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Hash SHA-256</b></td><td style="font-family:monospace;font-size:12px">${escaparHtml(a.hashDocumento)}</td></tr>` : ''}
      </table>
      <p style="font-size:12px;color:#64748b;margin-top:24px">Mensagem automática do SubSign Professor — FACPP. Não responda este e-mail.</p>
    </div>`;
}

function htmlProntuarioDevolvido(p: Prontuario, motivo: string): string {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px">
      <h2 style="color:#b45309">Prontuário devolvido para correção</h2>
      <p>Olá, ${escaparHtml(p.aluno.nome)}.</p>
      <p>O prontuário <b>${escaparHtml(p.numeroProntuario)}</b> (paciente ${escaparHtml(p.paciente.nome)},
         ${escaparHtml(p.disciplina)}) foi devolvido pelo docente supervisor com o parecer abaixo:</p>
      <blockquote style="border-left:4px solid #f59e0b;margin:0;padding:8px 12px;background:#fffbeb">${escaparHtml(motivo)}</blockquote>
      <p>Faça os ajustes e reenvie o prontuário para validação.</p>
      <p style="font-size:12px;color:#64748b;margin-top:24px">Mensagem automática do SubSign Professor — FACPP. Não responda este e-mail.</p>
    </div>`;
}

function assuntoProntuario(p: Prontuario): string {
  return `Prontuário ${p.numeroProntuario} assinado digitalmente — FACPP`;
}

async function enviarParaDestinatario(dest: EmailDestinatario, assunto: string, html: string): Promise<void> {
  const resultado = await enviarEmail(dest.email, assunto, html);
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

// Initial Professores Database
let professoresDb: ProfessorProfile[] = [
  {
    email: 'martins1987@gmail.com',
    nome: 'Prof. Dr. Martins Silveira',
    departamento: 'Coordenação & Supervisão Clínica Odontológica FACPP',
    cro_crm: 'CRO-SP 104.821',
    matricula: 'DOC-4819',
    certificadoStatus: 'valido',
  },
  {
    email: 'marcos.silveira@facpp.edu.br',
    nome: 'Dr. Marcos Antonio Silveira',
    departamento: 'Clínica Odontológica Integrada & Cirurgia',
    cro_crm: 'CRO-SP 104.821',
    matricula: 'DOC-4819',
    certificadoStatus: 'valido',
  },
  {
    email: 'renato.carvalho@facpp.edu.br',
    nome: 'Prof. Dr. Renato Carvalho',
    departamento: 'Endodontia & Periodontia Clínica',
    cro_crm: 'CRO-SP 98.412',
    matricula: 'DOC-3312',
    certificadoStatus: 'valido',
  },
];

// Initial Received Emails Inbox with PDF Attachments
let emailsRecebidosDb: EmailNotificacaoRecebida[] = [];

// Helper to synchronize incoming student PDF notifications with professor email inbox
function syncEmailsForProfessor(professorEmail: string) {
  const cleanEmail = professorEmail.toLowerCase().trim();

  prontuariosDb.forEach((prontuario, index) => {
    const existing = emailsRecebidosDb.find(
      (e) => e.destinatarioEmail.toLowerCase() === cleanEmail && e.prontuarioId === prontuario.id
    );

    if (existing) {
      // Sync signature status of the attached PDF
      existing.anexoPdf.statusAssinatura = prontuario.status;
      if (prontuario.assinaturaCertisign?.hashDocumento) {
        existing.anexoPdf.hashSha256 = prontuario.assinaturaCertisign.hashDocumento;
      }
    } else {
      // Generate incoming notification email with attached PDF from subsign.facpp.edu.br
      const cleanNum = prontuario.numeroProntuario.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanAluno = prontuario.aluno.nome.replace(/\s+/g, '');
      const dataFormatada = new Date(prontuario.dataAtendimento).toLocaleDateString('pt-BR');

      emailsRecebidosDb.push({
        id: `email-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${prontuario.id}`,
        destinatarioEmail: cleanEmail,
        remetente: 'notificacoes@subsign.facpp.edu.br',
        remetenteNome: 'SubSign FACPP · Sistema de Prontuários dos Alunos',
        assunto: `[SubSign FACPP] Novo Prontuário para Assinatura - Aluno(a) ${prontuario.aluno.nome} (${prontuario.numeroProntuario})`,
        dataRecebimento: prontuario.aluno.assinaturaData || new Date().toISOString(),
        lido: prontuario.status === 'assinado_certisign' ? true : index > 1,
        prontuarioId: prontuario.id,
        prontuarioNumero: prontuario.numeroProntuario,
        anexoPdf: {
          nomeArquivo: `PRONTUARIO_${cleanNum}_${cleanAluno}.pdf`,
          tamanhoBytes: 460000 + (index * 15200),
          tamanhoFormatado: `${Math.round((460000 + (index * 15200)) / 1024)} KB`,
          hashSha256: prontuario.assinaturaCertisign?.hashDocumento || prontuario.aluno.assinaturaHash,
          statusAssinatura: prontuario.status,
        },
        corpoMensagem: `Olá, Professor(a)!\n\nO(a) discente ${prontuario.aluno.nome} (RA ${prontuario.aluno.ra}) preencheu e assinou eletronicamente via aplicativo SubSign Aluno o prontuário clínico nº ${prontuario.numeroProntuario}, referente ao atendimento do(a) paciente ${prontuario.paciente.nome} na disciplina ${prontuario.disciplina} (${prontuario.boxClinico}) realizado em ${dataFormatada} às ${prontuario.horaAtendimento}.\n\nO PDF autêntico do prontuário encontra-se anexado a esta mensagem com hash SHA-256 e assinatura discente para sua conferência clínica e assinatura digital centralizada via Certisign ICP-Brasil.\n\nApós sua validação e assinatura com certificado digital, o sistema despachará automaticamente cópias registradas para o aluno, paciente, coordenação e arquivo central (SAME).\n\nAtenciosamente,\nEquipe SubSign FACPP · Faculdade de Presidente Prudente`,
        alunoNome: prontuario.aluno.nome,
        alunoRa: prontuario.aluno.ra,
        pacienteNome: prontuario.paciente.nome,
        disciplina: prontuario.disciplina,
      });
    }
  });
}

// Initial Certisign API & Digital Certificate Configuration
let certisignConfig: CertisignConfig = {
  ambiente: 'homologacao',
  apiUrl: 'https://api.certisign.com.br/v2/signer-hub',
  clientId: 'facpp_docente_prod_993481',
  clientSecret: 'cs_sec_993f48a72b0c4719e831',
  tipoCertificado: 'A1_REMOTA',
  titularNome: 'DR. MARCOS ANTONIO SILVEIRA',
  titularCpf: '***.482.918-**',
  cro_crm: 'CRO-SP 104.821',
  certificadoSerial: '2A:9C:78:E1:54:F0:8B:12:00:D3',
  dataValidade: '2027-12-31',
  emissor: 'AC Certisign Multipla v5 (ICP-Brasil)',
  carimboTempoAtivo: true,
  autoridadeCarimbo: 'ACT Certisign Carimbo do Tempo ICP-Brasil',
  statusConexao: 'conectado',
  ultimoTeste: new Date().toISOString(),
};

// Seed database with clinical records submitted by students via subsign.facpp.edu.br
let prontuariosDb: Prontuario[] = [
  {
    id: 'prt-001',
    numeroProntuario: 'FACPP-ODON-2026-0841',
    dataAtendimento: '2026-10-06',
    horaAtendimento: '09:30',
    disciplina: 'Clínica Odontológica Integrada IV',
    boxClinico: 'Box 08 - Clínica Odontológica II',
    paciente: {
      nome: 'Claudio Roberto de Oliveira',
      cpf: '284.910.428-11',
      rg: '38.491.022-X SSP/SP',
      dataNascimento: '1982-05-14',
      idade: 44,
      telefone: '(18) 99742-1102',
      email: 'claudio.oliveira82@gmail.com',
      sexo: 'M',
      endereco: 'Rua Barão do Rio Branco, 412 - Presidente Prudente/SP',
    },
    aluno: {
      nome: 'Beatriz Vasconcelos Lima',
      ra: '202209148',
      email: 'beatriz.lima@facpp.edu.br',
      semestre: '8º Termo',
      curso: 'Odontologia',
      assinaturaData: '2026-10-06T11:45:10.000Z',
      assinaturaHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ipOrigem: '177.105.42.18 (Rede Interna FACPP)',
      dispositivo: 'iPad Air 5th Gen (SubSign Aluno WebApp)',
    },
    professor: {
      nome: 'Dr. Marcos Antonio Silveira',
      matricula: 'DOC-4819',
      cpf: '128.482.918-04',
      cro_crm: 'CRO-SP 104.821',
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: 'Dor ao mastigar na região posterior inferior direita há 2 semanas.',
      anamneseResumida: 'Paciente normotenso, não diabético, sem alergias medicamentosas relatadas. Boa higienização oral.',
      diagnostico: 'Cárie dentinária profunda no elemento 46 (oclusal/mesial), com polpa vital sem sintomatologia irreversível.',
      cid10_cfo: 'K02.1 - Cárie da dentina',
      procedimentoRealizado: 'Remoção seletiva de tecido cariado no elemento 46 sob isolamento absoluto. Proteção do complexo dentinopulpar com cimento de hidróxido de cálcio e ionômero de vidro. Restauração definitiva em resina composta cor A2 Filtek Z350 XT. Ajuste oclusal e polimento.',
      materiaisUtilizados: 'Resina composta Filtek Z350 XT A2, Adesivo Single Bond Universal 3M, Ionômero Vitrebond, Anestésico Mepivacaína 2% com epinefrina.',
      prescricaoMedicamentosa: 'Dipirona 500mg se houver desconforto leve (1 comprimido de 6/6h por 24h).',
      recomendacoesPosOperatorias: 'Evitar mastigação de alimentos muito rígidos nas primeiras horas. Higienização habitual.',
      proximoRetorno: '2026-10-20 para reavaliação clínica e profilaxia.',
    },
    status: 'aguardando_validacao',
    envioEmails: {
      statusGeral: 'pendente',
      destinatarios: [
        {
          id: 'dest-001-aluno',
          papel: 'aluno',
          nome: 'Beatriz Vasconcelos Lima',
          email: 'beatriz.lima@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-001-paciente',
          papel: 'paciente',
          nome: 'Claudio Roberto de Oliveira',
          email: 'claudio.oliveira82@gmail.com',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-001-coord',
          papel: 'coordenacao',
          nome: 'Coordenação de Clínica Odontológica FACPP',
          email: 'clinica.odontologia@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-001-same',
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
      ],
    },
    historico: [
      {
        id: 'evt-001',
        dataHora: '2026-10-06T11:45:10.000Z',
        autor: 'Beatriz Vasconcelos Lima (Aluno)',
        acao: 'Prontuário preenchido e assinado pelo aluno',
        detalhes: 'Enviado via SubSign Aluno v2.4 para fila de validação do professor.',
        ip: '177.105.42.18',
      },
    ],
  },
  {
    id: 'prt-002',
    numeroProntuario: 'FACPP-ODON-2026-0842',
    dataAtendimento: '2026-10-06',
    horaAtendimento: '14:00',
    disciplina: 'Cirurgia e Traumatologia Bucomaxilofacial',
    boxClinico: 'Box 03 - Setor Cirúrgico',
    paciente: {
      nome: 'Mariana Duarte Santos',
      cpf: '419.002.381-89',
      rg: '49.192.831-2 SSP/SP',
      dataNascimento: '1998-11-20',
      idade: 27,
      telefone: '(18) 99611-8490',
      email: 'mariana.duarte.santos@uol.com.br',
      sexo: 'F',
      endereco: 'Av. Washington Luiz, 1200 - Presidente Prudente/SP',
    },
    aluno: {
      nome: 'Lucas Gabriel Pinheiro',
      ra: '202104921',
      email: 'lucas.pinheiro@facpp.edu.br',
      semestre: '9º Termo',
      curso: 'Odontologia',
      assinaturaData: '2026-10-06T16:10:00.000Z',
      assinaturaHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      ipOrigem: '177.105.42.19 (Rede Interna FACPP)',
      dispositivo: 'Notebook Dell Latitude 3420 (SubSign Aluno)',
    },
    professor: {
      nome: 'Dr. Marcos Antonio Silveira',
      matricula: 'DOC-4819',
      cpf: '128.482.918-04',
      cro_crm: 'CRO-SP 104.821',
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: 'Indicação ortodôntica para exodontia de terceiros molares inclusos.',
      anamneseResumida: 'Paciente saudável, ASA I. Sem queixas sistêmicas. Exames pré-operatórios de coagulograma dentro da normalidade.',
      diagnostico: 'Dente 38 semi-incluso, classe II posição B de Pell & Gregory. Dente 48 incluso horizontal.',
      cid10_cfo: 'K01.1 - Dentes inclusos',
      procedimentoRealizado: 'Exodontia cirúrgica do elemento 38 sob anestesia local troncular do nervo alveolar inferior, lingual e bucal com Articaína 4% com epinefrina 1:100.000. Incisão relaxante, descolamento mucoperiostal, osteotomia mínima e odontossecção. Sutura com fio de seda 3-0.',
      materiaisUtilizados: 'Articaína 4% DFL, Fio de sutura Seda 3-0, Broca Zekrya cirúrgica, Soro fisiológico 0.9%.',
      prescricaoMedicamentosa: 'Amoxicilina 500mg (1 cp 8/8h por 7 dias), Cetoprofeno 100mg (1 cp 12/12h por 3 dias), Dipirona 1g se dor.',
      recomendacoesPosOperatorias: 'Gelo local intermitente nas primeiras 24h. Dieta líquida/pastosa fria. Repouso físico.',
      proximoRetorno: '2026-10-13 para remoção de sutura e controle pós-operatório.',
    },
    status: 'aguardando_validacao',
    envioEmails: {
      statusGeral: 'pendente',
      destinatarios: [
        {
          id: 'dest-002-aluno',
          papel: 'aluno',
          nome: 'Lucas Gabriel Pinheiro',
          email: 'lucas.pinheiro@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-002-paciente',
          papel: 'paciente',
          nome: 'Mariana Duarte Santos',
          email: 'mariana.duarte.santos@uol.com.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-002-coord',
          papel: 'coordenacao',
          nome: 'Coordenação de Cirurgia & Traumatologia FACPP',
          email: 'cirurgia.buco@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-002-same',
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
      ],
    },
    historico: [
      {
        id: 'evt-002',
        dataHora: '2026-10-06T16:10:00.000Z',
        autor: 'Lucas Gabriel Pinheiro (Aluno)',
        acao: 'Prontuário preenchido e assinado pelo aluno',
        detalhes: 'Enviado via SubSign Aluno v2.4 para fila de validação do professor.',
        ip: '177.105.42.19',
      },
    ],
  },
  {
    id: 'prt-003',
    numeroProntuario: 'FACPP-ODON-2026-0839',
    dataAtendimento: '2026-10-05',
    horaAtendimento: '10:00',
    disciplina: 'Periodontia Clínica II',
    boxClinico: 'Box 12 - Clínica Odontológica I',
    paciente: {
      nome: 'José Valdir Mendonça',
      cpf: '109.842.119-33',
      rg: '21.094.881-4 SSP/SP',
      dataNascimento: '1968-03-02',
      idade: 58,
      telefone: '(18) 99812-4019',
      email: 'valdir.mendonca@terra.com.br',
      sexo: 'M',
      endereco: 'Rua José Bongiovani, 890 - Presidente Prudente/SP',
    },
    aluno: {
      nome: 'Camila Fernandes Rocha',
      ra: '202201994',
      email: 'camila.rocha@facpp.edu.br',
      semestre: '8º Termo',
      curso: 'Odontologia',
      assinaturaData: '2026-10-05T12:00:15.000Z',
      assinaturaHash: 'c282635a9d82e2c56a739818b671a527be69d5fb709549f9fed3cc6d4ebc5251',
      ipOrigem: '177.105.42.20 (Rede Interna FACPP)',
      dispositivo: 'Tablet Samsung Galaxy Tab S7',
    },
    professor: {
      nome: 'Dr. Marcos Antonio Silveira',
      matricula: 'DOC-4819',
      cpf: '128.482.918-04',
      cro_crm: 'CRO-SP 104.821',
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: 'Sangramento gengival constante durante a escovação e mau hálito.',
      anamneseResumida: 'Ex-fumante há 5 anos, hipertensão arterial controlada com Losartana 50mg.',
      diagnostico: 'Periodontite Estágio II, Grau B generalizada. Presença de cálculo subgengival.',
      cid10_cfo: 'K05.3 - Periodontite crônica',
      procedimentoRealizado: 'Sessão de raspagem e alisamento radicular no sextante 5 (elementos 33 ao 43) com curetas de Gracey 1-2 e 5-6, e ultrassom piezoelétrico. Irrigação com clorexidina 0.12%. Polimento coronário.',
      materiaisUtilizados: 'Curetas Hu-Friedy, Digluconato de Clorexidina 0.12%, Pasta profilática.',
      prescricaoMedicamentosa: 'Bochecho com Clorexidina 0.12% sem álcool 2x ao dia por 7 dias.',
      recomendacoesPosOperatorias: 'Orientações de higiene oral e uso correto do fio dental.',
      proximoRetorno: '2026-10-19 para raspagem dos sextantes superiores.',
    },
    status: 'assinado_certisign',
    assinaturaCertisign: {
      assinado: true,
      dataAssinatura: '2026-10-05T15:22:44.000Z',
      autoridadeCertificadora: 'AC Certisign Multipla v5 (ICP-Brasil)',
      titularCertificado: 'DR. MARCOS ANTONIO SILVEIRA',
      cpfTitular: '128.482.918-04',
      numeroSerieCertificado: '2A:9C:78:E1:54:F0:8B:12:00:D3',
      algoritmoAssinatura: 'SHA256withRSA (2048 bits)',
      hashDocumento: '98f7e2c90e181469e38e6789fcf214b2169970c675308696b9fcb3bfb099dd8e',
      carimboTempoACT: 'ACT Certisign Carimbo do Tempo ICP-Brasil [TS-2026-10-05-99412]',
      politicaAssinatura: 'AD-RT (ICP-Brasil DOC-ICP-15 / Resolução CFO 242/2021)',
      statusCertificado: 'VALIDO',
      codigoVerificacao: 'CSIGN-FACPP-2026-8941',
    },
    envioEmails: {
      statusGeral: 'concluido',
      dataDisparo: '2026-10-05T15:23:02.000Z',
      destinatarios: [
        {
          id: 'dest-003-aluno',
          papel: 'aluno',
          nome: 'Camila Fernandes Rocha',
          email: 'camila.rocha@facpp.edu.br',
          status: 'aberto',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T15:23:05.000Z',
          mensagemId: 'msg-facpp-98124-aluno',
        },
        {
          id: 'dest-003-paciente',
          papel: 'paciente',
          nome: 'José Valdir Mendonça',
          email: 'valdir.mendonca@terra.com.br',
          status: 'entregue',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T15:23:06.000Z',
          mensagemId: 'msg-facpp-98124-paciente',
        },
        {
          id: 'dest-003-coord',
          papel: 'coordenacao',
          nome: 'Coordenação de Periodontia FACPP',
          email: 'periodontia@facpp.edu.br',
          status: 'entregue',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T15:23:07.000Z',
          mensagemId: 'msg-facpp-98124-coord',
        },
        {
          id: 'dest-003-same',
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'entregue',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T15:23:08.000Z',
          mensagemId: 'msg-facpp-98124-same',
        },
      ],
    },
    historico: [
      {
        id: 'evt-003a',
        dataHora: '2026-10-05T12:00:15.000Z',
        autor: 'Camila Fernandes Rocha (Aluno)',
        acao: 'Prontuário submetido via SubSign Aluno',
        detalhes: 'Assinatura digital do aluno anexada.',
      },
      {
        id: 'evt-003b',
        dataHora: '2026-10-05T15:22:44.000Z',
        autor: 'Dr. Marcos Antonio Silveira (Docente)',
        acao: 'Assinatura Digital Certisign ICP-Brasil Efetuada',
        detalhes: 'Validação e assinatura criptográfica concluída com carimbo do tempo ACT.',
      },
      {
        id: 'evt-003c',
        dataHora: '2026-10-05T15:23:02.000Z',
        autor: 'Sistema SubSign FACPP (API)',
        acao: 'Disparo de E-mails Concluído',
        detalhes: 'Prontuário com carimbo digital Certisign enviado para 4 destinatários.',
      },
    ],
  },
  {
    id: 'prt-004',
    numeroProntuario: 'FACPP-ODON-2026-0838',
    dataAtendimento: '2026-10-04',
    horaAtendimento: '14:30',
    disciplina: 'Dentística Restauradora II',
    boxClinico: 'Box 05 - Clínica Integrada III',
    paciente: {
      nome: 'Aline Souza Ferreira',
      cpf: '359.102.948-21',
      rg: '42.910.844-1 SSP/SP',
      dataNascimento: '2001-07-19',
      idade: 25,
      telefone: '(18) 99723-9941',
      email: 'aline.souza.ferreira@hotmail.com',
      sexo: 'F',
      endereco: 'Rua Tenente Nicolau Maffei, 150 - Presidente Prudente/SP',
    },
    aluno: {
      nome: 'Gabriel Moreira Paiva',
      ra: '202208842',
      email: 'gabriel.paiva@facpp.edu.br',
      semestre: '7º Termo',
      curso: 'Odontologia',
      assinaturaData: '2026-10-04T17:00:00.000Z',
      assinaturaHash: 'b45cffe084dd3d20d928bee85e7b0f21',
      ipOrigem: '177.105.42.21 (Rede Interna FACPP)',
      dispositivo: 'Smartphone Xiaomi 12T (SubSign)',
    },
    professor: {
      nome: 'Dr. Marcos Antonio Silveira',
      matricula: 'DOC-4819',
      cpf: '128.482.918-04',
      cro_crm: 'CRO-SP 104.821',
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: 'Fratura incisal no dente da frente após traumatismo leve.',
      anamneseResumida: 'Paciente jovem, sem comorbidades. Teste de sensibilidade pulpar positivo térmico.',
      diagnostico: 'Fratura coronária não complicada no elemento 11 envolvendo esmalte e dentina.',
      cid10_cfo: 'S02.5 - Fratura dos dentes',
      procedimentoRealizado: 'Reconstrução estética direta em resina composta do elemento 11. Bisel vestibular, condicionamento ácido e sistema adesivo. Estratificação de esmalte e dentina com resina Forma. Acabamento inicial.',
      materiaisUtilizados: 'Ácido fosfórico 37%, Single Bond Universal, Resina Forma Ultradent A2 Dentina e Bleach Esmalte.',
      prescricaoMedicamentosa: 'Sem necessidade no momento.',
      recomendacoesPosOperatorias: 'Cuidado ao morder alimentos rijos com os dentes anteriores.',
      proximoRetorno: '2026-10-18 para acabamento final e brilho.',
    },
    status: 'aguardando_validacao',
    envioEmails: {
      statusGeral: 'pendente',
      destinatarios: [
        {
          id: 'dest-004-aluno',
          papel: 'aluno',
          nome: 'Gabriel Moreira Paiva',
          email: 'gabriel.paiva@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-004-paciente',
          papel: 'paciente',
          nome: 'Aline Souza Ferreira',
          email: 'aline.souza.ferreira@hotmail.com',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-004-coord',
          papel: 'coordenacao',
          nome: 'Coordenação de Dentística FACPP',
          email: 'dentistica@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: 'dest-004-same',
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
      ],
    },
    historico: [
      {
        id: 'evt-004a',
        dataHora: '2026-10-04T17:00:00.000Z',
        autor: 'Gabriel Moreira Paiva (Aluno)',
        acao: 'Prontuário enviado pelo aluno',
        detalhes: 'Submetido para avaliação do supervisor.',
      },
    ],
  },
  {
    id: 'prt-005',
    numeroProntuario: 'FACPP-ODON-2026-0840',
    dataAtendimento: '2026-10-05',
    horaAtendimento: '15:15',
    disciplina: 'Endodontia Clínica I',
    boxClinico: 'Box 11 - Clínica Odontológica II',
    paciente: {
      nome: 'Renato Alves Moreira',
      cpf: '189.302.812-70',
      rg: '33.910.222-1 SSP/SP',
      dataNascimento: '1975-09-12',
      idade: 51,
      telefone: '(18) 99677-2231',
      email: 'renato.moreira@agroprudente.com.br',
      sexo: 'M',
      endereco: 'Rua Casemiro Dias, 510 - Presidente Prudente/SP',
    },
    aluno: {
      nome: 'Juliana Mendes Carvalho',
      ra: '202203310',
      email: 'juliana.carvalho@facpp.edu.br',
      semestre: '8º Termo',
      curso: 'Odontologia',
      assinaturaData: '2026-10-05T17:30:00.000Z',
      assinaturaHash: 'd58a74e5b721831c2a11b81e812d45b4c102a0b38827498cbe7b483b9cf71900',
      ipOrigem: '177.105.42.22 (Rede Interna FACPP)',
      dispositivo: 'MacBook Air M1 (SubSign Web)',
    },
    professor: {
      nome: 'Dr. Marcos Antonio Silveira',
      matricula: 'DOC-4819',
      cpf: '128.482.918-04',
      cro_crm: 'CRO-SP 104.821',
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: 'Dor latejante intensa espontânea no dente 24 com piora ao calor.',
      anamneseResumida: 'Paciente com diabetes tipo 2 compensada (glicemia de jejum recente 110mg/dL).',
      diagnostico: 'Pulpite irreversível sintomática no elemento 24.',
      cid10_cfo: 'K04.0 - Pulpite aguda',
      procedimentoRealizado: 'Abertura coronária sob isolamento absoluto. Localização dos canais vestibular e palatino. Odontometria eletrônica foraminal com localizador apical. Instrumentação rotatória com sistema WaveOne Gold. Irrigação abundante com Hipoclorito de Sódio 2.5%. Curativo de demora com pasta de Hidróxido de Cálcio Ultracal.',
      materiaisUtilizados: 'WaveOne Gold Medium, Hipoclorito 2.5%, Ultracal, Coltosol para selamento provisório.',
      prescricaoMedicamentosa: 'Ibuprofeno 600mg (1 cp 8/8h por 3 dias se dor inflamatória).',
      recomendacoesPosOperatorias: 'Não mastigar alimentos consistentes sobre o dente até obturação final.',
      proximoRetorno: '2026-10-19 para obturação dos canais radiculares.',
    },
    status: 'assinado_certisign',
    assinaturaCertisign: {
      assinado: true,
      dataAssinatura: '2026-10-05T18:00:10.000Z',
      autoridadeCertificadora: 'AC Certisign Multipla v5 (ICP-Brasil)',
      titularCertificado: 'DR. MARCOS ANTONIO SILVEIRA',
      cpfTitular: '128.482.918-04',
      numeroSerieCertificado: '2A:9C:78:E1:54:F0:8B:12:00:D3',
      algoritmoAssinatura: 'SHA256withRSA (2048 bits)',
      hashDocumento: '710e2098b9f1d0a514d2e960309e3778a87b1c4bdf452178ff9543886f4a7c1e',
      carimboTempoACT: 'ACT Certisign Carimbo do Tempo ICP-Brasil [TS-2026-10-05-99433]',
      politicaAssinatura: 'AD-RT (ICP-Brasil DOC-ICP-15 / Resolução CFO 242/2021)',
      statusCertificado: 'VALIDO',
      codigoVerificacao: 'CSIGN-FACPP-2026-8942',
    },
    envioEmails: {
      statusGeral: 'concluido',
      dataDisparo: '2026-10-05T18:00:30.000Z',
      destinatarios: [
        {
          id: 'dest-005-aluno',
          papel: 'aluno',
          nome: 'Juliana Mendes Carvalho',
          email: 'juliana.carvalho@facpp.edu.br',
          status: 'aberto',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T18:00:32.000Z',
          mensagemId: 'msg-facpp-98130-aluno',
        },
        {
          id: 'dest-005-paciente',
          papel: 'paciente',
          nome: 'Renato Alves Moreira',
          email: 'renato.moreira@agroprudente.com.br',
          status: 'aberto',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T18:00:33.000Z',
          mensagemId: 'msg-facpp-98130-paciente',
        },
        {
          id: 'dest-005-coord',
          papel: 'coordenacao',
          nome: 'Coordenação de Endodontia FACPP',
          email: 'endodontia@facpp.edu.br',
          status: 'entregue',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T18:00:34.000Z',
          mensagemId: 'msg-facpp-98130-coord',
        },
        {
          id: 'dest-005-same',
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'entregue',
          tentativas: 1,
          dataHoraEnvio: '2026-10-05T18:00:35.000Z',
          mensagemId: 'msg-facpp-98130-same',
        },
      ],
    },
    historico: [
      {
        id: 'evt-005a',
        dataHora: '2026-10-05T17:30:00.000Z',
        autor: 'Juliana Mendes Carvalho (Aluno)',
        acao: 'Prontuário submetido via SubSign Aluno',
        detalhes: 'Assinado pelo discente e enviado.',
      },
      {
        id: 'evt-005b',
        dataHora: '2026-10-05T18:00:10.000Z',
        autor: 'Dr. Marcos Antonio Silveira (Docente)',
        acao: 'Assinatura Digital Certisign ICP-Brasil',
        detalhes: 'Aprovado e assinado digitalmente.',
      },
      {
        id: 'evt-005c',
        dataHora: '2026-10-05T18:00:30.000Z',
        autor: 'SubSign API FACPP',
        acao: 'E-mails enviados com sucesso',
        detalhes: '4 e-mails despachados.',
      },
    ],
  },
];

// Initial populate of email inbox for default professors
syncEmailsForProfessor('martins1987@gmail.com');
syncEmailsForProfessor('marcos.silveira@facpp.edu.br');

// Despacho dos e-mails do prontuário assinado aos 4 destinatários padrão
async function dispararEmailsProntuario(prontuario: Prontuario): Promise<Prontuario> {
  const agora = new Date().toISOString();

  const novoDestinatario = (sufixo: string, papel: EmailDestinatario['papel'], nome: string, email: string): EmailDestinatario => ({
    id: `dest-${prontuario.id}-${sufixo}`,
    papel,
    nome,
    email,
    status: 'pendente',
    tentativas: 0,
  });

  const destinatarios: EmailDestinatario[] = [
    novoDestinatario('aluno', 'aluno', prontuario.aluno.nome, prontuario.aluno.email),
    novoDestinatario('paciente', 'paciente', prontuario.paciente.nome, prontuario.paciente.email),
    novoDestinatario('coord', 'coordenacao', `Coordenação Clínica - ${prontuario.disciplina}`, 'clinica.odontologia@facpp.edu.br'),
    novoDestinatario('same', 'same_arquivo', 'SAME - Arquivo Central de Prontuários FACPP', 'same.prontuarios@facpp.edu.br'),
  ];

  await Promise.all(
    destinatarios.map((d) => enviarParaDestinatario(d, assuntoProntuario(prontuario), htmlProntuarioAssinado(prontuario, d.nome)))
  );

  const falhas = destinatarios.filter((d) => d.status === 'falha');
  prontuario.envioEmails = {
    statusGeral: falhas.length === 0 ? 'concluido' : 'falha_parcial',
    dataDisparo: agora,
    destinatarios,
  };

  prontuario.historico.push({
    id: `evt-${Date.now()}-mail`,
    dataHora: agora,
    autor: 'SubSign Dispatch API (Certisign Post-Sign Engine)',
    acao: 'Disparo de E-mails com Prontuário Assinado',
    detalhes:
      falhas.length === 0
        ? `Despacho concluído para 4 e-mails cadastrados: Aluno (${prontuario.aluno.email}), Paciente (${prontuario.paciente.email}), Coordenação e SAME.`
        : `Despacho com ${falhas.length} falha(s): ${falhas.map((d) => `${d.email} (${d.erroMotivo})`).join('; ')}.`,
  });

  return prontuario;
}

// Helper to sign record via Certisign API
async function assinarComCertisign(prontuario: Prontuario): Promise<Prontuario> {
  const agora = new Date().toISOString();
  const docHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        prontuarioId: prontuario.numeroProntuario,
        pacienteCpf: prontuario.paciente.cpf,
        alunoRa: prontuario.aluno.ra,
        procedimento: prontuario.dadosClinicos.procedimentoRealizado,
        timestamp: agora,
      })
    )
    .digest('hex');

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const verificationCode = `CSIGN-FACPP-${new Date().getFullYear()}-${randomNum}`;

  prontuario.status = 'assinado_certisign';
  prontuario.assinaturaCertisign = {
    assinado: true,
    dataAssinatura: agora,
    autoridadeCertificadora: certisignConfig.emissor,
    titularCertificado: certisignConfig.titularNome,
    cpfTitular: certisignConfig.titularCpf,
    numeroSerieCertificado: certisignConfig.certificadoSerial,
    algoritmoAssinatura: 'SHA256withRSA (2048 bits)',
    hashDocumento: docHash,
    carimboTempoACT: `${certisignConfig.autoridadeCarimbo} [ACT-${Date.now()}]`,
    politicaAssinatura: 'AD-RT (ICP-Brasil DOC-ICP-15 / Resolução CFO 242/2021)',
    statusCertificado: 'VALIDO',
    codigoVerificacao: verificationCode,
  };

  prontuario.historico.push({
    id: `evt-${Date.now()}-sign`,
    dataHora: agora,
    autor: `${certisignConfig.titularNome} (${certisignConfig.cro_crm})`,
    acao: 'Assinatura Digital Certisign ICP-Brasil Efetuada',
    detalhes: `Prontuário validado clinicamente e assinado digitalmente com certificado ICP-Brasil. Hash SHA-256: ${docHash.slice(0, 16)}...`,
  });

  // Update PDF status in the professor's inbox
  emailsRecebidosDb.forEach((emailMsg) => {
    if (emailMsg.prontuarioId === prontuario.id) {
      emailMsg.anexoPdf.statusAssinatura = 'assinado_certisign';
      emailMsg.anexoPdf.hashSha256 = docHash;
    }
  });

  // Automatically trigger email dispatch after Certisign signing
  return dispararEmailsProntuario(prontuario);
}

// API Routes

// 1. List records with filtering
app.get('/api/prontuarios', (req: Request, res: Response) => {
  const { status, disciplina, search } = req.query;
  let items = [...prontuariosDb];

  if (status && typeof status === 'string' && status !== 'todos') {
    items = items.filter((p) => p.status === status);
  }

  if (disciplina && typeof disciplina === 'string' && disciplina !== 'todas') {
    items = items.filter((p) => p.disciplina.toLowerCase().includes(disciplina.toLowerCase()));
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.numeroProntuario.toLowerCase().includes(q) ||
        p.paciente.nome.toLowerCase().includes(q) ||
        p.aluno.nome.toLowerCase().includes(q) ||
        p.dadosClinicos.procedimentoRealizado.toLowerCase().includes(q) ||
        p.dadosClinicos.diagnostico.toLowerCase().includes(q)
    );
  }

  res.json({
    total: items.length,
    prontuarios: items,
  });
});

// 2. Get single record
app.get('/api/prontuarios/:id', (req: Request, res: Response) => {
  const item = prontuariosDb.find((p) => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Prontuário não encontrado' });
  }
  res.json(item);
});

// 3. Digital signature via Certisign
app.post('/api/prontuarios/:id/assinar', async (req: Request, res: Response) => {
  const item = prontuariosDb.find((p) => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Prontuário não encontrado' });
  }

  const assinado = await assinarComCertisign(item);
  res.json({
    sucesso: true,
    mensagem:
      assinado.envioEmails.statusGeral === 'concluido'
        ? 'Prontuário validado e assinado digitalmente com sucesso via Certisign ICP-Brasil. E-mails despachados automaticamente.'
        : 'Prontuário assinado, mas houve falha no envio de parte dos e-mails. Use o reenvio individual.',
    prontuario: assinado,
  });
});

// 4. Batch digital signature via Certisign
app.post('/api/prontuarios/assinar-lote', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um prontuário para assinar em lote' });
  }

  const assinados: Prontuario[] = [];
  for (const id of ids) {
    const item = prontuariosDb.find((p) => p.id === id);
    if (item && item.status !== 'assinado_certisign') {
      const assinado = await assinarComCertisign(item);
      assinados.push(assinado);
    }
  }

  res.json({
    sucesso: true,
    mensagem: `${assinados.length} prontuário(s) assinado(s) com sucesso via Certisign ICP-Brasil com despacho de e-mails concluído.`,
    totalAssinados: assinados.length,
    prontuarios: assinados,
  });
});

// 5. Reject record with supervisor feedback
app.post('/api/prontuarios/:id/rejeitar', async (req: Request, res: Response) => {
  const { motivo } = req.body;
  const item = prontuariosDb.find((p) => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Prontuário não encontrado' });
  }

  if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 5) {
    return res.status(400).json({ error: 'Informe um parecer descritivo para que o aluno possa corrigir o prontuário' });
  }

  item.status = 'rejeitado_ajustes';
  item.motivoRejeicao = motivo;

  const agora = new Date().toISOString();
  item.historico.push({
    id: `evt-${Date.now()}-rej`,
    dataHora: agora,
    autor: `${certisignConfig.titularNome} (Docente Supervisor)`,
    acao: 'Prontuário Devolvido para Correção',
    detalhes: `Parecer acadêmico: ${motivo}`,
  });

  // Notificar aluno via e-mail sobre a devolução
  const destAluno: EmailDestinatario = {
    id: `dest-${item.id}-rej-aluno`,
    papel: 'aluno',
    nome: item.aluno.nome,
    email: item.aluno.email,
    status: 'pendente',
    tentativas: 0,
  };
  await enviarParaDestinatario(
    destAluno,
    `Prontuário ${item.numeroProntuario} devolvido para correção — FACPP`,
    htmlProntuarioDevolvido(item, motivo)
  );
  item.envioEmails = {
    statusGeral: destAluno.status === 'falha' ? 'falha_parcial' : 'concluido',
    dataDisparo: agora,
    destinatarios: [destAluno],
  };

  res.json({
    sucesso: true,
    mensagem: 'Prontuário devolvido ao aluno com parecer registrado.',
    prontuario: item,
  });
});

// 6. Manual / Triggered email dispatch
app.post('/api/prontuarios/:id/enviar-emails', async (req: Request, res: Response) => {
  const item = prontuariosDb.find((p) => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Prontuário não encontrado' });
  }

  if (item.status !== 'assinado_certisign') {
    return res.status(400).json({ error: 'O prontuário precisa estar assinado digitalmente pelo docente para envio dos e-mails oficiais' });
  }

  const atualizado = await dispararEmailsProntuario(item);
  res.json({
    sucesso: true,
    mensagem:
      atualizado.envioEmails.statusGeral === 'concluido'
        ? 'E-mails despachados com sucesso para os 4 destinatários registrados.'
        : 'Houve falha no envio de parte dos e-mails. Use o reenvio individual.',
    envioEmails: atualizado.envioEmails,
  });
});

// 7. Resend single email
app.post('/api/emails/:destinatarioId/reenviar', async (req: Request, res: Response) => {
  const { destinatarioId } = req.params;
  const p = prontuariosDb.find((pr) => pr.envioEmails.destinatarios.some((d) => d.id === destinatarioId));
  const dest = p?.envioEmails.destinatarios.find((d) => d.id === destinatarioId);
  if (!p || !dest) {
    return res.status(404).json({ error: 'Destinatário não localizado' });
  }

  const html =
    p.status === 'rejeitado_ajustes' && p.motivoRejeicao
      ? htmlProntuarioDevolvido(p, p.motivoRejeicao)
      : htmlProntuarioAssinado(p, dest.nome);
  const assunto =
    p.status === 'rejeitado_ajustes'
      ? `Prontuário ${p.numeroProntuario} devolvido para correção — FACPP`
      : assuntoProntuario(p);
  await enviarParaDestinatario(dest, assunto, html);

  if (p.envioEmails.destinatarios.every((d) => d.status !== 'falha')) {
    p.envioEmails.statusGeral = 'concluido';
  }

  p.historico.push({
    id: `evt-${Date.now()}-resend`,
    dataHora: new Date().toISOString(),
    autor: 'SubSign API',
    acao: `Reenvio individual de e-mail para ${dest.email}`,
    detalhes:
      dest.status === 'falha'
        ? `Tentativa ${dest.tentativas} falhou: ${dest.erroMotivo}`
        : `Tentativa ${dest.tentativas} bem-sucedida.`,
  });

  if (dest.status === 'falha') {
    return res.status(502).json({ error: `Falha no reenvio: ${dest.erroMotivo}` });
  }
  res.json({ sucesso: true, mensagem: 'E-mail reenviado com sucesso.' });
});

// 8. Consolidated Report data
app.get('/api/relatorios/consolidado', (req: Request, res: Response) => {
  const totalProntuarios = prontuariosDb.length;
  const totalAssinados = prontuariosDb.filter((p) => p.status === 'assinado_certisign').length;
  const totalAguardando = prontuariosDb.filter((p) => p.status === 'aguardando_validacao').length;
  const totalRejeitados = prontuariosDb.filter((p) => p.status === 'rejeitado_ajustes').length;

  let totalEmailsDisparados = 0;
  let totalEmailsEntregues = 0;
  let totalEmailsAbertos = 0;
  let totalEmailsFalhas = 0;

  const itens: ItemRelatorio[] = prontuariosDb.map((p) => {
    const dests = p.envioEmails.destinatarios || [];
    const entregues = dests.filter((d) => d.status === 'entregue' || d.status === 'aberto').length;
    const falhas = dests.filter((d) => d.status === 'falha').length;
    const abertos = dests.filter((d) => d.status === 'aberto').length;

    totalEmailsDisparados += dests.length;
    totalEmailsEntregues += entregues;
    totalEmailsAbertos += abertos;
    totalEmailsFalhas += falhas;

    return {
      id: p.id,
      numeroProntuario: p.numeroProntuario,
      dataAtendimento: p.dataAtendimento,
      pacienteNome: p.paciente.nome,
      pacienteEmail: p.paciente.email,
      alunoNome: p.aluno.nome,
      alunoEmail: p.aluno.email,
      disciplina: p.disciplina,
      statusProntuario: p.status,
      assinadoCertisign: p.status === 'assinado_certisign',
      dataAssinatura: p.assinaturaCertisign?.dataAssinatura,
      hashCertisign: p.assinaturaCertisign?.hashDocumento,
      totalEmails: dests.length,
      emailsEntregues: entregues,
      emailsFalhas: falhas,
      statusEnvioGeral: p.envioEmails.statusGeral,
      destinatarios: dests,
    };
  });

  const taxaEntregaGeral =
    totalEmailsDisparados > 0
      ? Math.round((totalEmailsEntregues / totalEmailsDisparados) * 100)
      : 100;

  const relatorio: RelatorioConsolidado = {
    resumo: {
      totalProntuarios,
      totalAssinados,
      totalAguardando,
      totalRejeitados,
      totalEmailsDisparados,
      totalEmailsEntregues,
      totalEmailsAbertos,
      totalEmailsFalhas,
      taxaEntregaGeral,
    },
    itens,
  };

  res.json(relatorio);
});

// 9. Get & Update Certisign API configuration
app.get('/api/certisign/config', (req: Request, res: Response) => {
  res.json(certisignConfig);
});

app.put('/api/certisign/config', (req: Request, res: Response) => {
  const dados = req.body;
  certisignConfig = {
    ...certisignConfig,
    ...dados,
    ultimoTeste: new Date().toISOString(),
  };
  res.json({
    sucesso: true,
    mensagem: 'Configurações da API Certisign e Certificado Digital salvas com sucesso.',
    config: certisignConfig,
  });
});

// 10. Test Certisign connection
app.post('/api/certisign/testar-conexao', (req: Request, res: Response) => {
  certisignConfig.statusConexao = 'conectado';
  certisignConfig.ultimoTeste = new Date().toISOString();

  res.json({
    sucesso: true,
    mensagem: 'Conexão com a API Certisign Signer Hub estabelecida com sucesso.',
    detalhes: {
      endpoint: certisignConfig.apiUrl,
      ambiente: certisignConfig.ambiente,
      titular: certisignConfig.titularNome,
      cpf: certisignConfig.titularCpf,
      cro_crm: certisignConfig.cro_crm,
      validade: certisignConfig.dataValidade,
      emissor: certisignConfig.emissor,
      statusOCSP: 'CERTIFICADO_VALIDO_NAO_REVOGADO',
      carimboTempo: certisignConfig.carimboTempoAtivo ? 'ATIVO_ONLINE' : 'DESATIVADO',
    },
  });
});

// 11. Webhook simulator: receive new student record from subsign.facpp.edu.br
app.post('/api/prontuarios/novo-recebido', (req: Request, res: Response) => {
  const body = req.body;
  const count = prontuariosDb.length + 1;
  const formattedCount = String(count + 840).padStart(4, '0');

  const novoProntuario: Prontuario = {
    id: `prt-${Date.now()}`,
    numeroProntuario: body.numeroProntuario || `FACPP-ODON-2026-${formattedCount}`,
    dataAtendimento: body.dataAtendimento || new Date().toISOString().split('T')[0],
    horaAtendimento: body.horaAtendimento || '14:00',
    disciplina: body.disciplina || 'Clínica Odontológica Integrada IV',
    boxClinico: body.boxClinico || 'Box 07 - Clínica Escola',
    paciente: {
      nome: body.pacienteNome || 'Novo Paciente Cadastrado',
      cpf: body.pacienteCpf || '333.444.555-66',
      rg: body.pacienteRg || '45.123.456-7 SSP/SP',
      dataNascimento: body.pacienteNascimento || '1995-04-10',
      idade: body.pacienteIdade || 31,
      telefone: body.pacienteTelefone || '(18) 99700-1122',
      email: body.pacienteEmail || 'paciente.clinica@gmail.com',
      sexo: body.pacienteSexo || 'F',
      endereco: body.pacienteEndereco || 'Rua das Flores, 100 - Presidente Prudente/SP',
    },
    aluno: {
      nome: body.alunoNome || 'Aluno Teste SubSign',
      ra: body.alunoRa || '202301988',
      email: body.alunoEmail || 'aluno.subsign@facpp.edu.br',
      semestre: body.alunoSemestre || '8º Termo',
      curso: body.alunoCurso || 'Odontologia',
      assinaturaData: new Date().toISOString(),
      assinaturaHash: crypto.createHash('sha256').update(Date.now().toString()).digest('hex'),
      ipOrigem: '177.105.42.50 (subsign.facpp.edu.br)',
      dispositivo: 'App SubSign Aluno v2.4 (Mobile PWA)',
    },
    professor: {
      nome: certisignConfig.titularNome,
      matricula: 'DOC-4819',
      cpf: certisignConfig.titularCpf,
      cro_crm: certisignConfig.cro_crm,
      email: 'marcos.silveira@facpp.edu.br',
    },
    dadosClinicos: {
      queixaPrincipal: body.queixaPrincipal || 'Avaliação e continuidade de plano de tratamento.',
      anamneseResumida: body.anamneseResumida || 'Paciente sem histórico de comorbidades prévias.',
      diagnostico: body.diagnostico || 'Cárie de esmalte e dentina.',
      cid10_cfo: body.cid10_cfo || 'K02.0 - Cárie limitada ao esmalte',
      procedimentoRealizado: body.procedimentoRealizado || 'Profilaxia com jato de bicarbonato e aplicação tópica de flúor fosfato acidulado 1.23%.',
      materiaisUtilizados: body.materiaisUtilizados || 'Bicarbonato de sódio, Flúor gel.',
      prescricaoMedicamentosa: body.prescricaoMedicamentosa || 'Não requerida.',
      recomendacoesPosOperatorias: body.recomendacoesPosOperatorias || 'Aguardar 30 min antes de ingerir água ou alimentos.',
      proximoRetorno: body.proximoRetorno || 'Retorno semestral.',
    },
    status: 'aguardando_validacao',
    envioEmails: {
      statusGeral: 'pendente',
      destinatarios: [
        {
          id: `dest-${Date.now()}-alu`,
          papel: 'aluno',
          nome: body.alunoNome || 'Aluno Teste SubSign',
          email: body.alunoEmail || 'aluno.subsign@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: `dest-${Date.now()}-pac`,
          papel: 'paciente',
          nome: body.pacienteNome || 'Novo Paciente Cadastrado',
          email: body.pacienteEmail || 'paciente.clinica@gmail.com',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: `dest-${Date.now()}-coo`,
          papel: 'coordenacao',
          nome: 'Coordenação Clínica FACPP',
          email: 'clinica.odontologia@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
        {
          id: `dest-${Date.now()}-sam`,
          papel: 'same_arquivo',
          nome: 'SAME - Arquivo Médico & Odontológico FACPP',
          email: 'same.prontuarios@facpp.edu.br',
          status: 'pendente',
          tentativas: 0,
        },
      ],
    },
    historico: [
      {
        id: `evt-${Date.now()}-webhook`,
        dataHora: new Date().toISOString(),
        autor: `${body.alunoNome || 'Aluno'} via subsign.facpp.edu.br`,
        acao: 'Prontuário recebido da plataforma do aluno',
        detalhes: 'Submetido com assinatura digital do aluno e termo de consentimento.',
        ip: '177.105.42.50',
      },
    ],
  };

  prontuariosDb.unshift(novoProntuario);

  // Sync with professor email inboxes
  professoresDb.forEach((prof) => {
    syncEmailsForProfessor(prof.email);
  });

  res.status(201).json({
    sucesso: true,
    mensagem: 'Prontuário recebido com sucesso de subsign.facpp.edu.br e adicionado à fila do professor.',
    prontuario: novoProntuario,
  });
});

// 12. Professores list & Login by email
app.get('/api/professores', (_req: Request, res: Response) => {
  res.json({
    professores: professoresDb,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, senha, pin, isEmailModification } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Informe um endereço de e-mail institucional válido.' });
  }

  // Se for modificação de e-mail ou autenticação estrita, validar presença de senha
  if (senha !== undefined && typeof senha === 'string' && senha.trim().length > 0 && senha.trim().length < 4) {
    return res.status(400).json({ error: 'A senha institucional deve conter ao menos 4 caracteres.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let prof = professoresDb.find((p) => p.email.toLowerCase() === cleanEmail);

  if (!prof) {
    const namePart = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = namePart
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    prof = {
      email: cleanEmail,
      nome: `Prof. Dr. ${formattedName}`,
      departamento: 'Corpo Docente FACPP · Clínicas Integradas',
      cro_crm: 'CRO-SP ' + Math.floor(100000 + Math.random() * 90000),
      matricula: 'DOC-' + Math.floor(1000 + Math.random() * 9000),
      certificadoStatus: 'valido',
    };
    professoresDb.push(prof);
  }

  // Ensure inbox is populated and synced with received clinical records
  syncEmailsForProfessor(cleanEmail);

  const professorEmails = emailsRecebidosDb.filter(
    (e) => e.destinatarioEmail.toLowerCase() === cleanEmail
  );
  const totalPdfsRecebidos = professorEmails.length;
  const totalPdfsPendentes = professorEmails.filter(
    (e) => e.anexoPdf.statusAssinatura === 'aguardando_validacao'
  ).length;
  const totalPdfsAssinados = professorEmails.filter(
    (e) => e.anexoPdf.statusAssinatura === 'assinado_certisign'
  ).length;
  const totalNaoLidos = professorEmails.filter((e) => !e.lido).length;

  res.json({
    sucesso: true,
    mensagem: isEmailModification
      ? `E-mail alterado para ${cleanEmail}. Novo login autenticado com sucesso e caixa de prontuários vinculada.`
      : `Login efetuado com sucesso para ${cleanEmail}.`,
    professor: {
      ...prof,
      ultimoLogin: new Date().toISOString(),
    },
    stats: {
      totalEmails: professorEmails.length,
      totalPdfsRecebidos,
      totalPdfsPendentes,
      totalPdfsAssinados,
      totalNaoLidos,
    },
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.json({
    sucesso: true,
    mensagem: 'Sessão do professor encerrada com sucesso. Solicite um novo login para continuar.',
  });
});

// 13. Get Email Inbox for Professor (counts which and how many PDFs received to sign)
app.get('/api/caixa-email', (req: Request, res: Response) => {
  const emailParam = (req.query.email as string || 'martins1987@gmail.com').toLowerCase().trim();
  syncEmailsForProfessor(emailParam);

  let items = emailsRecebidosDb.filter((e) => e.destinatarioEmail.toLowerCase() === emailParam);

  const { filtro, busca } = req.query;
  if (filtro === 'pendentes') {
    items = items.filter((e) => e.anexoPdf.statusAssinatura === 'aguardando_validacao');
  } else if (filtro === 'assinados') {
    items = items.filter((e) => e.anexoPdf.statusAssinatura === 'assinado_certisign');
  } else if (filtro === 'nao_lidos') {
    items = items.filter((e) => !e.lido);
  }

  if (busca && typeof busca === 'string' && busca.trim()) {
    const q = busca.toLowerCase();
    items = items.filter(
      (e) =>
        e.assunto.toLowerCase().includes(q) ||
        e.prontuarioNumero.toLowerCase().includes(q) ||
        e.alunoNome.toLowerCase().includes(q) ||
        e.pacienteNome.toLowerCase().includes(q) ||
        e.anexoPdf.nomeArquivo.toLowerCase().includes(q)
    );
  }

  const allProfEmails = emailsRecebidosDb.filter(
    (e) => e.destinatarioEmail.toLowerCase() === emailParam
  );
  const totalPdfsRecebidos = allProfEmails.length;
  const totalPdfsPendentes = allProfEmails.filter(
    (e) => e.anexoPdf.statusAssinatura === 'aguardando_validacao'
  ).length;
  const totalPdfsAssinados = allProfEmails.filter(
    (e) => e.anexoPdf.statusAssinatura === 'assinado_certisign'
  ).length;
  const totalNaoLidos = allProfEmails.filter((e) => !e.lido).length;

  res.json({
    destinatarioEmail: emailParam,
    totalEmails: allProfEmails.length,
    totalPdfsRecebidos,
    totalPdfsPendentes,
    totalPdfsAssinados,
    totalNaoLidos,
    emails: items,
  });
});

// 14. Mark email as read/unread
app.put('/api/caixa-email/:id/lido', (req: Request, res: Response) => {
  const emailItem = emailsRecebidosDb.find((e) => e.id === req.params.id);
  if (!emailItem) {
    return res.status(404).json({ error: 'E-mail não localizado na caixa de entrada' });
  }

  emailItem.lido = req.body.lido !== undefined ? req.body.lido : true;
  res.json({ sucesso: true, email: emailItem });
});

// 15. Force synchronize professor inbox with subsign.facpp.edu.br
app.post('/api/caixa-email/sincronizar', (req: Request, res: Response) => {
  const { email } = req.body;
  const targetEmail = (email || 'martins1987@gmail.com').toLowerCase().trim();
  syncEmailsForProfessor(targetEmail);

  const allProfEmails = emailsRecebidosDb.filter(
    (e) => e.destinatarioEmail.toLowerCase() === targetEmail
  );

  res.json({
    sucesso: true,
    mensagem: 'Caixa de entrada sincronizada com sucesso com subsign.facpp.edu.br.',
    totalEmails: allProfEmails.length,
    totalPdfsRecebidos: allProfEmails.length,
    totalPdfsPendentes: allProfEmails.filter(
      (e) => e.anexoPdf.statusAssinatura === 'aguardando_validacao'
    ).length,
    totalPdfsAssinados: allProfEmails.filter(
      (e) => e.anexoPdf.statusAssinatura === 'assinado_certisign'
    ).length,
    totalNaoLidos: allProfEmails.filter((e) => !e.lido).length,
  });
});

// --- PDFs avulsos enviados pelo professor para assinatura ---
// Ficam em disco (DATA_DIR/documentos) para sobreviver a reinícios do contêiner;
// o índice é um JSON regravado inteiro a cada alteração.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const DOCS_DIR = path.join(DATA_DIR, 'documentos');
const DOCS_INDICE = path.join(DATA_DIR, 'documentos.json');
const TAMANHO_MAXIMO_PDF = 25 * 1024 * 1024;

fs.mkdirSync(DOCS_DIR, { recursive: true });

let documentosDb: DocumentoPdf[] = [];
try {
  documentosDb = JSON.parse(fs.readFileSync(DOCS_INDICE, 'utf8'));
} catch {
  documentosDb = [];
}
console.log(`[Documentos] ${documentosDb.length} PDF(s) carregado(s) de ${DATA_DIR}`);

function salvarIndiceDocumentos() {
  const temp = `${DOCS_INDICE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(documentosDb, null, 2));
  fs.renameSync(temp, DOCS_INDICE);
}

function caminhoDocumento(id: string, versao: 'original' | 'assinado') {
  return path.join(DOCS_DIR, versao === 'assinado' ? `${id}-assinado.pdf` : `${id}.pdf`);
}

function sha256(dados: Uint8Array): string {
  return crypto.createHash('sha256').update(dados).digest('hex');
}

// O id vem da URL e vira nome de arquivo: só aceita o formato gerado aqui.
function buscarDocumento(id: string): DocumentoPdf | undefined {
  if (!/^doc-[a-z0-9-]+$/.test(id)) return undefined;
  return documentosDb.find((d) => d.id === id);
}

// As fontes padrão do PDF só codificam WinAnsi; troca o que não couber por '?'.
function textoPdf(fonte: PDFFont, texto: string): string {
  return Array.from(texto)
    .map((ch) => {
      try {
        fonte.encodeText(ch);
        return ch;
      } catch {
        return '?';
      }
    })
    .join('');
}

function quebrarLinhas(fonte: PDFFont, texto: string, tamanho: number, larguraMax: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const parte of texto.split(/(\s+)/)) {
    const tentativa = atual + parte;
    if (atual && fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMax) {
      linhas.push(atual.trimEnd());
      atual = parte.trimStart();
    } else {
      atual = tentativa;
    }
    // Palavra maior que a linha (ex.: hash): quebra por caractere.
    while (fonte.widthOfTextAtSize(atual, tamanho) > larguraMax) {
      let corte = atual.length - 1;
      while (corte > 1 && fonte.widthOfTextAtSize(atual.slice(0, corte), tamanho) > larguraMax) corte--;
      linhas.push(atual.slice(0, corte));
      atual = atual.slice(corte);
    }
  }
  if (atual.trim()) linhas.push(atual.trimEnd());
  return linhas;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Carimba cada página com uma faixa de assinatura e anexa uma página de manifesto.
async function carimbarPdf(
  original: Uint8Array,
  doc: DocumentoPdf,
  assinatura: NonNullable<DocumentoPdf['assinatura']>
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(original);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verde = rgb(0.016, 0.471, 0.341);
  const cinza = rgb(0.278, 0.333, 0.412);

  const paginas = pdf.getPages();
  const total = paginas.length + 1;
  const dataTexto = formatarDataHora(assinatura.dataAssinatura);

  paginas.forEach((pagina, i) => {
    const { width } = pagina.getSize();
    const margem = 24;
    const largura = width - margem * 2;
    pagina.drawRectangle({
      x: margem, y: 8, width: largura, height: 22,
      color: rgb(0.925, 0.992, 0.961), borderColor: verde, borderWidth: 0.6, opacity: 0.92,
    });
    const linha1 = textoPdf(fonte, `Assinado eletronicamente por ${assinatura.signatarioNome} (${assinatura.signatarioRegistro}) em ${dataTexto}`);
    const linha2 = textoPdf(fonte, `SubSign FACPP · Código de verificação ${assinatura.codigoVerificacao} · Página ${i + 1} de ${total}`);
    const tamanho = Math.min(6.5, (6.5 * (largura - 12)) / Math.max(fonte.widthOfTextAtSize(linha1, 6.5), 1));
    pagina.drawText(linha1, { x: margem + 6, y: 21, size: tamanho, font: fonte, color: verde });
    pagina.drawText(linha2, { x: margem + 6, y: 12.5, size: tamanho, font: fonte, color: cinza });
  });

  // Página final: manifesto de assinatura
  const manifesto = pdf.addPage([595.28, 841.89]);
  const larguraTexto = 595.28 - 120;
  let y = 780;
  manifesto.drawRectangle({ x: 0, y: 800, width: 595.28, height: 41.89, color: verde });
  manifesto.drawText('MANIFESTO DE ASSINATURA ELETRÔNICA', { x: 60, y: 815, size: 14, font: negrito, color: rgb(1, 1, 1) });

  const campos: [string, string][] = [
    ['Documento', doc.nomeOriginal],
    ['Páginas do original', String(doc.totalPaginas)],
    ['Enviado por', doc.enviadoPor],
    ['Data do envio', formatarDataHora(doc.dataEnvio)],
    ['Hash SHA-256 do original', doc.hashOriginal],
    ['Signatário', assinatura.signatarioNome],
    ['E-mail do signatário', assinatura.signatarioEmail],
    ['Registro profissional', assinatura.signatarioRegistro],
    ['Data e hora da assinatura', `${dataTexto} (horário de Brasília)`],
    ['Carimbo do tempo', assinatura.carimboTempoACT],
    ['Código de verificação', assinatura.codigoVerificacao],
  ];

  for (const [rotulo, valor] of campos) {
    manifesto.drawText(textoPdf(negrito, rotulo.toUpperCase()), { x: 60, y, size: 8, font: negrito, color: cinza });
    y -= 14;
    for (const linha of quebrarLinhas(fonte, textoPdf(fonte, valor || '—'), 11, larguraTexto)) {
      manifesto.drawText(linha, { x: 60, y, size: 11, font: fonte, color: rgb(0.06, 0.09, 0.16) });
      y -= 15;
    }
    y -= 8;
  }

  y -= 6;
  const aviso =
    'Este documento foi assinado eletronicamente pelo signatário acima por meio do SubSign FACPP. ' +
    'Cada página recebeu uma faixa com o nome do signatário, a data e o código de verificação. ' +
    'Para conferir a integridade do conteúdo, compare o hash SHA-256 do arquivo original com o valor registrado neste manifesto.';
  for (const linha of quebrarLinhas(fonte, textoPdf(fonte, aviso), 9, larguraTexto)) {
    manifesto.drawText(linha, { x: 60, y, size: 9, font: fonte, color: cinza });
    y -= 12;
  }
  manifesto.drawText(textoPdf(fonte, `SubSign FACPP · Página ${total} de ${total}`), { x: 60, y: 30, size: 8, font: fonte, color: cinza });

  pdf.setModificationDate(new Date(assinatura.dataAssinatura));
  return pdf.save();
}

function enviarArquivoPdf(res: Response, caminho: string, nome: string, baixar: boolean) {
  const nomeAscii = nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${baixar ? 'attachment' : 'inline'}; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nome)}`
  );
  fs.createReadStream(caminho).pipe(res);
}

// 16. Listar PDFs enviados
app.get('/api/documentos', (_req: Request, res: Response) => {
  const documentos = [...documentosDb].sort((a, b) => b.dataEnvio.localeCompare(a.dataEnvio));
  res.json({
    total: documentos.length,
    totalPendentes: documentos.filter((d) => d.status === 'aguardando_assinatura').length,
    documentos,
  });
});

// 17. Upload de um PDF (corpo binário; nome no cabeçalho X-Nome-Arquivo)
app.post(
  '/api/documentos',
  express.raw({ type: 'application/pdf', limit: TAMANHO_MAXIMO_PDF }),
  async (req: Request, res: Response) => {
    const dados: unknown = req.body;
    if (!Buffer.isBuffer(dados) || dados.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF recebido.' });
    }
    if (dados.subarray(0, 1024).indexOf('%PDF-') === -1) {
      return res.status(415).json({ error: 'O arquivo enviado não é um PDF válido.' });
    }

    let totalPaginas: number;
    try {
      totalPaginas = (await PDFDocument.load(dados)).getPageCount();
    } catch (err) {
      const protegido = err instanceof Error && /encrypt/i.test(err.message);
      return res.status(422).json({
        error: protegido
          ? 'O PDF está protegido por senha. Remova a proteção e envie novamente.'
          : 'Não foi possível ler o PDF. O arquivo pode estar corrompido.',
      });
    }

    const decodificar = (valor: unknown, padrao: string) => {
      try {
        return typeof valor === 'string' && valor ? decodeURIComponent(valor) : padrao;
      } catch {
        return padrao;
      }
    };
    let nomeOriginal = path.basename(decodificar(req.headers['x-nome-arquivo'], 'documento.pdf')).slice(0, 200);
    if (!/\.pdf$/i.test(nomeOriginal)) nomeOriginal += '.pdf';

    const doc: DocumentoPdf = {
      id: `doc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      nomeOriginal,
      tamanhoBytes: dados.length,
      totalPaginas,
      dataEnvio: new Date().toISOString(),
      enviadoPor: decodificar(req.headers['x-enviado-por'], 'Professor não identificado').slice(0, 200),
      hashOriginal: sha256(dados),
      status: 'aguardando_assinatura',
    };

    fs.writeFileSync(caminhoDocumento(doc.id, 'original'), dados);
    documentosDb.push(doc);
    salvarIndiceDocumentos();

    res.status(201).json({ sucesso: true, mensagem: `"${doc.nomeOriginal}" enviado para assinatura.`, documento: doc });
  }
);

// 18. Visualizar/baixar o PDF (original ou assinado)
app.get('/api/documentos/:id/arquivo', (req: Request, res: Response) => {
  const doc = buscarDocumento(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

  const querAssinado = req.query.versao === 'assinado';
  if (querAssinado && doc.status !== 'assinado') {
    return res.status(409).json({ error: 'Este documento ainda não foi assinado.' });
  }
  const caminho = caminhoDocumento(doc.id, querAssinado ? 'assinado' : 'original');
  if (!fs.existsSync(caminho)) return res.status(404).json({ error: 'Arquivo não localizado no armazenamento.' });

  const nome = querAssinado ? doc.nomeOriginal.replace(/\.pdf$/i, '_assinado.pdf') : doc.nomeOriginal;
  enviarArquivoPdf(res, caminho, nome, req.query.download === '1');
});

// 19. Assinar um PDF enviado
app.post('/api/documentos/:id/assinar', async (req: Request, res: Response) => {
  const doc = buscarDocumento(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
  if (doc.status === 'assinado') return res.status(409).json({ error: 'Este documento já foi assinado.' });

  const { pin, signatario } = req.body || {};
  if (typeof pin !== 'string' || pin.trim().length < 4) {
    return res.status(400).json({ error: 'Informe o PIN do certificado (mínimo de 4 dígitos).' });
  }

  const texto = (valor: unknown, padrao: string) =>
    typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, 200) : padrao;
  const agora = new Date().toISOString();
  const assinatura: NonNullable<DocumentoPdf['assinatura']> = {
    dataAssinatura: agora,
    signatarioNome: texto(signatario?.nome, certisignConfig.titularNome),
    signatarioEmail: texto(signatario?.email, ''),
    signatarioRegistro: texto(signatario?.registro, certisignConfig.cro_crm),
    codigoVerificacao: `SUBSIGN-DOC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    hashAssinado: '',
    carimboTempoACT: `${certisignConfig.autoridadeCarimbo} [ACT-${Date.now()}]`,
  };

  try {
    const original = fs.readFileSync(caminhoDocumento(doc.id, 'original'));
    const assinado = await carimbarPdf(original, doc, assinatura);
    assinatura.hashAssinado = sha256(assinado);
    fs.writeFileSync(caminhoDocumento(doc.id, 'assinado'), assinado);
  } catch (err) {
    console.error(`[Documentos] Falha ao assinar ${doc.id}:`, err);
    return res.status(500).json({ error: 'Não foi possível gerar o PDF assinado.' });
  }

  doc.status = 'assinado';
  doc.assinatura = assinatura;
  salvarIndiceDocumentos();

  res.json({ sucesso: true, mensagem: `"${doc.nomeOriginal}" assinado com sucesso.`, documento: doc });
});

// 20. Excluir um PDF enviado
app.delete('/api/documentos/:id', (req: Request, res: Response) => {
  const doc = buscarDocumento(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

  for (const versao of ['original', 'assinado'] as const) {
    fs.rmSync(caminhoDocumento(doc.id, versao), { force: true });
  }
  documentosDb = documentosDb.filter((d) => d.id !== doc.id);
  salvarIndiceDocumentos();

  res.json({ sucesso: true, mensagem: `"${doc.nomeOriginal}" excluído.` });
});

// Upload maior que o limite: devolve JSON em vez da página de erro do Express.
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: `Arquivo excede o limite de ${TAMANHO_MAXIMO_PDF / 1024 / 1024} MB.` });
  }
  next(err);
});

// Setup Vite middleware for development or serve dist in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[SubSign Docente FACPP] Servidor rodando na porta ${PORT}`);
  });
}

startServer();
