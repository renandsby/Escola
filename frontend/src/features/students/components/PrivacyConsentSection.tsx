import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { resolveError } from '@/services/errorMessages'
import { getErrorCode } from '@/utils/api-helpers'
import { cn } from '@/utils/cn'

type Consent = {
  consent_type: string
  label: string
  granted: boolean
  term_version: string | null
  granted_at: string | null
}

type ConsentResponse = { student_id: string; consents: Consent[] }

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-line-strong'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export function PrivacyConsentSection({
  studentId,
  studentName,
}: {
  studentId: string
  studentName: string
}) {
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isSmeAdmin = role === 'sme_admin'
  const [confirmAnon, setConfirmAnon] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['privacy', 'consents', studentId],
    queryFn: () =>
      apiGet<ConsentResponse>('privacy/consents/', { student_id: studentId }),
  })

  const setConsent = useMutation({
    mutationFn: (vars: { consent_type: string; granted: boolean }) =>
      apiClient.post('/privacy/consents/', { student_id: studentId, ...vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'consents', studentId] })
      toast.success('Preferência de consentimento registrada.')
    },
    onError: (err) => {
      const c = resolveError(getErrorCode(err))
      toast.error(c.title, { description: c.message() })
    },
  })

  const anonymize = useMutation({
    mutationFn: () => apiClient.post('/privacy/anonymize/', { student_id: studentId }),
    onSuccess: () => {
      toast.success('Aluno anonimizado.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (err) => {
      const c = resolveError(getErrorCode(err))
      toast.error(c.title, { description: c.message() })
    },
  })

  async function downloadMyData() {
    setDownloading(true)
    try {
      const res = await apiClient.get('/privacy/my-data/', {
        params: { student_id: studentId },
      })
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dados-lgpd-${studentName.replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const c = resolveError(getErrorCode(err))
      toast.error(c.title, { description: c.message() })
    } finally {
      setDownloading(false)
    }
  }

  const consents = data?.consents ?? []

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        <h2 className="text-section text-ink-900">Privacidade e dados (LGPD)</h2>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <p className="text-help text-ink-400">Carregando consentimentos…</p>
        ) : (
          consents.map((c) => (
            <div
              key={c.consent_type}
              className="flex items-center justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-label text-ink-700">{c.label}</p>
                <p className="mt-0.5 text-help text-ink-400">
                  {c.granted_at
                    ? `Registrado em ${new Date(c.granted_at).toLocaleDateString('pt-BR')} · termo ${c.term_version}`
                    : 'Sem registro'}
                </p>
              </div>
              <Switch
                checked={c.granted}
                disabled={setConsent.isPending}
                onChange={(granted) =>
                  setConsent.mutate({ consent_type: c.consent_type, granted })
                }
              />
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="secondary"
          iconLeft={<Download className="h-4 w-4" />}
          loading={downloading}
          onClick={downloadMyData}
        >
          Baixar dados cadastrais (LGPD)
        </Button>
        {isSmeAdmin && (
          <Button variant="ghost" onClick={() => setConfirmAnon(true)}>
            Anonimizar aluno
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmAnon}
        title="Anonimizar aluno"
        description={`Os dados nominais de ${studentName} serão substituídos por marcadores anônimos, de forma irreversível. Notas e frequência do histórico são preservadas. Só é permitido para alunos sem matrícula ativa.`}
        confirmLabel="Anonimizar"
        destructive
        onConfirm={() => {
          setConfirmAnon(false)
          anonymize.mutate()
        }}
        onCancel={() => setConfirmAnon(false)}
      />
    </section>
  )
}
