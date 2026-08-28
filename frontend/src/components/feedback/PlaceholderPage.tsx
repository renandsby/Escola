import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

/** Tela ainda não implementada — evita link morto no menu. */
export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="grid gap-5">
      <PageHeader title={title} />
      <EmptyState
        title="Em construção"
        description={
          note ??
          'Esta área ainda não está disponível na interface. Use a API ou a área administrativa por enquanto.'
        }
      />
    </div>
  )
}
