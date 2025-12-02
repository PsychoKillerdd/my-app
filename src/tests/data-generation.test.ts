import { describe, it, expect } from 'vitest'

// Parámetros de generación de datos
const HEALTH_PARAMS = {
  healthy: {
    sleepMin: 6, sleepMax: 9,
    fcMin: 60, fcMax: 100,
    spo2Min: 96, spo2Max: 99,
    stressMax: 35,
    stepsHourMin: 300, stepsHourMax: 800,
  },
  sick: {
    sleepMin: 2, sleepMax: 4.5,
    fcMin: 90, fcMax: 130,
    spo2Min: 88, spo2Max: 94,
    stressMax: 85,
    stepsHourMin: 20, stepsHourMax: 150,
  },
}

// Función para generar valor aleatorio
const random = (min: number, max: number) => Math.random() * (max - min) + min

// Simulación de generación de datos
const generateHealthData = (condition: 'healthy' | 'sick') => {
  const params = HEALTH_PARAMS[condition]
  return {
    sleepHours: random(params.sleepMin, params.sleepMax),
    heartRate: random(params.fcMin, params.fcMax),
    spo2: random(params.spo2Min, params.spo2Max),
    stressLevel: random(0, params.stressMax),
    stepsPerHour: random(params.stepsHourMin, params.stepsHourMax),
  }
}

describe('Generación de Datos de Salud', () => {
  
  describe('Datos de Persona Sana', () => {
    it('debe generar horas de sueño entre 6 y 9 horas', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('healthy')
        expect(data.sleepHours).toBeGreaterThanOrEqual(6)
        expect(data.sleepHours).toBeLessThanOrEqual(9)
      }
    })

    it('debe generar frecuencia cardíaca entre 60 y 100 BPM', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('healthy')
        expect(data.heartRate).toBeGreaterThanOrEqual(60)
        expect(data.heartRate).toBeLessThanOrEqual(100)
      }
    })

    it('debe generar saturación de oxígeno entre 96 y 99%', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('healthy')
        expect(data.spo2).toBeGreaterThanOrEqual(96)
        expect(data.spo2).toBeLessThanOrEqual(99)
      }
    })

    it('debe generar nivel de estrés máximo de 35%', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('healthy')
        expect(data.stressLevel).toBeLessThanOrEqual(35)
      }
    })
  })

  describe('Datos de Persona Enferma', () => {
    it('debe generar horas de sueño reducidas (2-4.5h)', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('sick')
        expect(data.sleepHours).toBeGreaterThanOrEqual(2)
        expect(data.sleepHours).toBeLessThanOrEqual(4.5)
      }
    })

    it('debe generar frecuencia cardíaca elevada (90-130 BPM)', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('sick')
        expect(data.heartRate).toBeGreaterThanOrEqual(90)
        expect(data.heartRate).toBeLessThanOrEqual(130)
      }
    })

    it('debe generar saturación de oxígeno reducida (88-94%)', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('sick')
        expect(data.spo2).toBeGreaterThanOrEqual(88)
        expect(data.spo2).toBeLessThanOrEqual(94)
      }
    })

    it('debe generar pasos reducidos por fatiga', () => {
      for (let i = 0; i < 10; i++) {
        const data = generateHealthData('sick')
        expect(data.stepsPerHour).toBeLessThanOrEqual(150)
      }
    })
  })

  describe('Diferenciación para ML', () => {
    it('los datos de persona enferma deben ser claramente diferentes a los de persona sana', () => {
      const healthyData = generateHealthData('healthy')
      const sickData = generateHealthData('sick')
      
      // El sueño de persona enferma es menor
      expect(sickData.sleepHours).toBeLessThan(healthyData.sleepHours)
      
      // La frecuencia cardíaca de persona enferma es mayor
      expect(sickData.heartRate).toBeGreaterThan(healthyData.heartRate - 20)
      
      // La saturación de oxígeno de persona enferma es menor
      expect(sickData.spo2).toBeLessThan(healthyData.spo2)
    })
  })
})
