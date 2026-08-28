import { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

/**
 * Primitivo visual para estados de carregamento ("loading skeleton").
 * Renderiza um bloco cinza pulsante — sem dependências externas.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}
