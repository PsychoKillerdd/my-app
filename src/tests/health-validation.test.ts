import { describe, it, expect } from 'vitest'

// Función de validación de parámetros de salud
const validateHealthParams = (params: {
  sleepHours?: number
  heartRate?: number
  stressLevel?: number
  spo2?: number
  steps?: number
}) => {
  const errors: string[] = []
  
  if (params.sleepHours !== undefined) {
    if (params.sleepHours < 0 || params.sleepHours > 24) {
      errors.push('Horas de sueño debe estar entre 0 y 24')
    }
  }
  
  if (params.heartRate !== undefined) {
    if (params.heartRate < 30 || params.heartRate > 220) {
      errors.push('Frecuencia cardíaca debe estar entre 30 y 220 BPM')
    }
  }
  
  if (params.stressLevel !== undefined) {
    if (params.stressLevel < 0 || params.stressLevel > 100) {
      errors.push('Nivel de estrés debe estar entre 0 y 100%')
    }
  }
  
  if (params.spo2 !== undefined) {
    if (params.spo2 < 70 || params.spo2 > 100) {
      errors.push('Saturación de oxígeno debe estar entre 70 y 100%')
    }
  }
  
  if (params.steps !== undefined) {
    if (params.steps < 0) {
      errors.push('Pasos diarios no puede ser negativo')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Función para detectar anomalías de salud
const detectHealthAnomalies = (params: {
  sleepHours: number
  heartRate: number
  stressLevel: number
  spo2: number
}) => {
  const anomalies: string[] = []
  
  // Sueño insuficiente
  if (params.sleepHours < 5) {
    anomalies.push('Sueño insuficiente')
  }
  
  // Taquicardia
  if (params.heartRate > 100) {
    anomalies.push('Frecuencia cardíaca elevada')
  }
  
  // Bradicardia
  if (params.heartRate < 50) {
    anomalies.push('Frecuencia cardíaca baja')
  }
  
  // Estrés alto
  if (params.stressLevel > 60) {
    anomalies.push('Nivel de estrés elevado')
  }
  
  // Hipoxemia
  if (params.spo2 < 95) {
    anomalies.push('Saturación de oxígeno baja')
  }
  
  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    riskLevel: anomalies.length >= 3 ? 'alto' : anomalies.length >= 1 ? 'medio' : 'bajo',
  }
}

describe('Validación de Parámetros de Salud', () => {
  
  it('debe validar parámetros normales correctamente', () => {
    const params = {
      sleepHours: 7.5,
      heartRate: 75,
      stressLevel: 25,
      spo2: 98,
      steps: 8000,
    }
    
    const result = validateHealthParams(params)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('debe detectar horas de sueño inválidas', () => {
    const params = { sleepHours: 25 }
    
    const result = validateHealthParams(params)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Horas de sueño debe estar entre 0 y 24')
  })

  it('debe detectar frecuencia cardíaca fuera de rango', () => {
    const params = { heartRate: 250 }
    
    const result = validateHealthParams(params)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Frecuencia cardíaca debe estar entre 30 y 220 BPM')
  })

  it('debe detectar nivel de estrés inválido', () => {
    const params = { stressLevel: 150 }
    
    const result = validateHealthParams(params)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Nivel de estrés debe estar entre 0 y 100%')
  })

  it('debe rechazar pasos negativos', () => {
    const params = { steps: -100 }
    
    const result = validateHealthParams(params)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Pasos diarios no puede ser negativo')
  })
})

describe('Detección de Anomalías de Salud', () => {
  
  it('debe identificar persona sana sin anomalías', () => {
    const params = {
      sleepHours: 7.5,
      heartRate: 72,
      stressLevel: 20,
      spo2: 98,
    }
    
    const result = detectHealthAnomalies(params)
    
    expect(result.hasAnomalies).toBe(false)
    expect(result.riskLevel).toBe('bajo')
  })

  it('debe detectar sueño insuficiente', () => {
    const params = {
      sleepHours: 3,
      heartRate: 72,
      stressLevel: 20,
      spo2: 98,
    }
    
    const result = detectHealthAnomalies(params)
    
    expect(result.hasAnomalies).toBe(true)
    expect(result.anomalies).toContain('Sueño insuficiente')
  })

  it('debe detectar taquicardia', () => {
    const params = {
      sleepHours: 7,
      heartRate: 120,
      stressLevel: 20,
      spo2: 98,
    }
    
    const result = detectHealthAnomalies(params)
    
    expect(result.hasAnomalies).toBe(true)
    expect(result.anomalies).toContain('Frecuencia cardíaca elevada')
  })

  it('debe detectar hipoxemia', () => {
    const params = {
      sleepHours: 7,
      heartRate: 75,
      stressLevel: 20,
      spo2: 90,
    }
    
    const result = detectHealthAnomalies(params)
    
    expect(result.hasAnomalies).toBe(true)
    expect(result.anomalies).toContain('Saturación de oxígeno baja')
  })

  it('debe clasificar riesgo alto con múltiples anomalías (persona enferma)', () => {
    const params = {
      sleepHours: 3,      // Anomalía: sueño insuficiente
      heartRate: 115,     // Anomalía: taquicardia
      stressLevel: 75,    // Anomalía: estrés alto
      spo2: 91,           // Anomalía: hipoxemia
    }
    
    const result = detectHealthAnomalies(params)
    
    expect(result.hasAnomalies).toBe(true)
    expect(result.riskLevel).toBe('alto')
    expect(result.anomalies.length).toBeGreaterThanOrEqual(3)
  })
})
