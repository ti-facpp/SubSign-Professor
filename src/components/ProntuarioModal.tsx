import React, { useState } from 'react';
import {
  X,
  FileCheck2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Mail,
  User,
  GraduationCap,
  Calendar,
  Building2,
  RefreshCw,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Share2,
} from 'lucide-react';
import { Prontuario } from '../types/index.ts';

interface ProntuarioModalProps {
  prontuario: Prontuario;
  onClose: () => void;
  onSign: (prontuario: Prontuario) => void;
  onResendEmail: (destinatarioId: string) => void;
  onResendAllEmails: (id: string) => void;
  onOpenOfficialDoc: (prontuario: Prontuario) => void;
}

export const ProntuarioModal: React.FC<ProntuarioModalProps> = ({
  prontuario,
  onClose,
  onSign,
  onResendEmail,
  onResendAllEmails,
  onOpenOfficialDoc,
}) => {
  const [activeTab, setActiveTab] = useState<'clinico' | 'assinaturas' | 'emails' | 'auditoria'>('clinico');

  const isSigned = prontuario.status === 'assinado_certisign';
  const isPending = prontuario.status === 'aguardando_validacao';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {prontuario.numeroProntuario}
                </h2>
                {isSigned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Assinado Certisign ICP-Brasil
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Aguardando Assinatura do Docente
                  </span>
                )}
                {prontuario.status === 'rejeitado_ajustes' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    Devolvido p/ Correção
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {prontuario.disciplina} · {prontuario.boxClinico} · Atendimento em{' '}
                {new Date(prontuario.dataAtendimento).toLocaleDateString('pt-BR')} às {prontuario.horaAtendimento}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('clinico')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'clinico'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Dados Clínicos & Procedimento
          </button>
          <button
            onClick={() => setActiveTab('assinaturas')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'assinaturas'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Assinaturas Digitais & Criptografia</span>
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'emails'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Despacho de E-mails ({prontuario.envioEmails.destinatarios?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'auditoria'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Trilha de Auditoria ({prontuario.historico.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* TAB 1: DADOS CLÍNICOS */}
          {activeTab === 'clinico' && (
            <div className="space-y-6">
              {/* Header Grid: Paciente & Aluno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paciente */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-slate-200 pb-1.5">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Identificação do Paciente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Nome Completo:</span>
                      <strong className="text-slate-800">{prontuario.paciente.nome}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">CPF:</span>
                      <span className="font-mono">{prontuario.paciente.cpf}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Data Nasc. / Idade:</span>
                      <span>
                        {new Date(prontuario.paciente.dataNascimento).toLocaleDateString('pt-BR')} ({prontuario.paciente.idade} anos)
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Telefone:</span>
                      <span>{prontuario.paciente.telefone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-400 block">E-mail Cadastrado para Envio:</span>
                      <span className="font-mono text-emerald-800">{prontuario.paciente.email}</span>
                    </div>
                    {prontuario.paciente.endereco && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-slate-400 block">Endereço Residencial:</span>
                        <span>{prontuario.paciente.endereco}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aluno */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      <span>Discente Responsável (SubSign)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                      Assinado no App
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Nome do Aluno:</span>
                      <strong className="text-slate-800">{prontuario.aluno.nome}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">RA Acadêmico:</span>
                      <span className="font-mono font-semibold">{prontuario.aluno.ra}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Curso & Período:</span>
                      <span>
                        {prontuario.aluno.curso} · {prontuario.aluno.semestre}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">E-mail Institucional:</span>
                      <span className="font-mono">{prontuario.aluno.email}</span>
                    </div>
                    <div className="col-span-2 bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Dispositivo / Assinatura do Aluno:</span>
                      <span className="text-[11px] text-slate-700 font-mono">
                        {prontuario.aluno.dispositivo} · IP: {prontuario.aluno.ipOrigem}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Clínicas Detalhadas */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                  Detalhes do Atendimento Clínico
                </h3>

                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                    Queixa Principal:
                  </span>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                    {prontuario.dadosClinicos.queixaPrincipal}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                    Anamnese & Histórico Clínico:
                  </span>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                    {prontuario.dadosClinicos.anamneseResumida}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                      Diagnóstico Clínico:
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium border border-slate-100">
                      {prontuario.dadosClinicos.diagnostico}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                      Classificação CID-10 / CFO:
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-mono border border-slate-100">
                      {prontuario.dadosClinicos.cid10_cfo}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                    Procedimento Realizado & Técnica Empregada:
                  </span>
                  <p className="p-3 bg-emerald-50/50 rounded-lg text-slate-800 leading-relaxed border border-emerald-100">
                    {prontuario.dadosClinicos.procedimentoRealizado}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                    Materiais & Medicamentos Utilizados na Sessão:
                  </span>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                    {prontuario.dadosClinicos.materiaisUtilizados}
                  </p>
                </div>

                {prontuario.dadosClinicos.prescricaoMedicamentosa && (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                      Prescrição Medicamentosa:
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-mono border border-slate-100">
                      {prontuario.dadosClinicos.prescricaoMedicamentosa}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                      Recomendações Pós-Atendimento:
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                      {prontuario.dadosClinicos.recomendacoesPosOperatorias || 'Orientações padrão fornecidas.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                      Previsão de Próximo Retorno:
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium border border-slate-100">
                      {prontuario.dadosClinicos.proximoRetorno || 'A agendar conforme evolução.'}
                    </p>
                  </div>
                </div>

                {prontuario.motivoRejeicao && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-xs font-bold text-rose-800 block mb-1">
                      Parecer de Devolução do Docente para Correção:
                    </span>
                    <p className="text-rose-900">{prontuario.motivoRejeicao}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ASSINATURAS DIGITAIS */}
          {activeTab === 'assinaturas' && (
            <div className="space-y-4">
              {/* Assinatura do Aluno */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <GraduationCap className="w-4 h-4 text-slate-600" />
                    <span>Assinatura Digital do Aluno (SubSign FACPP)</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Autenticada no Sistema do Aluno
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Signatário:</span>
                    <strong className="text-slate-800">{prontuario.aluno.nome}</strong> (RA: {prontuario.aluno.ra})
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Data e Hora do Registro:</span>
                    <span>{new Date(prontuario.aluno.assinaturaData).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-400 block">Hash Criptográfico do Discente (SHA-256):</span>
                    <div className="p-2 bg-slate-50 rounded font-mono text-[11px] break-all border border-slate-200 text-slate-700">
                      {prontuario.aluno.assinaturaHash}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assinatura do Professor (Certisign ICP-Brasil) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    <span>Assinatura Digital do Docente (Certisign ICP-Brasil)</span>
                  </div>
                  {isSigned ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Certificado Válido & Carimbo do Tempo Ativo
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Pendente de Assinatura
                    </span>
                  )}
                </div>

                {isSigned && prontuario.assinaturaCertisign ? (
                  <div className="space-y-3 text-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Titular do Certificado Digital:</span>
                        <strong className="text-slate-900">{prontuario.assinaturaCertisign.titularCertificado}</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">e-CPF / Registro Profissional:</span>
                        <span className="font-mono text-slate-800">{prontuario.assinaturaCertisign.cpfTitular} · {prontuario.professor.cro_crm}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Autoridade Certificadora Emissora:</span>
                        <span className="font-medium text-emerald-900">{prontuario.assinaturaCertisign.autoridadeCertificadora}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Carimbo do Tempo Criptográfico (ACT):</span>
                        <span className="font-mono text-slate-700 text-[11px]">{prontuario.assinaturaCertisign.carimboTempoACT}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Número de Série do Certificado:</span>
                        <span className="font-mono text-[11px] text-slate-800">{prontuario.assinaturaCertisign.numeroSerieCertificado}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Código de Verificação de Autenticidade:</span>
                        <span className="font-mono font-bold text-emerald-800">{prontuario.assinaturaCertisign.codigoVerificacao}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Hash SHA-256 do Documento Assinado:</span>
                      <div className="p-2.5 bg-slate-50 rounded-lg font-mono text-[11px] break-all border border-slate-200 text-slate-900">
                        {prontuario.assinaturaCertisign.hashDocumento}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-500">
                    <p className="text-sm">Este prontuário ainda não foi assinado pelo docente supervisor.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clique no botão &quot;Assinar via Certisign ICP-Brasil&quot; abaixo para validar as informações clínicas e gerar a assinatura com o seu certificado digital.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DESPACHO DE E-MAILS */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Destinatários Oficiais Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Após a assinatura do professor, o sistema despacha o prontuário assinado e o protocolo de validação para todos os envolvidos.
                  </p>
                </div>
                {isSigned && (
                  <button
                    onClick={() => onResendAllEmails(prontuario.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reenviar Todos</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {prontuario.envioEmails.destinatarios?.map((dest) => (
                  <div
                    key={dest.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800">{dest.nome}</strong>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {dest.papel.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {dest.email}
                        </div>
                        {dest.dataHoraEnvio && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Enviado em {new Date(dest.dataHoraEnvio).toLocaleString('pt-BR')} · ID:{' '}
                            <span className="font-mono">{dest.mensagemId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {dest.status === 'entregue' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Entregue
                        </span>
                      )}
                      {dest.status === 'aberto' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Aberto pelo destinatário
                        </span>
                      )}
                      {dest.status === 'pendente' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Aguardando assinatura
                        </span>
                      )}
                      {dest.status === 'falha' && (
                        <button
                          onClick={() => onResendEmail(dest.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reenviar E-mail
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">
                Linha do Tempo de Rastreabilidade & Validação
              </h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {prontuario.historico.map((evt) => (
                  <div key={evt.id} className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white"></span>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-800 font-semibold">{evt.acao}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(evt.dataHora).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{evt.detalhes}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Responsável: {evt.autor} {evt.ip ? `· IP: ${evt.ip}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSigned && (
              <button
                onClick={() => onOpenOfficialDoc(prontuario)}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Emitir Prontuário Oficial c/ Selo Certisign</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPending && (
              <button
                onClick={() => onSign(prontuario)}
                className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Validar & Assinar com Certisign</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
