/**
 * Fonte única das rotas (em português — DS "Rede").
 * Use `ROUTES.*` em vez de strings literais nos `navigate()` / `<Link to>`.
 * As rotas antigas em inglês redirecionam (ver `LEGACY_REDIRECTS`).
 */
export const ROUTES = {
  login: '/login',
  guardianSelfRegister: '/cadastro-responsavel',
  verifyEmail: (token: string) => `/verificar-email/${token}`,
  verifyEmailPending: '/verificar-email/pendente',
  forgotPassword: '/esqueci-senha',
  resetPassword: (token: string) => `/redefinir-senha/${token}`,
  home: '/', // Painel do dia

  // REDE
  schools: '/escolas',
  schoolNew: '/escolas/nova',
  schoolEdit: (id: string) => `/escolas/${id}/editar`,
  curriculum: '/curriculo',
  curriculumMatrices: '/curriculo/matrizes',
  subjectNew: '/curriculo/disciplinas/nova',
  subjectEdit: (id: string) => `/curriculo/disciplinas/${id}/editar`,
  academicYear: '/ano-letivo',
  academicYearNew: '/ano-letivo/novo',
  academicYearEdit: (id: string) => `/ano-letivo/${id}/editar`,
  academicPeriods: (yearId: string) => `/ano-letivo/${yearId}/periodos`,
  academicPeriodNew: (yearId: string) => `/ano-letivo/${yearId}/periodos/novo`,
  academicPeriodEdit: (yearId: string, periodId: string) =>
    `/ano-letivo/${yearId}/periodos/${periodId}/editar`,

  // PESSOAS
  students: '/alunos',
  studentNew: '/alunos/novo',
  student: (id: string) => `/alunos/${id}`,
  studentEdit: (id: string) => `/alunos/${id}/editar`,
  guardians: '/responsaveis',
  guardianLinkRequests: '/responsaveis/solicitacoes-vinculo',
  guardianNew: '/responsaveis/novo',
  guardian: (id: string) => `/responsaveis/${id}`,
  guardianEdit: (id: string) => `/responsaveis/${id}/editar`,
  teachers: '/professores',
  teacherNew: '/professores/novo',
  teacherEdit: (id: string) => `/professores/${id}/editar`,
  allocations: '/professores/alocacoes',

  // VIDA ESCOLAR
  classes: '/turmas',
  classNew: '/turmas/nova',
  classEdit: (id: string) => `/turmas/${id}/editar`,
  classrooms: '/salas',

  // ADMINISTRAÇÃO
  users: '/usuarios',
  userNew: '/usuarios/novo',
  userEdit: (id: string) => `/usuarios/${id}/editar`,
  enrollments: '/matriculas',
  enrollmentNew: '/matriculas/nova',
  transfers: '/transferencias',

  // ADMISSÕES (matrícula / rematrícula)
  admissionCycles: '/admissoes/ciclos',
  admissionEvidence: '/admissoes/comprovantes',
  admissionRenewals: '/admissoes/rematriculas',
  myAdmissions: '/minhas-admissoes',
  renewalConfirm: (id: string) => `/minhas-admissoes/rematricula/${id}`,
  enrollmentRequestNew: '/minhas-admissoes/nova-solicitacao',
  enrollmentRequestEdit: (id: string) => `/minhas-admissoes/solicitacao/${id}`,

  // DIÁRIO DE CLASSE
  diaryGrades: '/diario/lancamentos', // notas
  diaryAttendance: '/diario/frequencia',
  diaryEvaluations: '/diario/pareceres',
  diaryContent: '/diario/conteudo',

  // DOCUMENTOS
  boletins: '/documentos/boletins',
  exports: '/documentos/exportacoes',
  educacenso: '/documentos/educacenso',
  documents: '/documentos/arquivos',
  documentDetail: (id: string) => `/documentos/arquivos/${id}`,

  // COMUNICAÇÃO / CONTA
  messages: '/mensagens',
  messageNew: '/mensagens/nova',
  message: (id: string) => `/mensagens/${id}`,
  settings: '/configuracoes',
} as const

/** rota antiga (inglês) → rota nova. Alimenta os <Navigate replace> em AppRoutes. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/dashboard': ROUTES.home,
  '/teacher-dashboard': ROUTES.home,
  '/sme': ROUTES.academicYear,
  '/sme/matrices': ROUTES.curriculumMatrices,
  '/sme/transfers': ROUTES.transfers,
  '/schools': ROUTES.schools,
  '/schools/create': ROUTES.schoolNew,
  '/students': ROUTES.students,
  '/students/create': ROUTES.studentNew,
  '/subjects': ROUTES.curriculum,
  '/subjects/create': ROUTES.subjectNew,
  '/teachers': ROUTES.teachers,
  '/teachers/create': ROUTES.teacherNew,
  '/teachers/allocations': ROUTES.allocations,
  '/classes': ROUTES.classes,
  '/enrollments': ROUTES.enrollments,
  '/enrollments/create': ROUTES.enrollmentNew,
  '/grades': ROUTES.diaryGrades,
  '/attendance': ROUTES.diaryAttendance,
  '/evaluations': ROUTES.diaryEvaluations,
  '/boletins': ROUTES.boletins,
  '/documents': ROUTES.documents,
  '/documents/create': ROUTES.documents,
  '/messages': ROUTES.messages,
  '/messages/create': ROUTES.messageNew,
  '/settings': ROUTES.settings,
}
