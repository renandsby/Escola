import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Checkbox } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { KINSHIP_TYPE_LABELS } from '@/types/api'
import type { KinshipType, PaginatedResponse, Student } from '@/types/api'
import { createStudentLink } from '../api/guardiansApi'

export function StudentLinkModal({
  guardianId,
  linkedStudentIds,
  onClose,
  onSuccess,
}: {
  guardianId: string
  linkedStudentIds: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [kinship, setKinship] = useState<KinshipType>('MOTHER')
  const [isEmergency, setIsEmergency] = useState(true)
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const studentsQuery = useQuery({
    queryKey: ['students', 'for-guardian-link'],
    queryFn: () => apiGet<PaginatedResponse<Student>>('students/', { page_size: 500 }),
  })

  const options = useMemo(() => {
    const all = (studentsQuery.data?.results ?? []).filter(
      (s) => !linkedStudentIds.includes(s.id)
    )
    const q = term.trim().toLowerCase()
    return q ? all.filter((s) => s.full_name?.toLowerCase().includes(q)) : all
  }, [studentsQuery.data, linkedStudentIds, term])

  async function submit() {
    setError(null)
    if (!studentId) {
      setError('Selecione um aluno.')
      return
    }
    setBusy(true)
    try {
      await createStudentLink({
        guardian: guardianId,
        student: studentId,
        kinship_type: kinship,
        is_emergency_contact: isEmergency,
      })
      toast.success('Vínculo adicionado.')
      onSuccess()
    } catch (err) {
      const code = getErrorCode(err)
      setError(code ? resolveError(code).message() : 'Não foi possível criar o vínculo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-md gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-section text-ink-900">Vincular aluno</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        </div>

        {error && <InlineError title="Não foi possível vincular" message={error} />}

        <Field label="Buscar aluno" name="student_search">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nome do aluno…" />
        </Field>

        <Field label="Aluno" name="student" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">
              {studentsQuery.isLoading ? 'Carregando…' : 'Selecionar aluno'}
            </option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Parentesco" name="kinship_type" required>
          <Select value={kinship} onChange={(e) => setKinship(e.target.value as KinshipType)}>
            {Object.entries(KINSHIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Checkbox
          label="Contato de emergência"
          checked={isEmergency}
          onChange={(e) => setIsEmergency(e.target.checked)}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" loading={busy} onClick={submit}>
            Adicionar vínculo
          </Button>
        </div>
      </div>
    </div>
  )
}
