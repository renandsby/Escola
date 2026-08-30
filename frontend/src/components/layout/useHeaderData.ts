import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { NETWORK_IDENTITY } from '@/config/network'

type NetworkContext = {
  municipality_name: string | null
  academic_year: number | null
  term: number | null
  term_label: string | null
  grade_deadline: string | null
}

function ordinal(n: number): string {
  return `${n}º`
}

/**
 * Dados institucionais do `AppHeader`: identidade da rede, período letivo
 * corrente e contador de notificações não lidas.
 *
 *  - `GET /api/v1/dashboard/context/` resolve município + período para **qualquer**
 *    papel autenticado (escopo pela secretaria própria ou a da escola vinculada).
 *  - o sino some quando o usuário não tem canal de notificação (a chamada falha
 *    ou não retorna coleção).
 */
export function useHeaderData() {
  const context = useQuery({
    queryKey: ['header', 'network-context'],
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: () => apiGet<NetworkContext>('dashboard/context/'),
  })

  const municipality = context.data?.municipality_name
  const networkIdentity = municipality ? `Rede Municipal de ${municipality}` : NETWORK_IDENTITY

  let periodLabel: string | null = null
  const year = context.data?.academic_year
  if (year) {
    const term = context.data?.term
    periodLabel = `ANO LETIVO ${year}` + (term ? ` · ${ordinal(term)} BIMESTRE` : '')
  }

  return {
    networkIdentity,
    periodLabel,
  }
}
