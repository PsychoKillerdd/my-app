import { describe, it, expect } from 'vitest'

// Constantes del sistema
const ADMIN_EMAIL = 'admin@samsung.cl'

// Función de verificación de admin
const isAdmin = (email: string | null | undefined): boolean => {
  return email === ADMIN_EMAIL
}

// Función de filtrado de usuarios
const filterUsers = (
  users: Array<{ name: string; email: string; emergencyContact: string }>,
  searchTerm: string
) => {
  const term = searchTerm.toLowerCase()
  return users.filter(
    (u) =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.emergencyContact.includes(searchTerm)
  )
}

// Función para calcular estadísticas
const calculateUserStats = (
  users: Array<{
    lastHealthRecord: { nivelDeEstres: number; horasDeSueno: number } | null
    emergencyContact: string
  }>
) => {
  const total = users.length
  const withHealthData = users.filter((u) => u.lastHealthRecord !== null).length
  const withEmergencyContact = users.filter(
    (u) => u.emergencyContact !== 'No registrado'
  ).length
  const highStress = users.filter(
    (u) => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres > 40
  ).length

  return { total, withHealthData, withEmergencyContact, highStress }
}

describe('Panel de Administración', () => {
  
  describe('Verificación de Acceso Admin', () => {
    it('debe reconocer al administrador por su email', () => {
      expect(isAdmin('admin@samsung.cl')).toBe(true)
    })

    it('debe rechazar emails no autorizados', () => {
      expect(isAdmin('usuario@gmail.com')).toBe(false)
      expect(isAdmin('admin@gmail.com')).toBe(false)
      expect(isAdmin('admin@samsung.com')).toBe(false)
    })

    it('debe manejar valores nulos y undefined', () => {
      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
      expect(isAdmin('')).toBe(false)
    })
  })

  describe('Filtrado de Usuarios', () => {
    const mockUsers = [
      { name: 'Juan Pérez', email: 'juan@test.com', emergencyContact: '+56912345678' },
      { name: 'María García', email: 'maria@test.com', emergencyContact: '+56987654321' },
      { name: 'Carlos López', email: 'carlos@empresa.cl', emergencyContact: 'No registrado' },
    ]

    it('debe filtrar por nombre', () => {
      const result = filterUsers(mockUsers, 'Juan')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Juan Pérez')
    })

    it('debe filtrar por email', () => {
      const result = filterUsers(mockUsers, 'empresa.cl')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Carlos López')
    })

    it('debe filtrar por teléfono de emergencia', () => {
      const result = filterUsers(mockUsers, '+56912345678')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Juan Pérez')
    })

    it('debe retornar vacío si no hay coincidencias', () => {
      const result = filterUsers(mockUsers, 'xyz123')
      expect(result).toHaveLength(0)
    })

    it('debe ser case-insensitive para nombre y email', () => {
      const result = filterUsers(mockUsers, 'MARIA')
      expect(result).toHaveLength(1)
    })
  })

  describe('Cálculo de Estadísticas', () => {
    const mockUsers = [
      { lastHealthRecord: { nivelDeEstres: 25, horasDeSueno: 7 }, emergencyContact: '+56912345678' },
      { lastHealthRecord: { nivelDeEstres: 55, horasDeSueno: 4 }, emergencyContact: '+56987654321' },
      { lastHealthRecord: null, emergencyContact: 'No registrado' },
      { lastHealthRecord: { nivelDeEstres: 80, horasDeSueno: 3 }, emergencyContact: 'No registrado' },
    ]

    it('debe contar total de usuarios', () => {
      const stats = calculateUserStats(mockUsers)
      expect(stats.total).toBe(4)
    })

    it('debe contar usuarios con datos de salud', () => {
      const stats = calculateUserStats(mockUsers)
      expect(stats.withHealthData).toBe(3)
    })

    it('debe contar usuarios con contacto de emergencia', () => {
      const stats = calculateUserStats(mockUsers)
      expect(stats.withEmergencyContact).toBe(2)
    })

    it('debe contar usuarios con estrés alto (>40%)', () => {
      const stats = calculateUserStats(mockUsers)
      expect(stats.highStress).toBe(2)
    })
  })
})
