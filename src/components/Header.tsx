import React, { useState, useRef, useEffect } from 'react';
import {
  FileSignature,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  Mail,
  User,
  ChevronDown,
  LogOut,
  KeyRound,
  CheckCircle2,
  Building2,
  UploadCloud,
} from 'lucide-react';
import { CertisignConfig, ProfessorProfile } from '../types/index.ts';

interface HeaderProps {
  currentTab: 'prontuarios' | 'caixa_email' | 'documentos' | 'relatorio' | 'config';
  onSelectTab: (tab: 'prontuarios' | 'caixa_email' | 'documentos' | 'relatorio' | 'config') => void;
  onOpenSimulator: () => void;
  onOpenConfig: () => void;
  onOpenProfessorLogin: () => void;
  onLogout?: () => void;
  certisignConfig: CertisignConfig | null;
  currentProfessor: ProfessorProfile | null;
  pendingCount: number;
  pendingPdfsCount: number;
  pendingDocsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSimulator,
  onOpenConfig,
  onOpenProfessorLogin,
  onLogout,
  certisignConfig,
  currentProfessor,
  pendingCount,
  pendingPdfsCount,
  pendingDocsCount,
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileButtonClick = () => {
    if (!currentProfessor) {
      onOpenProfessorLogin();
    } else {
      setIsAccountMenuOpen(!isAccountMenuOpen);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single Brand Element */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                SubSign Docente
              </span>
              <span className="text-xs text-slate-500 font-medium">
                FACPP · Clínicas Escola & Assinador Certisign
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('caixa_email')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                currentTab === 'caixa_email'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Mail className="w-4 h-4 text-emerald-700" />
              <span>Caixa de Entrada (PDFs)</span>
              {pendingPdfsCount > 0 && (
                <span
                  className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold"
                  title={`${pendingPdfsCount} PDFs recebidos aguardando assinatura`}
                >
                  {pendingPdfsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('prontuarios')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                currentTab === 'prontuarios'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span>Fila Geral</span>
              {pendingCount > 0 && (
                <span className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('documentos')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                currentTab === 'documentos'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Enviar PDF</span>
              {pendingDocsCount > 0 && (
                <span
                  className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold"
                  title={`${pendingDocsCount} PDFs enviados aguardando assinatura`}
                >
                  {pendingDocsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('relatorio')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                currentTab === 'relatorio'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Relatório Consolidado</span>
            </button>

            <button
              onClick={onOpenConfig}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                currentTab === 'config'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>API Certisign</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Professor Account Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Professor Email Account Button with Interactive Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleProfileButtonClick}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors text-left ${
                  isAccountMenuOpen
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
                title="Clique para alternar login do professor ou modificar e-mail"
              >
                <div className="relative">
                  <div className="w-6 h-6 rounded-md bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  {currentProfessor && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  )}
                </div>

                <div className="text-left leading-none max-w-[130px] sm:max-w-[170px] truncate">
                  <span className="font-semibold text-slate-800 text-xs block truncate">
                    {currentProfessor
                      ? currentProfessor.nome.split(' ')[0] + ' ' + (currentProfessor.nome.split(' ')[1] || '')
                      : 'Entrar / Login'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">
                    {currentProfessor?.email || 'Inserir e-mail'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isAccountMenuOpen ? 'rotate-180 text-emerald-700' : ''
                  }`}
                />
              </button>

              {/* ACCOUNT DROPDOWN MENU */}
              {isAccountMenuOpen && currentProfessor && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scaleIn text-xs">
                  {/* Account Summary */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate">
                          {currentProfessor.nome}
                        </div>
                        <div className="text-[11px] text-emerald-800 font-mono font-medium truncate">
                          {currentProfessor.email}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                      <div>{currentProfessor.departamento}</div>
                      <div className="flex items-center gap-2 text-slate-600 font-mono">
                        <span>{currentProfessor.cro_crm}</span>
                        <span>·</span>
                        <span>Matrícula: {currentProfessor.matricula}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        ICP-Brasil Válido
                      </span>
                      <span className="text-slate-400">Sessão Autenticada</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenProfessorLogin();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50/80 text-emerald-950 font-medium transition-colors flex items-center gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">
                          Modificar E-mail (Solicitar Novo Login)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Requer nova autenticação com senha institucional
                        </div>
                      </div>
                    </button>

                    {onLogout && (
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-700 font-medium transition-colors flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-rose-900">
                            Encerrar Sessão / Sair
                          </div>
                          <div className="text-[10px] text-rose-600">
                            Desconectar e solicitar login
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simular Webhook SubSign</span>
              <span className="sm:hidden">Simular</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar (visible only on screens below md) */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => onSelectTab('caixa_email')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentTab === 'caixa_email'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-700" />
            <span>Caixa de Entrada</span>
            {pendingPdfsCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold">
                {pendingPdfsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('prontuarios')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentTab === 'prontuarios'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Fila Geral</span>
            {pendingCount > 0 && (
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('documentos')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentTab === 'documentos'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Enviar PDF</span>
            {pendingDocsCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold">
                {pendingDocsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('relatorio')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentTab === 'relatorio'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Relatório</span>
          </button>

          <button
            onClick={onOpenConfig}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentTab === 'config'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>API Certisign</span>
          </button>
        </div>
      </div>
    </header>
  );
};
