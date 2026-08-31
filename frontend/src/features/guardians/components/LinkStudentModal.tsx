import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Checkbox } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { isValidCPF, normalizeCPF } from '@/utils/validation'
import { KINSHIP_TYPE_LABELS } from '@/types/api'
import type { KinshipType } from '@/types/api'
import { redeemLinkCode, requestStudentLink } from '../api/guardiansApi'

type Tab = 'code' | 'request'

export function LinkStudentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('code')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // comum
  const [cpf, setCpf] = useState('')
  // código
  const [code, setCode] = useState('')
  // solicitação
  const [birthDate, setBirthDate] = useState('')
  const [motherName, setMotherName] = useState('')
  const [kinship, setKinship] = useState<KinshipType>('MOTHER')
  const [isEmergency, setIsEmergency] = useState(true)

  function done(msg: string) {
    toast.success(msg)
    queryClient.invalidateQueries({ queryKey: ['guardians', 'my-dependents'] })
    onClose()
  }

  function fail(err: unknown) {
    setError(resolveError(getErrorCode(err)).message())
  }

  async function submit() {
    setError(null)
    if (!isValidCPF(cpf)) {
      setError('Informe um CPF válido do estudante.')
      return
    }
    setBusy(true)
    try {
      if (tab === 'code') {
        if (!code.trim()) {
          setError('Informe o código fornecido pela escola.')
          return
        }
        await redeemLinkCode({ student_cpf: normalizeCPF(cpf), code: code.trim() })
        done('Estudante vinculado à sua conta.')
      } else {
        if (!birthDate || motherName.trim().length < 3) {
          setError('Preencha a data de nascimento e o nome da mãe.')
          return
        }
        await requestStudentLink({
          student_cpf: normalizeCPF(cpf),
          birth_date: birthDate,
          mother_name: motherName.trim(),
          kinship_type: kinship,
          is_emergency_contact: isEmergency,
        })
        done('Solicitação enviada. A escola vai analisar o vínculo.')
      }
    } catch (err) {
      fail(err)
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
          <h2 className="text-section text-ink-900">Vincular estudante</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        </div>

        <div className="flex gap-1 rounded-md bg-surface-canvas p-1 text-help">
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`flex-1 rounded px-3 py-1.5 ${
              tab === 'code' ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            Tenho um código
          </button>
          <button
            type="button"
            onClick={() => setTab('request')}
            className={`flex-1 rounded px-3 py-1.5 ${
              tab === 'request' ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            Solicitar à escola
          </button>
        </div>

        {error && <InlineError title="Não foi possível vincular" message={error} />}

        <Field label="CPF do estudante" name="student_cpf" required mono>
          <Input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </Field>

        {tab === 'code' ? (
          <Field
            label="Código de vinculação"
            name="code"
            required
            help="Peça o código à secretaria da escola. Ele vale por tempo limitado e só pode ser usado uma vez."
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
            />
          </Field>
        ) : (
          <>
            <Field label="Data de nascimento do estudante" name="birth_date" required>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Field>
            <Field label="Nome completo da mãe" name="mother_name" required>
              <Input
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="Como consta no cadastro do estudante"
              />
            </Field>
            <Field label="Parentesco" name="kinship_type" required>
              <Select
                value={kinship}
                onChange={(e) => setKinship(e.target.value as KinshipType)}
              >
                {Object.entries(KINSHIP_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Checkbox
              label="Sou contato de emergência"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" loading={busy} onClick={submit}>
            {tab === 'code' ? 'Vincular' : 'Enviar solicitação'}
          </Button>
        </div>
      </div>
    </div>
  )
}
