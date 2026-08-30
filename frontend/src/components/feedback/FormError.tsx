import { useNavigate } from 'react-router-dom'
import { InlineError } from '@/components/ui/InlineError'
import { Button } from '@/components/ui/Button'
import { getErrorCode, getErrorDetails } from '@/utils/api-helpers'
import { resolveError, type ErrorActionKind } from '@/services/errorMessages'
import { ROUTES } from '@/app/routes/paths'

const ACTION_ROUTE: Partial<Record<ErrorActionKind, string>> = {
  'open-transfer': ROUTES.transfers,
  'view-class': ROUTES.classes,
  'view-allocation': ROUTES.allocations,
}

/**
 * Renderiza o erro de negócio DENTRO do formulário (nunca só toast) quando há
 * correção possível na tela. Passe o erro capturado do axios/mutation.
 */
export function FormError({ error }: { error: unknown }) {
  const navigate = useNavigate()
  if (!error) {
    return null
  }

  const code = getErrorCode(error)
  const def = resolveError(code)
  const details = getErrorDetails(error)

  return (
    <InlineError
      code={code}
      title={def.title}
      message={def.message(details)}
      actions={
        def.action && ACTION_ROUTE[def.action.kind] ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(ACTION_ROUTE[def.action!.kind] as string)}
          >
            {def.action.label}
          </Button>
        ) : undefined
      }
    />
  )
}
