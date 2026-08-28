import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import type { School } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import { SCHOOL_TYPE } from '@/components/ui/statusMaps'
import { schoolSchema, type SchoolFormData } from '../schemas/schoolSchema'
import {
  useEducationDepartmentsQuery,
  useSchoolDirectorsQuery,
  useSchoolQuery,
} from '../hooks/useSchoolFormData'

export default function SchoolFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const { create, update } = useCrud<School>('schools/', 'schools')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const departmentsQuery = useEducationDepartmentsQuery()
  const directorsQuery = useSchoolDirectorsQuery()
  const schoolQuery = useSchoolQuery(id)
  const departments = departmentsQuery.data?.results ?? []
  const directors = directorsQuery.data?.results ?? []

  const methods = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      school_type: 'FUNDAMENTAL_1',
    },
  })
  const { register, handleSubmit, reset } = methods

  useEffect(() => {
    if (schoolQuery.data) {
      reset(schoolQuery.data as unknown as SchoolFormData)
    }
  }, [schoolQuery.data, reset])

  useEffect(() => {
    if (schoolQuery.isError) {
      toast.error('Erro ao carregar escola')
    }
  }, [schoolQuery.isError])

  const onSubmit = async (data: SchoolFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await update.mutateAsync({ id, data })
        toast.success('Escola atualizada.')
      } else {
        await create.mutateAsync(data)
        toast.success('Escola criada.')
      }
      navigate(ROUTES.schools)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = id ? 'Editar escola' : 'Nova escola'

  if (id && schoolQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Escolas', to: ROUTES.schools }]} title={title} />
        <TableSkeleton rows={6} cols={2} />
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Escolas', to: ROUTES.schools }, { label: title }]}
        title={title}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Identificação" description="Nome, código e direção da unidade." first>
            <Field label="Nome" name="name" required className="sm:col-span-2">
              <Input {...register('name')} />
            </Field>
            <Field label="Tipo" name="school_type" required>
              <Select {...register('school_type')}>
                {Object.entries(SCHOOL_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Diretor(a)" name="director_user">
              <Select {...register('director_user')}>
                <option value="">Selecionar</option>
                {directors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Código INEP" name="inep_code" mono>
              <Input {...register('inep_code')} />
            </Field>
            <Field label="CNPJ" name="cnpj" mono>
              <Input {...register('cnpj')} />
            </Field>
            <Field label="Secretaria Municipal" name="education_department" required>
              <Select {...register('education_department')}>
                <option value="">Selecionar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.municipality_name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Endereço">
            <Field label="Logradouro" name="address_street" className="sm:col-span-2">
              <Input {...register('address_street')} />
            </Field>
            <Field label="Número" name="address_number">
              <Input {...register('address_number')} />
            </Field>
            <Field label="Bairro" name="address_neighborhood">
              <Input {...register('address_neighborhood')} />
            </Field>
            <Field label="Cidade" name="address_city">
              <Input {...register('address_city')} />
            </Field>
            <Field label="UF" name="address_state">
              <Input maxLength={2} {...register('address_state')} />
            </Field>
            <Field label="CEP" name="address_zip_code" mono>
              <Input {...register('address_zip_code')} />
            </Field>
          </FormSection>

          <FormSection title="Contato">
            <Field label="E-mail" name="email">
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Telefone" name="phone" mono>
              <Input {...register('phone')} />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.schools)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {id ? 'Atualizar' : 'Criar'}
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
