import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { cn } from '@/utils/cn'

export type LookupResult = {
  id: string
  name: string
  /** identificadores mono: CPF, ID municipal, matrícula… */
  identifiers?: string[]
  detail?: string
}

/**
 * Passo 1 de "busca antes de criar" (P2 do DS). Antes de abrir o formulário
 * vazio, procura no cadastro único registros semelhantes.
 */
export function PersonLookupStep({
  title,
  placeholder,
  queryKey,
  search,
  onPick,
  onSkip,
  pickLabel = 'Usar este cadastro',
  skipLabel = 'Nenhum é — criar novo cadastro',
}: {
  title: string
  placeholder: string
  queryKey: string
  search: (term: string) => Promise<LookupResult[]>
  onPick: (result: LookupResult) => void
  onSkip: () => void
  pickLabel?: string
  skipLabel?: string
}) {
  const [term, setTerm] = useState('')
  const enabled = term.trim().length >= 3

  const results = useQuery({
    queryKey: [queryKey, 'lookup', term],
    queryFn: () => search(term.trim()),
    enabled,
  })

  const items = results.data ?? []

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <div>
        <h3 className="text-section text-ink-900">{title}</h3>
        <p className="mt-1 text-help text-ink-400">
          Procure antes de criar — evita cadastro duplicado na rede.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      {enabled && results.isLoading && <TableSkeleton rows={3} cols={2} />}

      {enabled && !results.isLoading && items.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-brand-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-label text-ink-700">{item.name}</p>
                <p className="flex flex-wrap gap-2 text-help text-ink-500">
                  {item.identifiers?.map((v, i) => (
                    <span key={i} className="font-mono tabular-nums">
                      {v}
                    </span>
                  ))}
                  {item.detail && <span>· {item.detail}</span>}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onPick(item)}>
                {pickLabel}
              </Button>
            </div>
          ))}
        </div>
      )}

      {enabled && !results.isLoading && items.length === 0 && (
        <p className={cn('text-help text-ink-500')}>Nenhum cadastro semelhante encontrado.</p>
      )}

      <div>
        <Button variant="secondary" onClick={onSkip}>
          {skipLabel}
        </Button>
      </div>
    </section>
  )
}
