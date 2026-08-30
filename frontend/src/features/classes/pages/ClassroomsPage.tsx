import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { useAuthStore } from '@/stores/authStore'
import { useSchoolsQuery } from '@/features/students/hooks/useSchoolsQuery'
import { classroomSchema, type ClassroomFormData } from '../schemas/classSchema'
import { createClassroom, fetchClassrooms, type Classroom } from '../api/classesApi'

const SCHOOL_ROLES = ['school_director', 'school_secretary']

export default function ClassroomsPage() {
  const scope = useScope()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const lockedSchool = SCHOOL_ROLES.includes(user?.role ?? '') ? (user?.school ?? '') : ''
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)

  const schools = useSchoolsQuery().data?.results ?? []
  const list = useQuery({ queryKey: ['classrooms', 'list'], queryFn: () => fetchClassrooms({ page_size: 200 }) })

  const methods = useForm<ClassroomFormData>({
    resolver: zodResolver(classroomSchema),
    defaultValues: { school: lockedSchool, number: '', capacity: 30, floor: 0, building: '' },
  })
  const { register, handleSubmit, reset } = methods

  const onCreate = async (data: ClassroomFormData) => {
    setError(null)
    setSaving(true)
    try {
      await createClassroom(data)
      toast.success('Sala cadastrada.')
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      reset({ school: lockedSchool, number: '', capacity: 30, floor: 0, building: '' })
      setShowForm(false)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Classroom>[] = [
    { key: 'number', header: 'Sala', render: (c) => c.number, mono: true },
    { key: 'school', header: 'Escola', render: (c) => c.school_name || '—' },
    { key: 'capacity', header: 'Capacidade', align: 'right', mono: true, render: (c) => c.capacity },
    { key: 'floor', header: 'Andar', align: 'right', mono: true, render: (c) => c.floor },
    { key: 'building', header: 'Bloco', render: (c) => c.building || '—' },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Vida escolar' }, { label: 'Salas de aula' }]}
        title="Salas de aula"
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Fechar' : 'Nova sala'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showForm && (
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onCreate)}
            className="grid gap-4 rounded-lg border border-line bg-white p-6 sm:grid-cols-2"
          >
            {!!error && <FormError error={error} />}
            <Field label="Escola" name="school" required>
              <Select {...register('school')} disabled={!!lockedSchool}>
                <option value="">Selecionar</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Número / identificação" name="number" required>
              <Input {...register('number')} />
            </Field>
            <Field label="Capacidade" name="capacity" mono required>
              <Input type="number" min={1} {...register('capacity')} />
            </Field>
            <Field label="Andar" name="floor" mono>
              <Input type="number" {...register('floor')} />
            </Field>
            <Field label="Bloco / prédio" name="building">
              <Input {...register('building')} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" loading={saving}>
                Cadastrar sala
              </Button>
            </div>
          </form>
        </FormProvider>
      )}

      <DataTable
        columns={columns}
        rows={list.data?.results ?? []}
        rowKey={(c) => c.id}
        isLoading={list.isLoading}
        empty={<EmptyState title="Nenhuma sala" description="Cadastre as salas físicas da escola." />}
      />
    </>
  )
}
