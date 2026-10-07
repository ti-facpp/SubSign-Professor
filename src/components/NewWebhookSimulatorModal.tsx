import React, { useState } from 'react';
import {
  X,
  FileText,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';

interface NewWebhookSimulatorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES = [
  {
    titulo: 'Odontologia · Restauração em Resina Composta',
    disciplina: 'Dentística Restauradora II',
    procedimento: 'Restauração classe II elemento 36 com resina Filtek Z350 XT e matriz seccional.',
    diagnostico: 'Cárie de dentina interproximal.',
    cid10: 'K02.1 - Cárie da dentina',
    box: 'Box 04 - Clínica I',
    alunoNome: 'Gabriel Paiva Martins',
    alunoRa: '202309112',
    alunoCurso: 'Odontologia',
    pacienteNome: 'Tatiane Cristina Ribeiro',
    pacienteCpf: '394.810.291-55',
  },
  {
    titulo: 'Odontologia · Cirurgia Exodontia Simples',
    disciplina: 'Cirurgia e Traumatologia Bucomaxilofacial',
    procedimento: 'Exodontia simples do elemento 28 sob anestesia infiltrativa local com Articaína 4%.',
    diagnostico: 'Dente sem função oclusal com impactação alimentar.',
    cid10: 'K01.1 - Dentes inclusos/semi-inclusos',
    box: 'Box 02 - Setor Cirúrgico',
    alunoNome: 'Larissa Alencar Viana',
    alunoRa: '202208119',
    alunoCurso: 'Odontologia',
    pacienteNome: 'Marcio Henrique de Souza',
    pacienteCpf: '219.004.831-29',
  },
  {
    titulo: 'Odontologia · Profilaxia e Raspagem Supragengival',
    disciplina: 'Periodontia Clínica I',
    procedimento: 'Raspagem supragengival com ultrassom nos sextantes anteriores inferiores e superiores.',
    diagnostico: 'Gengivite induzida por biofilme.',
    cid10: 'K05.1 - Gengivite crônica',
    box: 'Box 10 - Clínica Integrada',
    alunoNome: 'Matheus Costa Barbosa',
    alunoRa: '202304910',
    alunoCurso: 'Odontologia',
    pacienteNome: 'Helena Maria Silva',
    pacienteCpf: '144.902.311-88',
  },
];

export const NewWebhookSimulatorModal: React.FC<NewWebhookSimulatorModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);
  const [pacienteNome, setPacienteNome] = useState(TEMPLATES[0].pacienteNome);
  const [pacienteCpf, setPacienteCpf] = useState(TEMPLATES[0].pacienteCpf);
  const [pacienteEmail, setPacienteEmail] = useState('paciente.clinica@gmail.com');
  const [alunoNome, setAlunoNome] = useState(TEMPLATES[0].alunoNome);
  const [alunoRa, setAlunoRa] = useState(TEMPLATES[0].alunoRa);
  const [alunoEmail, setAlunoEmail] = useState('aluno.teste@facpp.edu.br');
  const [disciplina, setDisciplina] = useState(TEMPLATES[0].disciplina);
  const [boxClinico, setBoxClinico] = useState(TEMPLATES[0].box);
  const [procedimento, setProcedimento] = useState(TEMPLATES[0].procedimento);
  const [diagnostico, setDiagnostico] = useState(TEMPLATES[0].diagnostico);
  const [loading, setLoading] = useState(false);

  const applyTemplate = (idx: number) => {
    setSelectedTemplateIdx(idx);
    const t = TEMPLATES[idx];
    setPacienteNome(t.pacienteNome);
    setPacienteCpf(t.pacienteCpf);
    setAlunoNome(t.alunoNome);
    setAlunoRa(t.alunoRa);
    setDisciplina(t.disciplina);
    setBoxClinico(t.box);
    setProcedimento(t.procedimento);
    setDiagnostico(t.diagnostico);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/prontuarios/novo-recebido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteNome,
          pacienteCpf,
          pacienteEmail,
          alunoNome,
          alunoRa,
          alunoEmail,
          disciplina,
          boxClinico,
          procedimentoRealizado: procedimento,
          diagnostico,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao simular envio de prontuário');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar prontuário simulado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Simulador de Envio · SubSign Aluno (subsign.facpp.edu.br)
              </h3>
              <p className="text-[11px] text-slate-300">
                Gera novo atendimento clínico assinado pelo discente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 text-xs space-y-4">
          {/* Templates Quick Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Selecione um Modelo de Atendimento Clínico:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => applyTemplate(idx)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    selectedTemplateIdx === idx
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-[11px] leading-tight">{tmpl.titulo}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paciente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Nome do Paciente:
              </label>
              <input
                type="text"
                required
                value={pacienteNome}
                onChange={(e) => setPacienteNome(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                CPF do Paciente:
              </label>
              <input
                type="text"
                required
                value={pacienteCpf}
                onChange={(e) => setPacienteCpf(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                E-mail do Paciente (para envio do prontuário assinado):
              </label>
              <input
                type="email"
                required
                value={pacienteEmail}
                onChange={(e) => setPacienteEmail(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Aluno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Aluno Responsável:
              </label>
              <input
                type="text"
                required
                value={alunoNome}
                onChange={(e) => setAlunoNome(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                RA do Aluno:
              </label>
              <input
                type="text"
                required
                value={alunoRa}
                onChange={(e) => setAlunoRa(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                E-mail Institucional do Aluno:
              </label>
              <input
                type="email"
                required
                value={alunoEmail}
                onChange={(e) => setAlunoEmail(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Disciplina e Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Disciplina Clínica:
              </label>
              <input
                type="text"
                required
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Box Clínico / Consultório:
              </label>
              <input
                type="text"
                required
                value={boxClinico}
                onChange={(e) => setBoxClinico(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {/* Procedimento */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Procedimento Realizado pelo Aluno:
            </label>
            <textarea
              required
              rows={2}
              value={procedimento}
              onChange={(e) => setProcedimento(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando para Fila do Professor...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submeter como Aluno (SubSign)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
