import { cn } from '@/utils/cn'

/** Seção de formulário longo: título+descrição à esquerda, campos à direita. */
export function FormSection({
  title,
  description,
  children,
  className,
  first,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  first?: boolean
}) {
  return (
    <section
      className={cn(
        'grid gap-4 pt-5 md:grid-cols-[200px_1fr] md:gap-6',
        !first && 'border-t border-line-soft',
        className
      )}
    >
      <div>
        <h3 className="text-label text-ink-700">{title}</h3>
        {description && <p className="mt-1 text-help text-ink-400">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Barra de ação fixa no rodapé do formulário. */
export function StickyActions({
  pending,
  children,
}: {
  /** ex.: "2 campos obrigatórios pendentes" */
  pending?: string
  children: React.ReactNode
}) {
  return (
    <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-surface-subtle px-6 py-4 shadow-sticky lg:-mx-8">
      <span className="text-help text-ink-500">{pending}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
