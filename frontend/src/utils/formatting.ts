/**
 * Funções de formatação de dados
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma data ISO string para formato legível
 */
export function formatDate(dateString: string | Date, pattern = 'dd/MM/yyyy'): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, pattern, { locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

/**
 * Formata data e hora
 */
export function formatDateTime(
  dateString: string | Date,
  pattern = 'dd/MM/yyyy HH:mm'
): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, pattern, { locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

/**
 * Formata distância entre datas (ex: "há 2 horas")
 */
export function formatRelativeDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return formatDistanceToNow(date, { locale: ptBR, addSuffix: true })
  } catch {
    return 'Data inválida'
  }
}

/**
 * Formata CPF (999.999.999-99)
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ (99.999.999/9999-99)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata telefone ((99) 99999-9999)
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

/**
 * Formata CEP (99999-999)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Formata moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Formata número com separador de milhares
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formata tamanho de arquivo (bytes)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Trunca texto em tamanho máximo
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Capitaliza primeira letra
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Capitaliza cada palavra
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ')
}

/**
 * Formata gênero
 */
export function formatGender(gender?: string): string {
  const genders: Record<string, string> = {
    M: 'Masculino',
    F: 'Feminino',
    O: 'Outro',
  }
  return genders[gender || 'O'] || 'Não especificado'
}

/**
 * Formata status
 */
export function formatStatus(status?: string): string {
  const statuses: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    archived: 'Arquivado',
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    failed: 'Reprovado',
    present: 'Presente',
    absent: 'Ausente',
    justified: 'Justificado',
  }
  return statuses[status || ''] || status || 'Desconhecido'
}
