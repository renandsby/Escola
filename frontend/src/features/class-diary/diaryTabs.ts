import { ROUTES } from '@/app/routes/paths'

/** Abas compartilhadas pelas telas do diário de classe. */
export const DIARY_TABS = [
  { label: 'Notas', to: ROUTES.diaryGrades },
  { label: 'Frequência', to: ROUTES.diaryAttendance },
  { label: 'Pareceres', to: ROUTES.diaryEvaluations },
  { label: 'Conteúdo', to: ROUTES.diaryContent },
]
