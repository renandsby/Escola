import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Trash2, X } from 'lucide-react'
import type { TeacherAllocation } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select, Checkbox } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ROUTES } from '@/app/routes/paths'
import { createTeacherAllocation, deleteTeacherAllocation } from '../api/teachersApi'
import { useAllocationOptions } from '../hooks/useAllocationOptions'
import { useTeacherAllocationsQuery } from '../hooks/useTeacherAllocationsQuery'
import { allocationSchema, type AllocationFormData } from '../schemas/allocationSchema'

export default function AllocationsPage() {
  const scope = useScope()
  const queryClient = useQueryClient()
  const allocations = useTeacherAllocationsQuery()
  const { teachers, schoolClasses, subjects } = useAllocationOptions()
  const [term, setTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toDelete, setToDelete] = useState<TeacherAllocation | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const methods = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { is_regent: false },
  })
  const { register, handleSubmit, reset } = methods

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['classes', 'teacher-allocations'] })

  const createMutation = useMutation({
    mutationFn: (data: AllocationFormData) =>
      createTeacherAllocation({
        teacher_profile: data.teacher_profile,
        school_class: data.school_class,
        subject: data.subject || null,
        is_regent: !!data.is_regent,
      }),
    onSuccess: () => {
      toast.success('Alocação criada.')
      invalidate()
      reset({ is_regent: false })
      setShowForm(false)
      setSubmitError(null)
    },
    onError: (error) => setSubmitError(error),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTeacherAllocation(id),
    onSuccess: () => {
      toast.success('Alocação removida.')
      invalidate()
    },
    onSettled: () => setToDelete(null),
  })

  const q = term.toLowerCase()
  const rows = (allocations.data?.results ?? []).filter(
    (a: TeacherAllocation) =>
      a.teacher_name?.toLowerCase().includes(q) ||
      a.school_class_name?.toLowerCase().includes(q) ||
      a.subject_name?.toLowerCase().includes(q)
  )

  const columns: Column<TeacherAllocation>[] = [
    { key: 'teacher', header: 'Professor', render: (a) => a.teacher_name || '—' },
    { key: 'class', header: 'Turma', render: (a) => a.school_class_name || '—' },
    {
      key: 'subject',
      header: 'Disciplina',
      render: (a) => a.subject_name || 'Unidocente / regente',
    },
    {
      key: 'regent',
      header: 'Regência',
      render: (a) =>
        a.is_regent ? (
          <Badge tone="brand">Regente</Badge>
        ) : (
          <Badge tone="neutral" shape="square">
            Componente
          </Badge>
        ),
    },
  ]

  if (allocations.isError) {
    return (
      <>
        <PageHeader title="Professores e alocações" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as alocações." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pessoas' }, { label: 'Alocações' }]}
        title="Professores e alocações"
        tabs={[
          { label: 'Professores', to: ROUTES.teachers },
          { label: 'Alocações', to: ROUTES.allocations },
        ]}
        activeTab={ROUTES.allocations}
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            iconLeft={showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            onClick={() => {
              setSubmitError(null)
              setShowForm((v) => !v)
            }}
          >
            {showForm ? 'Fechar' : 'Nova alocação'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showForm && (
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="grid gap-4 rounded-lg border border-line bg-white p-6"
          >
            {!!submitError && <FormError error={submitError} />}
            <fieldset
              disabled={createMutation.isPending}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Professor" name="teacher_profile" required>
                <Select {...register('teacher_profile')}>
                  <option value="">Selecionar</option>
                  {(teachers.data?.results ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user_name || t.registration_number}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Turma" name="school_class" required>
                <Select {...register('school_class')}>
                  <option value="">Selecionar</option>
                  {(schoolClasses.data?.results ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.school_name ? ` — ${c.school_name}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Disciplina"
                name="subject"
                help="Vazio = professor regente / unidocente"
              >
                <Select {...register('subject')}>
                  <option value="">Sem disciplina (regente)</option>
                  {(subjects.data?.results ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex items-end">
                <Checkbox label="Professor regente da turma" {...register('is_regent')} />
              </div>
            </fieldset>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" loading={createMutation.isPending}>
                Alocar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset({ is_regent: false })
                  setSubmitError(null)
                  setShowForm(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </FormProvider>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por professor, turma ou disciplina…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        isLoading={allocations.isLoading}
        empty={
          <EmptyState
            title="Nenhuma alocação"
            description={term ? 'Ajuste a busca.' : 'Aloque professores em turmas e disciplinas.'}
          />
        }
        rowActions={(a) => (
          <Button size="sm" variant="ghost" onClick={() => setToDelete(a)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Remover alocação"
        description={`Remover a alocação de ${toDelete?.teacher_name || 'este professor'} em ${toDelete?.school_class_name || 'esta turma'}?`}
        onConfirm={() => toDelete && removeMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        confirmLabel="Remover"
        destructive
      />
    </>
  )
}
