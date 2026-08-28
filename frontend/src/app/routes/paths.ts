/**
 * Fonte única das rotas (em português — DS "Rede").
 * Use `ROUTES.*` em vez de strings literais nos `navigate()` / `<Link to>`.
 * As rotas antigas em inglês redirecionam (ver `LEGACY_REDIRECTS`).
 */
export const ROUTES = {
  login: '/login',
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

  // PESSOAS
  students: '/alunos',
  studentNew: '/alunos/novo',
  student: (id: string) => `/alunos/${id}`,
  studentEdit: (id: string) => `/alunos/${id}/editar`,
  guardians: '/responsaveis',
  teachers: '/professores',
  teacherNew: '/professores/novo',
  teacherEdit: (id: string) => `/professores/${id}/editar`,
  allocations: '/professores/alocacoes',

  // VIDA ESCOLAR
  classes: '/turmas',
  enrollments: '/matriculas',
  enrollmentNew: '/matriculas/nova',
  transfers: '/transferencias',

  // DIÁRIO DE CLASSE
  diaryGrades: '/diario/lancamentos', // notas
  diaryAttendance: '/diario/frequencia',
  diaryEvaluations: '/diario/pareceres',
  diaryContent: '/diario/conteudo',

  // DOCUMENTOS
  boletins: '/documentos/boletins',
  exports: '/documentos/exportacoes',
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
