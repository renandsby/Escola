import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelativeDate,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatFileSize,
  truncateText,
  capitalize,
  titleCase,
  formatGender,
  formatStatus,
} from '../formatting'

describe('formatting.ts', () => {
  describe('formatDate', () => {
    it('formata data ISO string para padrão dd/MM/yyyy', () => {
      expect(formatDate('2026-05-20')).toBe('20/05/2026')
    })

    it('formata objeto Date corretamente', () => {
      const date = new Date(2026, 4, 20) // May 20, 2026
      expect(formatDate(date)).toBe('20/05/2026')
    })

    it('suporta padrão customizado', () => {
      expect(formatDate('2026-05-20', 'yyyy-MM-dd')).toBe('2026-05-20')
    })

    it('retorna "Data inválida" para string inválida', () => {
      expect(formatDate('data-invalida')).toBe('Data inválida')
    })
  })

  describe('formatDateTime', () => {
    it('formata data e hora com padrão padrão dd/MM/yyyy HH:mm', () => {
      expect(formatDateTime('2026-05-20T14:30:00')).toBe('20/05/2026 14:30')
    })

    it('formata objeto Date corretamente', () => {
      const date = new Date(2026, 4, 20, 14, 30)
      expect(formatDateTime(date)).toBe('20/05/2026 14:30')
    })

    it('suporta padrão customizado', () => {
      expect(formatDateTime('2026-05-20T14:30:00', 'HH:mm')).toBe('14:30')
    })

    it('retorna "Data inválida" para string inválida', () => {
      expect(formatDateTime('invalido')).toBe('Data inválida')
    })
  })

  describe('formatRelativeDate', () => {
    it('formata data relativa para string ISO', () => {
      const result = formatRelativeDate(new Date().toISOString())
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('formata data relativa com objeto Date', () => {
      const result = formatRelativeDate(new Date())
      expect(result).toBeTruthy()
    })

    it('retorna "Data inválida" para valor inválido', () => {
      expect(formatRelativeDate('invalido')).toBe('Data inválida')
    })
  })

  describe('formatCPF', () => {
    it('formata CPF numérico sem pontuação', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01')
    })

    it('formata CPF com caracteres já misturados', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01')
    })
  })

  describe('formatCNPJ', () => {
    it('formata CNPJ de 14 dígitos', () => {
      expect(formatCNPJ('12345678000199')).toBe('12.345.678/0001-99')
    })
  })

  describe('formatPhone', () => {
    it('formata celular de 11 dígitos', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
    })

    it('formata telefone fixo de 10 dígitos', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
    })

    it('retorna string original se tamanho for diferente de 10 ou 11 dígitos', () => {
      expect(formatPhone('123')).toBe('123')
    })
  })

  describe('formatCEP', () => {
    it('formata CEP de 8 dígitos', () => {
      expect(formatCEP('12345678')).toBe('12345-678')
    })
  })

  describe('formatCurrency', () => {
    it('formata valor numérico para BRL', () => {
      const formatted = formatCurrency(1234.56)
      expect(formatted).toContain('1.234,56')
    })
  })

  describe('formatPercentage', () => {
    it('formata percentual com 2 decimais padrão', () => {
      expect(formatPercentage(75.5)).toBe('75.50%')
    })

    it('formata percentual com decimais customizados', () => {
      expect(formatPercentage(75.556, 1)).toBe('75.6%')
    })
  })

  describe('formatNumber', () => {
    it('formata número sem decimais por padrão', () => {
      const formatted = formatNumber(10000)
      expect(formatted).toContain('10.000')
    })

    it('formata número com decimais especificados', () => {
      const formatted = formatNumber(10000.55, 2)
      expect(formatted).toContain('10.000,55')
    })
  })

  describe('formatFileSize', () => {
    it('retorna "0 Bytes" para 0', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('formata bytes em KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('formata bytes em MB', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
    })

    it('formata bytes em GB', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })
  })

  describe('truncateText', () => {
    it('retorna texto inalterado se menor ou igual ao tamanho máximo', () => {
      expect(truncateText('Olá', 10)).toBe('Olá')
      expect(truncateText('12345', 5)).toBe('12345')
    })

    it('trunca e adiciona reticências se maior que tamanho máximo', () => {
      expect(truncateText('Texto muito longo', 5)).toBe('Texto...')
    })
  })

  describe('capitalize', () => {
    it('capitaliza a primeira letra de uma palavra', () => {
      expect(capitalize('escola')).toBe('Escola')
      expect(capitalize('ESCOLA')).toBe('Escola')
    })
  })

  describe('titleCase', () => {
    it('capitaliza todas as palavras de uma sentença', () => {
      expect(titleCase('secretaria municipal de educacao')).toBe('Secretaria Municipal De Educacao')
    })
  })

  describe('formatGender', () => {
    it('retorna Masculino para M', () => {
      expect(formatGender('M')).toBe('Masculino')
    })

    it('retorna Feminino para F', () => {
      expect(formatGender('F')).toBe('Feminino')
    })

    it('retorna Outro para O', () => {
      expect(formatGender('O')).toBe('Outro')
    })

    it('retorna Outro para indefinido ou vazio', () => {
      expect(formatGender(undefined)).toBe('Outro')
      expect(formatGender('')).toBe('Outro')
    })

    it('retorna Não especificado se não encontrado no mapa', () => {
      expect(formatGender('X')).toBe('Não especificado')
    })
  })

  describe('formatStatus', () => {
    it('formata status conhecidos', () => {
      expect(formatStatus('active')).toBe('Ativo')
      expect(formatStatus('inactive')).toBe('Inativo')
      expect(formatStatus('archived')).toBe('Arquivado')
      expect(formatStatus('pending')).toBe('Pendente')
      expect(formatStatus('approved')).toBe('Aprovado')
      expect(formatStatus('rejected')).toBe('Rejeitado')
      expect(formatStatus('failed')).toBe('Reprovado')
      expect(formatStatus('present')).toBe('Presente')
      expect(formatStatus('absent')).toBe('Ausente')
      expect(formatStatus('justified')).toBe('Justificado')
      expect(formatStatus('PRESENT')).toBe('Presente')
      expect(formatStatus('ABSENT')).toBe('Ausente')
      expect(formatStatus('EXCUSED_ABSENCE')).toBe('Falta justificada')
    })

    it('retorna o status original ou Desconhecido se não mapeado', () => {
      expect(formatStatus('custom_status')).toBe('custom_status')
      expect(formatStatus(undefined)).toBe('Desconhecido')
      expect(formatStatus('')).toBe('Desconhecido')
    })
  })
})
