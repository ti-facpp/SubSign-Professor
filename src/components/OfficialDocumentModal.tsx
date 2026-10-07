import React from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileCheck2,
  QrCode,
  Download,
} from 'lucide-react';
import { Prontuario } from '../types/index.ts';

interface OfficialDocumentModalProps {
  prontuario: Prontuario;
  onClose: () => void;
}

export const OfficialDocumentModal: React.FC<OfficialDocumentModalProps> = ({
  prontuario,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isSigned = prontuario.status === 'assinado_certisign';
  const sign = prontuario.assinaturaCertisign;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-scaleIn print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls - Hidden during print */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">
              Documento Oficial com Certificação Digital Certisign ICP-Brasil
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 text-slate-900 bg-white font-sans text-xs space-y-6 print:p-6 print:text-black">
          {/* Institutional Header */}
          <div className="border-b-2 border-emerald-900 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xl font-black tracking-tight text-emerald-950 uppercase">
                FACPP · Faculdade de Presidente Prudente
              </div>
              <div className="text-xs font-bold text-slate-700 tracking-wide mt-0.5">
                CLÍNICAS ESCOLA INTEGRADAS DE SAÚDE & ODONTOLOGIA
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Rodovia Raposo Tavares, Km 572 · Presidente Prudente - SP · CEP 19067-175
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                PRONTUÁRIO CLÍNICO ELETRÔNICO
              </span>
              <span className="text-base font-black font-mono text-emerald-900 block">
                {prontuario.numeroProntuario}
              </span>
              <span className="text-[11px] text-slate-600 font-mono">
                Data: {new Date(prontuario.dataAtendimento).toLocaleDateString('pt-BR')} às {prontuario.horaAtendimento}
              </span>
            </div>
          </div>

          {/* Identification Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Dados do Paciente
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {prontuario.paciente.nome}
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 mt-1 font-mono">
                <div>CPF: {prontuario.paciente.cpf} · RG: {prontuario.paciente.rg || 'Não informado'}</div>
                <div>Nascimento: {new Date(prontuario.paciente.dataNascimento).toLocaleDateString('pt-BR')} ({prontuario.paciente.idade} anos)</div>
                <div>Telefone: {prontuario.paciente.telefone}</div>
                <div>E-mail: {prontuario.paciente.email}</div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Supervisão Acadêmica
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {prontuario.disciplina}
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 mt-1">
                <div>
                  Local: <strong>{prontuario.boxClinico}</strong>
                </div>
                <div>
                  Docente Supervisor: <strong>{prontuario.professor.nome}</strong> ({prontuario.professor.cro_crm})
                </div>
                <div>
                  Discente Atendente: <strong>{prontuario.aluno.nome}</strong> (RA: {prontuario.aluno.ra} - {prontuario.aluno.semestre})
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Procedure Content */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                1. Queixa Principal & Anamnese
              </span>
              <p className="mt-1 text-slate-700 leading-relaxed">
                <strong>Queixa:</strong> {prontuario.dadosClinicos.queixaPrincipal}
              </p>
              <p className="mt-1 text-slate-700 leading-relaxed">
                <strong>Histórico Clínico:</strong> {prontuario.dadosClinicos.anamneseResumida}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  2. Diagnóstico Clínico
                </span>
                <p className="mt-1 text-slate-800 font-medium">
                  {prontuario.dadosClinicos.diagnostico}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  3. Código CID-10 / CFO
                </span>
                <p className="mt-1 font-mono text-slate-800 font-semibold">
                  {prontuario.dadosClinicos.cid10_cfo}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                4. Procedimento Executado & Técnica Operatória
              </span>
              <p className="mt-1 text-slate-800 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200 print:bg-white">
                {prontuario.dadosClinicos.procedimentoRealizado}
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                5. Materiais e Medicamentos Empregados
              </span>
              <p className="mt-1 text-slate-700">
                {prontuario.dadosClinicos.materiaisUtilizados}
              </p>
            </div>

            {prontuario.dadosClinicos.prescricaoMedicamentosa && (
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  6. Prescrição e Recomendações
                </span>
                <p className="mt-1 text-slate-800 font-mono">
                  {prontuario.dadosClinicos.prescricaoMedicamentosa}
                </p>
                {prontuario.dadosClinicos.recomendacoesPosOperatorias && (
                  <p className="mt-1 text-slate-600">
                    Orientações: {prontuario.dadosClinicos.recomendacoesPosOperatorias}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cryptographic Signature Box 1: Aluno */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 print:bg-white print:border-slate-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assinatura Eletrônica do Discente Atendente (SubSign FACPP)
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {prontuario.aluno.nome} · RA {prontuario.aluno.ra}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Registrado em {new Date(prontuario.aluno.assinaturaData).toLocaleString('pt-BR')} · IP: {prontuario.aluno.ipOrigem}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  AUTENTICADO SUBSIGN
                </span>
              </div>
            </div>
            <div className="mt-1 font-mono text-[9px] text-slate-500 break-all">
              Hash: {prontuario.aluno.assinaturaHash}
            </div>
          </div>

          {/* Cryptographic Signature Box 2: Certisign ICP-Brasil */}
          {isSigned && sign && (
            <div className="p-5 rounded-2xl border-2 border-emerald-700 bg-emerald-50/40 print:bg-white print:border-emerald-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        ASSINADO DIGITALMENTE · ICP-BRASIL CERTISIGN
                      </span>
                      <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.2 rounded font-bold">
                        VÁLIDO
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {sign.titularCertificado}
                    </div>
                    <div className="text-[11px] text-slate-700 font-mono">
                      e-CPF: {sign.cpfTitular} · {prontuario.professor.cro_crm} · Matrícula: {prontuario.professor.matricula}
                    </div>
                    <div className="text-[10px] text-emerald-900 font-medium mt-1">
                      Autoridade: {sign.autoridadeCertificadora}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-slate-900" />
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-600">
                    <div className="font-bold text-emerald-900 text-xs">
                      {sign.codigoVerificacao}
                    </div>
                    <div>subsign.facpp.edu.br/validar</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200 text-[10px] font-mono text-slate-600 space-y-0.5">
                <div>
                  <strong>Carimbo do Tempo (ACT):</strong> {sign.carimboTempoACT}
                </div>
                <div className="break-all">
                  <strong>Hash SHA-256 do Documento:</strong> {sign.hashDocumento}
                </div>
                <div>
                  <strong>Série do Certificado:</strong> {sign.numeroSerieCertificado} · Política: {sign.politicaAssinatura}
                </div>
              </div>
            </div>
          )}

          {/* Legal Compliance Footer */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3 space-y-0.5 print:text-slate-600">
            <p>
              Documento emitido conforme Medida Provisória nº 2.200-2/2001 e normas do Conselho Federal de Odontologia e Conselho Federal de Medicina.
            </p>
            <p>
              A integridade deste prontuário pode ser verificada a qualquer momento no portal oficial da FACPP e no validador do Instituto Nacional de Tecnologia da Informação (ITI).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
