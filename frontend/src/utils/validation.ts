/**
 * Funções de validação
 */

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')

  // Verifica tamanho
  if (cleaned.length !== 11) {return false}

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {return false}

  // Valida dígitos verificadores
  let sum = 0
  let remainder

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i)
  }

  remainder = (sum * 10) % 11

  if (remainder === 10 || remainder === 11) {remainder = 0}

  if (remainder !== parseInt(cleaned.substring(9, 10))) {return false}

  sum = 0

  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i)
  }

  remainder = (sum * 10) % 11

  if (remainder === 10 || remainder === 11) {remainder = 0}

  if (remainder !== parseInt(cleaned.substring(10, 11))) {return false}

  return true
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')

  if (cleaned.length !== 14) {return false}

  if (/^(\d)\1{13}$/.test(cleaned)) {return false}

  let sum = 0
  let remainder

  for (let i = 0; i < 4; i++) {
    sum += parseInt(cleaned[i]) * (5 - i)
  }

  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i + 4]) * (9 - i)
  }

  remainder = sum % 11
  remainder = remainder < 2 ? 0 : 11 - remainder

  if (remainder !== parseInt(cleaned[12])) {return false}

  sum = 0

  for (let i = 0; i < 5; i++) {
    sum += parseInt(cleaned[i]) * (6 - i)
  }

  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i + 5]) * (9 - i)
  }

  remainder = sum % 11
  remainder = remainder < 2 ? 0 : 11 - remainder

  if (remainder !== parseInt(cleaned[13])) {return false}

  return true
}

/**
 * Valida telefone
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

/**
 * Valida CEP
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.length === 8 && /^\d{8}$/.test(cleaned)
}

/**
 * Valida URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Valida senha forte
 * Requisitos: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) {return false}

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
}

/**
 * Valida força da senha e retorna score
 */
export function getPasswordStrength(password: string): number {
  let strength = 0

  // Comprimento
  if (password.length >= 8) {strength += 20}
  if (password.length >= 12) {strength += 10}
  if (password.length >= 16) {strength += 10}

  // Tipos de caracteres
  if (/[a-z]/.test(password)) {strength += 15}
  if (/[A-Z]/.test(password)) {strength += 15}
  if (/\d/.test(password)) {strength += 15}
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {strength += 15}

  return Math.min(100, strength)
}

/**
 * Valida data de nascimento
 */
export function isValidBirthDate(date: string | Date): boolean {
  try {
    const birthDate = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()

    // Idade deve estar entre 0 e 150 anos
    return age >= 0 && age <= 150 && birthDate <= today
  } catch {
    return false
  }
}

/**
 * Calcula idade a partir da data de nascimento
 */
export function getAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Valida arquivo
 */
export function isValidFile(
  file: File,
  allowedTypes: string[] = [],
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB`,
    }
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Valida se é número
 */
export function isValidNumber(value: string | number): boolean {
  return !isNaN(Number(value)) && isFinite(Number(value))
}

/**
 * Valida faixa de números
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * Valida porcentagem (0-100)
 */
export function isValidPercentage(value: number): boolean {
  return isInRange(value, 0, 100)
}
