import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { DOCUMENT_TYPE } from '@/components/ui/statusMaps'
import { cn } from '@/utils/cn'
import type { PaginatedResponse, Student } from '@/types/api'

const ACCEPTED = ['pdf', 'png', 'jpg', 'jpeg', 'docx']
const MAX_MB = 15

export function DocumentUploadModal({
  studentId,
  studentName,
  onClose,
}: {
  studentId?: string
  studentName?: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('other')
  const [description, setDescription] = useState('')
  const [pickedStudent, setPickedStudent] = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsStudent = !studentId
  const { data: studentList } = useQuery({
    queryKey: ['students', 'for-upload'],
    enabled: needsStudent,
    queryFn: () => apiGet<PaginatedResponse<Student>>('students/', { page_size: 100 }),
  })
  const effectiveStudentId = studentId ?? pickedStudent

  function pick(f: File | null) {
    setError(null)
    if (!f) {return}
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED.includes(ext)) {
      setError('Formato não aceito. Use PDF, PNG, JPG, JPEG ou DOCX.')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`O arquivo excede ${MAX_MB} MB.`)
      return
    }
    setFile(f)
  }

  async function submit() {
    if (!file) {
      setError('Selecione um arquivo.')
      return
    }
    if (!effectiveStudentId) {
      setError('Selecione o aluno.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('student', effectiveStudentId)
      body.append('document_type', docType)
      body.append('file', file)
      if (description) {body.append('description', description)}
      await apiClient.post('/documents/', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento enviado.')
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onClose()
    } catch (err) {
      const code = getErrorCode(err)
      setError(code ? resolveError(code).message() : 'Falha no envio do documento.')
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
          <div>
            <h2 className="text-section text-ink-900">Enviar documento</h2>
            {studentName && <p className="mt-1 text-help text-ink-500">{studentName}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        </div>

        {error && <InlineError title="Não foi possível enviar" message={error} />}

        {needsStudent && (
          <Field label="Aluno" name="student" required>
            <Select value={pickedStudent} onChange={(e) => setPickedStudent(e.target.value)}>
              <option value="">Selecionar aluno</option>
              {(studentList?.results ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files?.[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-line-strong'
          )}
        >
          <UploadCloud className="h-6 w-6 text-ink-400" />
          <p className="text-base text-ink-700">
            {file ? file.name : 'Arraste um arquivo ou clique para selecionar'}
          </p>
          <p className="text-help text-ink-400">PDF, PNG, JPG, JPEG ou DOCX · até {MAX_MB} MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <Field label="Tipo de documento" name="document_type" required>
          <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {Object.entries(DOCUMENT_TYPE).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descrição" name="description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-control w-full rounded border border-line-strong bg-white px-3 text-base"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}
