import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import {
  downloadEducacensoExport,
  downloadRelatorioCsv,
  downloadRelatorioExcel,
} from '../api/officialDocs'

type Card = {
  key: string
  title: string
  description: string
  icon: React.ReactNode
  run: () => Promise<void>
  roles: string[]
}

export default function ExportsPage() {
  const scope = useScope()
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? ''
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    try {
      await fn()
    } catch {
      toast.error('Não foi possível gerar a exportação. Verifique seu escopo de acesso.')
    } finally {
      setBusy(null)
    }
  }

  const cards: Card[] = [
    {
      key: 'rendimento-xlsx',
      title: 'Rendimento da rede (Excel)',
      description: 'Notas consolidadas por aluno, no seu escopo de acesso.',
      icon: <FileSpreadsheet className="h-5 w-5 text-brand-600" />,
      run: () => downloadRelatorioExcel(user?.school ?? undefined),
      roles: ['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary'],
    },
    {
      key: 'rendimento-csv',
      title: 'Rendimento da rede (CSV)',
      description: 'Mesmo conteúdo em CSV, para importar em outras ferramentas.',
      icon: <FileText className="h-5 w-5 text-brand-600" />,
      run: () => downloadRelatorioCsv(user?.school ?? undefined),
      roles: ['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary'],
    },
    {
      key: 'educacenso',
      title: 'Pré-exportação Educacenso (CSV)',
      description: 'Relação de alunos e matrículas no formato de conciliação com o INEP.',
      icon: <GraduationCap className="h-5 w-5 text-brand-600" />,
      run: () => downloadEducacensoExport(user?.education_department ?? undefined),
      roles: ['sme_admin', 'sme_supervisor'],
    },
  ]

  const visible = cards.filter((c) => c.roles.includes(role))

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Documentos' }, { label: 'Exportações' }]}
        title="Exportações"
        meta="Relatórios oficiais e conciliações da rede."
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <section key={c.key} className="grid gap-3 rounded-lg border border-line bg-white p-6">
            <div className="flex items-center gap-2">
              {c.icon}
              <h2 className="text-label text-ink-900">{c.title}</h2>
            </div>
            <p className="text-help text-ink-500">{c.description}</p>
            <Button
              variant="secondary"
              iconLeft={<Download className="h-4 w-4" />}
              loading={busy === c.key}
              onClick={() => run(c.key, c.run)}
            >
              Baixar
            </Button>
          </section>
        ))}
      </div>
    </>
  )
}
