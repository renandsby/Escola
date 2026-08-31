import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field, Input, Select, Checkbox } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { apiGet, getErrorMessage } from '@/utils/api-helpers'
import { isValidCPF, normalizeCPF } from '@/utils/validation'
import { ROUTES } from '@/app/routes/paths'
import {
  EVIDENCE_KIND_LABELS,
  type PaginatedResponse,
  type School,
} from '@/types/api'

type Dependent = { student_id: string; full_name: string }
import { LGPDTermsModal, LGPD_TERM_VERSION } from '@/components/lgpd/LGPDTermsModal'
import {
  attachEvidence,
  createEnrollmentRequest,
  fetchCycles,
  fetchEnrollmentRequest,
  setPreferences,
  submitEnrollmentRequest,
} from '../api/admissionsApi'

const SHIFTS = [
  { value: 'MORNING', label: 'Manhã' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'FULL_TIME', label: 'Integral' },
  { value: 'NIGHT', label: 'Noite' },
]

export default function EnrollmentRequestFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (id) {
    return <RequestEditor requestId={id} navigate={navigate} queryClient={queryClient} />
  }
  return <RequestCreator navigate={navigate} />
}

// --------------------------------------------------------------------- criação

function RequestCreator({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const cycles = useQuery({ queryKey: ['admissions', 'cycles'], queryFn: fetchCycles })
  const dependents = useQuery({
    queryKey: ['guardians', 'my-dependents'],
    queryFn: () => apiGet<Dependent[]>('guardians/my-dependents/'),
  })
  const openCycle = (cycles.data?.results ?? []).find((c) => c.new_request_open)

  const [studentId, setStudentId] = useState('')
  const [form, setForm] = useState({
    applicant_name: '',
    applicant_cpf: '',
    applicant_birth_date: '',
    applicant_mother_name: '',
    desired_shift: 'MORNING',
    target_grade_label: '',
    residential_address: '',
  })

  const create = useMutation({
    mutationFn: () => {
      const isNew = studentId === '' || studentId === '__new__'
      if (isNew && !isValidCPF(form.applicant_cpf)) {
        throw new Error('CPF do candidato inválido.')
      }
      return createEnrollmentRequest({
        cycle: openCycle?.id,
        student: isNew ? undefined : studentId,
        applicant_name: isNew ? form.applicant_name : '',
        applicant_cpf: isNew ? normalizeCPF(form.applicant_cpf) : '',
        applicant_birth_date: isNew ? form.applicant_birth_date : undefined,
        applicant_mother_name: isNew ? form.applicant_mother_name : '',
        desired_shift: form.desired_shift,
        target_grade_label: form.target_grade_label,
        residential_address: form.residential_address,
      })
    },
    onSuccess: (req) => {
      toast.success('Rascunho criado. Agora escolha as escolas.')
      navigate(ROUTES.enrollmentRequestEdit(req.id))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (cycles.isLoading) {
    return <TableSkeleton rows={5} cols={2} />
  }
  if (!openCycle) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Matrículas', to: ROUTES.myAdmissions }]} title="Nova solicitação" />
        <EmptyState title="Fora do período" description="As novas matrículas não estão abertas no momento." />
      </>
    )
  }

  const isNew = studentId === '' || studentId === '__new__'

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Matrículas', to: ROUTES.myAdmissions }, { label: 'Nova solicitação' }]}
        title={`Solicitação de matrícula — ${openCycle.target_year}`}
      />
      <form
        className="grid gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <FormSection title="Aluno" description="Selecione um filho já vinculado ou informe os dados de um novo candidato." first>
          <Field label="Aluno" name="student" className="sm:col-span-2">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="__new__">Novo candidato (não está na rede)</option>
              {(dependents.data ?? []).map((d) => (
                <option key={d.student_id} value={d.student_id}>{d.full_name}</option>
              ))}
            </Select>
          </Field>
          {isNew && (
            <>
              <Field label="Nome completo" name="applicant_name" required className="sm:col-span-2">
                <Input value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} />
              </Field>
              <Field label="CPF" name="applicant_cpf" required mono>
                <Input value={form.applicant_cpf} onChange={(e) => setForm({ ...form, applicant_cpf: e.target.value })} placeholder="000.000.000-00" />
              </Field>
              <Field label="Data de nascimento" name="applicant_birth_date" required>
                <Input type="date" value={form.applicant_birth_date} onChange={(e) => setForm({ ...form, applicant_birth_date: e.target.value })} />
              </Field>
              <Field label="Nome da mãe" name="applicant_mother_name" required className="sm:col-span-2">
                <Input value={form.applicant_mother_name} onChange={(e) => setForm({ ...form, applicant_mother_name: e.target.value })} />
              </Field>
            </>
          )}
        </FormSection>

        <FormSection title="Preferências gerais">
          <Field label="Turno desejado" name="desired_shift" required>
            <Select value={form.desired_shift} onChange={(e) => setForm({ ...form, desired_shift: e.target.value })}>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Série pretendida" name="target_grade_label" required>
            <Input value={form.target_grade_label} onChange={(e) => setForm({ ...form, target_grade_label: e.target.value })} placeholder="Ex.: 1º ano" />
          </Field>
          <Field label="Endereço residencial" name="residential_address" required className="sm:col-span-2">
            <Input value={form.residential_address} onChange={(e) => setForm({ ...form, residential_address: e.target.value })} />
          </Field>
        </FormSection>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.myAdmissions)}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>Continuar</Button>
        </div>
      </form>
    </>
  )
}

// --------------------------------------------------------------------- edição

function RequestEditor({
  requestId,
  navigate,
  queryClient,
}: {
  requestId: string
  navigate: ReturnType<typeof useNavigate>
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const q = useQuery({
    queryKey: ['admissions', 'request', requestId],
    queryFn: () => fetchEnrollmentRequest(requestId),
  })
  const schools = useQuery({
    queryKey: ['schools', 'for-preference'],
    queryFn: () => apiGet<PaginatedResponse<School>>('schools/', { page_size: 500 }),
  })

  const [prefs, setPrefs] = useState<string[]>(['', '', ''])
  const [evidenceKind, setEvidenceKind] = useState('PCD')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [siblingSchool, setSiblingSchool] = useState('')
  const [consent, setConsent] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const req = q.data
  useEffect(() => {
    const existing = req?.preferences.map((p) => p.school) ?? []
    if (existing.length) {
      setPrefs([existing[0] ?? '', existing[1] ?? '', existing[2] ?? ''])
    }
  }, [req])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admissions', 'request', requestId] })

  const savePrefs = useMutation({
    mutationFn: () => setPreferences(requestId, prefs.filter(Boolean)),
    onSuccess: () => { toast.success('Escolas salvas.'); invalidate() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const upload = useMutation({
    mutationFn: () =>
      attachEvidence(requestId, {
        kind: evidenceKind,
        file: evidenceFile as File,
        declared_school: evidenceKind === 'SIBLING' ? siblingSchool : undefined,
      }),
    onSuccess: () => {
      toast.success('Comprovante anexado.')
      setEvidenceFile(null)
      invalidate()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const submit = useMutation({
    mutationFn: () => submitEnrollmentRequest(requestId),
    onSuccess: () => {
      toast.success('Solicitação enviada.')
      navigate(ROUTES.myAdmissions)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (q.isLoading) {
    return <TableSkeleton rows={6} cols={2} />
  }
  if (q.isError || !req) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Matrículas', to: ROUTES.myAdmissions }]} title="Solicitação" />
        <EmptyState title="Não encontrada" description="Esta solicitação não está disponível." />
      </>
    )
  }

  const readOnly = req.status !== 'DRAFT'
  const schoolList = schools.data?.results ?? []

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Matrículas', to: ROUTES.myAdmissions }, { label: req.applicant_display }]}
        title={`Solicitação — ${req.applicant_display}`}
        meta={`${req.target_year} · ${req.desired_shift} · ${req.target_grade_label}`}
      />

      {readOnly ? (
        <EmptyState
          title="Solicitação enviada"
          description="A solicitação está aguardando o processamento da secretaria e não pode mais ser alterada."
        />
      ) : (
        <>
          <FormSection title="Escolas de preferência" description="Escolha de 1 a 3 unidades, em ordem." first>
            {[0, 1, 2].map((i) => (
              <Field key={i} label={`${i + 1}ª opção`} name={`pref-${i}`}>
                <Select
                  value={prefs[i]}
                  onChange={(e) => {
                    const next = [...prefs]
                    next[i] = e.target.value
                    setPrefs(next)
                  }}
                >
                  <option value="">{i === 0 ? 'Selecionar' : 'Nenhuma'}</option>
                  {schoolList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => savePrefs.mutate()} loading={savePrefs.isPending}>
                Salvar escolas
              </Button>
            </div>
          </FormSection>

          <FormSection title="Comprovantes de prioridade" description="Anexe laudos e comprovantes. A escola/SME verifica cada um.">
            <div className="sm:col-span-2 grid gap-2">
              {req.evidences.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2">
                  <span className="text-base text-ink-700">
                    {EVIDENCE_KIND_LABELS[ev.kind]} · {ev.file_name}
                  </span>
                  <Badge tone={ev.status === 'VERIFIED' ? 'ok' : ev.status === 'REJECTED' ? 'danger' : 'neutral'}>
                    {ev.status === 'VERIFIED' ? 'Verificado' : ev.status === 'REJECTED' ? 'Rejeitado' : 'Aguardando'}
                  </Badge>
                </div>
              ))}
            </div>
            <Field label="Tipo" name="evidence_kind">
              <Select value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value)}>
                {Object.entries(EVIDENCE_KIND_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            {evidenceKind === 'SIBLING' && (
              <Field label="Escola do irmão" name="sibling_school">
                <Select value={siblingSchool} onChange={(e) => setSiblingSchool(e.target.value)}>
                  <option value="">Selecionar</option>
                  {schoolList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Arquivo (PDF/imagem)" name="evidence_file">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                iconLeft={<Upload className="h-4 w-4" />}
                disabled={!evidenceFile}
                loading={upload.isPending}
                onClick={() => upload.mutate()}
              >
                Anexar comprovante
              </Button>
            </div>
          </FormSection>

          <FormSection title="Envio" description="Revise e envie. Depois de enviada, a solicitação não pode ser alterada.">
            <div className="sm:col-span-2 grid gap-2 rounded border border-line-strong bg-surface-subtle p-4">
              <Checkbox
                label="Aceito os termos de uso de dados pessoais para fins de matrícula e gestão escolar."
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <button type="button" className="justify-self-start text-help text-brand-600 underline" onClick={() => setShowTerms(true)}>
                Ler os termos (versão {LGPD_TERM_VERSION})
              </button>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.myAdmissions)}>
                Voltar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!consent || prefs.filter(Boolean).length === 0}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Enviar solicitação
              </Button>
            </div>
          </FormSection>
        </>
      )}

      {showTerms && <LGPDTermsModal onClose={() => setShowTerms(false)} />}
    </>
  )
}
