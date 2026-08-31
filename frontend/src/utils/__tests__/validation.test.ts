import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  isValidCEP,
  isValidURL,
  isStrongPassword,
  getPasswordStrength,
  isValidBirthDate,
  getAge,
  isValidFile,
  isValidNumber,
  isInRange,
  isValidPercentage,
} from '../validation'

describe('validation.ts', () => {
  describe('isValidEmail', () => {
    it('retorna true para emails válidos', () => {
      expect(isValidEmail('teste@escola.gov.br')).toBe(true)
      expect(isValidEmail('usuario.nome+tag@dominio.com')).toBe(true)
    })

    it('retorna false para emails inválidos', () => {
      expect(isValidEmail('invalido')).toBe(false)
      expect(isValidEmail('invalido@')).toBe(false)
      expect(isValidEmail('@dominio.com')).toBe(false)
      expect(isValidEmail('invalido@dominio')).toBe(false)
    })
  })

  describe('isValidCPF', () => {
    it('retorna true para CPFs válidos conhecidos', () => {
      // 52998224725 é um CPF válido com dígitos verificadores corretos
      expect(isValidCPF('52998224725')).toBe(true)
      expect(isValidCPF('529.982.247-25')).toBe(true)
    })

    it('retorna false para tamanho diferente de 11 dígitos', () => {
      expect(isValidCPF('123')).toBe(false)
      expect(isValidCPF('1234567890123')).toBe(false)
    })

    it('retorna false para CPFs com dígitos todos iguais', () => {
      expect(isValidCPF('11111111111')).toBe(false)
      expect(isValidCPF('00000000000')).toBe(false)
      expect(isValidCPF('999.999.999-99')).toBe(false)
    })

    it('retorna false para dígitos verificadores inválidos', () => {
      expect(isValidCPF('12345678900')).toBe(false)
      expect(isValidCPF('52998224720')).toBe(false)
    })
  })

  describe('isValidCNPJ', () => {
    it('retorna true para CNPJs válidos conhecidos', () => {
      // 00.000.000/0001-91 é o CNPJ do Banco do Brasil
      expect(isValidCNPJ('00000000000191')).toBe(true)
      expect(isValidCNPJ('00.000.000/0001-91')).toBe(true)
    })

    it('retorna false para tamanho diferente de 14 dígitos', () => {
      expect(isValidCNPJ('123')).toBe(false)
      expect(isValidCNPJ('123456789012345')).toBe(false)
    })

    it('retorna false para dígitos repetidos', () => {
      expect(isValidCNPJ('11111111111111')).toBe(false)
      expect(isValidCNPJ('00000000000000')).toBe(false)
    })

    it('retorna false para dígitos verificadores incorretos', () => {
      expect(isValidCNPJ('00000000000192')).toBe(false)
      expect(isValidCNPJ('12345678000100')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('retorna true para telefones de 10 e 11 dígitos', () => {
      expect(isValidPhone('11999998888')).toBe(true)
      expect(isValidPhone('(11) 99999-8888')).toBe(true)
      expect(isValidPhone('1133334444')).toBe(true)
      expect(isValidPhone('(11) 3333-4444')).toBe(true)
    })

    it('retorna false para números de tamanho inválido', () => {
      expect(isValidPhone('123456')).toBe(false)
      expect(isValidPhone('11999998888123')).toBe(false)
    })
  })

  describe('isValidCEP', () => {
    it('retorna true para CEP de 8 dígitos', () => {
      expect(isValidCEP('01001000')).toBe(true)
      expect(isValidCEP('01001-000')).toBe(true)
    })

    it('retorna false para CEP inválido', () => {
      expect(isValidCEP('123')).toBe(false)
      expect(isValidCEP('010010009')).toBe(false)
    })
  })

  describe('isValidURL', () => {
    it('retorna true para URLs válidas', () => {
      expect(isValidURL('https://escola.gov.br')).toBe(true)
      expect(isValidURL('http://localhost:8000/api/')).toBe(true)
    })

    it('retorna false para URLs inválidas', () => {
      expect(isValidURL('not-a-url')).toBe(false)
      expect(isValidURL('')).toBe(false)
    })
  })

  describe('isStrongPassword', () => {
    it('retorna true para senhas que atendem todos os critérios', () => {
      expect(isStrongPassword('Senha@Forte2026')).toBe(true)
    })

    it('retorna false se tiver menos de 8 caracteres', () => {
      expect(isStrongPassword('Ab1@')).toBe(false)
    })

    it('retorna false se faltar maiúscula, minúscula, número ou especial', () => {
      expect(isStrongPassword('senhasecreta123@')).toBe(false) // sem maiúscula
      expect(isStrongPassword('SENHASECRETA123@')).toBe(false) // sem minúscula
      expect(isStrongPassword('SenhaSecretaSemNumero@')).toBe(false) // sem número
      expect(isStrongPassword('SenhaSecreta12345')).toBe(false) // sem especial
    })
  })

  describe('getPasswordStrength', () => {
    it('calcula a força da senha com pontuação', () => {
      expect(getPasswordStrength('123')).toBe(15) // só números (+15)
      expect(getPasswordStrength('SenhaForte123@Completa')).toBe(100) // max 100
    })
  })

  describe('isValidBirthDate', () => {
    it('retorna true para data de nascimento válida', () => {
      expect(isValidBirthDate('2010-05-15')).toBe(true)
      expect(isValidBirthDate(new Date(2015, 0, 1))).toBe(true)
    })

    it('retorna false para datas futuras ou irreais', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 2)
      expect(isValidBirthDate(future)).toBe(false)

      const past1800 = new Date(1800, 0, 1)
      expect(isValidBirthDate(past1800)).toBe(false)
    })

    it('retorna false para string inválida', () => {
      expect(isValidBirthDate('invalido')).toBe(false)
    })
  })

  describe('getAge', () => {
    it('calcula a idade corretamente', () => {
      const today = new Date()
      const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
      expect(getAge(tenYearsAgo)).toBe(10)
    })

    it('calcula a idade quando ainda não fez aniversário no ano', () => {
      const today = new Date()
      const futureMonthBirth = new Date(today.getFullYear() - 10, today.getMonth() + 1, 1)
      expect(getAge(futureMonthBirth)).toBe(9)
    })

    it('aceita string no formato ISO', () => {
      const today = new Date()
      const fiveYearsAgoStr = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString()
      expect(getAge(fiveYearsAgoStr)).toBe(5)
    })
  })

  describe('isValidFile', () => {
    it('valida arquivo dentro do tamanho permitido', () => {
      const file = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' })
      const result = isValidFile(file, ['application/pdf'], 5)
      expect(result.valid).toBe(true)
    })

    it('rejeita arquivo maior que o limite em MB', () => {
      const largeContent = new ArrayBuffer(2 * 1024 * 1024)
      const file = new File([largeContent], 'grande.pdf', { type: 'application/pdf' })
      const result = isValidFile(file, ['application/pdf'], 1)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Arquivo muito grande')
    })

    it('rejeita arquivo com tipo não permitido', () => {
      const file = new File(['img'], 'foto.png', { type: 'image/png' })
      const result = isValidFile(file, ['application/pdf'], 10)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Tipo de arquivo não permitido')
    })
  })

  describe('isValidNumber', () => {
    it('retorna true para números e strings numéricas válidas', () => {
      expect(isValidNumber(123)).toBe(true)
      expect(isValidNumber('123.45')).toBe(true)
      expect(isValidNumber(0)).toBe(true)
    })

    it('retorna false para valores não numéricos', () => {
      expect(isValidNumber('abc')).toBe(false)
      expect(isValidNumber(NaN)).toBe(false)
      expect(isValidNumber(Infinity)).toBe(false)
    })
  })

  describe('isInRange', () => {
    it('valida limites inferior e superior', () => {
      expect(isInRange(5, 0, 10)).toBe(true)
      expect(isInRange(0, 0, 10)).toBe(true)
      expect(isInRange(10, 0, 10)).toBe(true)
      expect(isInRange(-1, 0, 10)).toBe(false)
      expect(isInRange(11, 0, 10)).toBe(false)
    })
  })

  describe('isValidPercentage', () => {
    it('valida porcentagem de 0 a 100', () => {
      expect(isValidPercentage(0)).toBe(true)
      expect(isValidPercentage(100)).toBe(true)
      expect(isValidPercentage(50.5)).toBe(true)
      expect(isValidPercentage(-1)).toBe(false)
      expect(isValidPercentage(101)).toBe(false)
    })
  })
})
