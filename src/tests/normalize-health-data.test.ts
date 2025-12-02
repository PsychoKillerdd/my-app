import { describe, it, expect } from 'vitest'
import { normalizeHealthData, prepareHealthDataForSave } from '@/lib/normalize-health-data'

describe('Normalización de Datos de Salud', () => {
  
  describe('normalizeHealthData', () => {
    it('debe normalizar horasDeSueño (con tilde) a horasDeSueno', () => {
      const data = {
        fecha: '2025-12-01',
        horasDeSueño: 7.5,
        frecuenciaCardiaca: 75,
        nivelDeEstres: 25,
      }
      
      const result = normalizeHealthData(data)
      
      expect(result.horasDeSueno).toBe(7.5)
    })

    it('debe mantener horasDeSueno si ya está sin tilde', () => {
      const data = {
        fecha: '2025-12-01',
        horasDeSueno: 8.0,
        frecuenciaCardiaca: 70,
      }
      
      const result = normalizeHealthData(data)
      
      expect(result.horasDeSueno).toBe(8.0)
    })

    it('debe priorizar horasDeSueno sobre horasDeSueño si ambos existen', () => {
      const data = {
        fecha: '2025-12-01',
        horasDeSueno: 6.0,
        horasDeSueño: 8.0,
      }
      
      const result = normalizeHealthData(data)
      
      expect(result.horasDeSueno).toBe(6.0)
    })

    it('debe manejar datos vacíos sin errores', () => {
      const data = {}
      
      const result = normalizeHealthData(data)
      
      expect(result).toBeDefined()
      // La función retorna 0 como valor por defecto
      expect(result.horasDeSueno).toBeDefined()
    })
  })

  describe('prepareHealthDataForSave', () => {
    it('debe preparar datos para guardar con formato correcto', () => {
      const data = {
        fecha: '2025-12-01',
        horasDeSueño: 7.0,
        frecuenciaCardiaca: 80,
        nivelDeEstres: 30,
        pasosDiarios: 5000,
        saturacionOxigeno: 98,
      }
      
      const result = prepareHealthDataForSave(data)
      
      expect(result.horasDeSueno).toBe(7.0)
      expect(result.frecuenciaCardiaca).toBe(80)
      expect(result.nivelDeEstres).toBe(30)
    })
  })
})
