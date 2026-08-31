import { describe, it, expect } from 'vitest'
import { resolveError, ERROR_MESSAGES, FALLBACK_ERROR } from './errorMessages'

describe('resolveError', () => {
  it('devolve o fallback para código desconhecido ou vazio', () => {
    expect(resolveError(undefined)).toBe(FALLBACK_ERROR)
    expect(resolveError(null)).toBe(FALLBACK_ERROR)
    expect(resolveError('CODIGO_QUE_NAO_EXISTE')).toBe(FALLBACK_ERROR)
  })

  it('resolve os códigos do portal do responsável (DX-SGE-006)', () => {
    const codes = [
      'CPF_ALREADY_REGISTERED',
      'EMAIL_ALREADY_REGISTERED',
      'GUARDIAN_ALREADY_LINKED',
      'EMAIL_NOT_VERIFIED',
      'EMAIL_ALREADY_VERIFIED',
      'INVALID_VERIFICATION_TOKEN',
      'EXPIRED_VERIFICATION_TOKEN',
      'STUDENT_MATCH_FAILED',
      'REQUEST_PENDING',
      'ALREADY_LINKED',
      'INVALID_LINK_CODE',
      'REJECTION_NOTE_REQUIRED',
      'LINK_ALREADY_REVIEWED',
      'CAPTCHA_REQUIRED',
      'CAPTCHA_INVALID',
      'CAPTCHA_UNAVAILABLE',
    ]
    for (const code of codes) {
      const def = resolveError(code)
      expect(def).toBe(ERROR_MESSAGES[code])
      expect(def.title.length).toBeGreaterThan(0)
      expect(typeof def.message()).toBe('string')
      expect(def.message().length).toBeGreaterThan(0)
    }
  })

  it('STUDENT_MATCH_FAILED não revela se o aluno existe', () => {
    const msg = resolveError('STUDENT_MATCH_FAILED').message().toLowerCase()
    expect(msg).not.toContain('não existe')
    expect(msg).toContain('não conferem')
  })

  it('não tem chave duplicada de SCOPE_FORBIDDEN', () => {
    // regressão: o merge inicial criou SCOPE_FORBIDDEN duas vezes
    const occurrences = Object.keys(ERROR_MESSAGES).filter((k) => k === 'SCOPE_FORBIDDEN')
    expect(occurrences).toHaveLength(1)
  })
})
