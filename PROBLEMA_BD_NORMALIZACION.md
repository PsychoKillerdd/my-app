# Documentación del Problema de Inconsistencia en Base de Datos

## Problema Identificado

Durante el desarrollo del sistema, se detectó una **inconsistencia crítica en los nombres de campos** al almacenar datos en Firestore. Específicamente, el campo de horas de sueño se guardaba de dos formas diferentes:

1. **`horasDeSueno`** (sin tilde en la ñ)
2. **`horasDeSueño`** (con tilde en la ñ)

### Impacto del Problema

- **Pérdida de datos:** Al consultar `horasDeSueno`, los registros guardados como `horasDeSueño` retornaban `undefined`
- **Visualización inconsistente:** El dashboard mostraba valores nulos para días que SÍ tenían datos de sueño
- **Dificultad de consultas:** Era imposible predecir qué nomenclatura usaría cada registro
- **Datos históricos afectados:** Registros antiguos y nuevos usaban diferentes convenciones

### Causa Raíz

La inconsistencia se originó por:
1. Diferentes fuentes de datos usando nomenclaturas distintas
2. Falta de normalización al escribir en Firestore
3. JavaScript permitiendo ambas versiones sin advertencias
4. No había validación en el modelo de datos

---

## Solución Implementada

### 1. Función de Normalización

Creamos un archivo `src/lib/normalize-health-data.ts` con dos funciones principales:

```typescript
/**
 * Normaliza los campos de un registro de salud de Firestore
 * para asegurar consistencia en los nombres de campos (ñ vs n)
 */
export function normalizeHealthData(data: any): any {
  return {
    ...data,
    // Normalizar horasDeSueño → horasDeSueno (sin tilde)
    horasDeSueno: data.horasDeSueno || data.horasDeSueño || 0,
    // Asegurar que no se guarden ambas versiones
    horasDeSueño: undefined,
  };
}

/**
 * Prepara datos para guardar en Firestore con nombres normalizados
 */
export function prepareHealthDataForSave(data: any): any {
  const normalized = normalizeHealthData(data);
  
  // Eliminar campos undefined para no guardarlos en Firestore
  const cleaned: any = {};
  Object.keys(normalized).forEach(key => {
    if (normalized[key] !== undefined) {
      cleaned[key] = normalized[key];
    }
  });
  
  return cleaned;
}
```

### 2. Actualización del Sistema de Escritura

**Antes:**
```typescript
await addDoc(healthRef, record); // Guardaba directamente sin normalizar
```

**Después:**
```typescript
const normalizedRecord = prepareHealthDataForSave(record);
await addDoc(healthRef, normalizedRecord); // Normaliza antes de guardar
```

### 3. Compatibilidad con Datos Históricos

En el dashboard (`src/app/dashboard/page.tsx`), implementamos lectura compatible con ambas versiones:

```typescript
const record: HealthRecord = {
  // ... otros campos ...
  // Soporte para datos históricos con horasDeSueño (con tilde) 
  // y nuevos datos horasDeSueno (sin tilde)
  horasDeSueno: data.horasDeSueno || data.horasDeSueño,
  // ... otros campos ...
};
```

### 4. Actualización del Algoritmo de Consolidación

Modificamos la lógica de combinación de registros para manejar ambas nomenclaturas:

```typescript
// Combinar datos: tomar el mejor valor de cada campo
const combined = {
  ...existing,
  // Para sueño: tomar el valor que exista (priorizar el mayor si ambos existen)
  horasDeSueno: ((data.horasDeSueno || data.horasDeSueño) && 
                 (data.horasDeSueno || data.horasDeSueño) > 0) 
    ? (existing.horasDeSueno && existing.horasDeSueno > 0 
        ? Math.max(existing.horasDeSueno, data.horasDeSueno || data.horasDeSueño) 
        : (data.horasDeSueno || data.horasDeSueño))
    : existing.horasDeSueno,
  // ... otros campos ...
};
```

---

## Estándar Establecido

### Convención Oficial

**Todos los nuevos datos DEBEN usar:** `horasDeSueno` (sin tilde)

### Reglas para Desarrollo

1. **SIEMPRE usar `prepareHealthDataForSave()` antes de escribir en Firestore**
2. **Al leer:** Soportar ambas versiones para compatibilidad histórica
3. **Al escribir:** Solo usar formato sin tilde
4. **Validación:** Los tipos TypeScript solo definen `horasDeSueno`

---

## Implementación para App Móvil

### Recomendaciones Críticas

#### 1. Lectura de Datos (Compatible con BD Actual)

```javascript
// INCORRECTO - Solo lee una versión
const sleep = healthData.horasDeSueno;

// CORRECTO - Lee ambas versiones para compatibilidad
const sleep = healthData.horasDeSueno || healthData.horasDeSueño || 0;
```

#### 2. Escritura de Datos (Normalizada)

```javascript
// INCORRECTO - Puede crear inconsistencias
await firestore.collection('health_records').add({
  horasDeSueño: sleepHours, // ❌ CON tilde
  // ... otros campos
});

// CORRECTO - Usa el estándar establecido
const normalizedData = {
  horasDeSueno: sleepHours, // ✅ SIN tilde
  // ... otros campos
};
await firestore.collection('health_records').add(normalizedData);
```

#### 3. Función Helper Sugerida para React Native

```javascript
/**
 * Normaliza datos de salud antes de guardar en Firestore
 * Usar SIEMPRE antes de cualquier operación de escritura
 */
export const normalizeHealthRecord = (data) => {
  const normalized = {
    ...data,
    // Normalizar campo de sueño
    horasDeSueno: data.horasDeSueno || data.horasDeSueño || 0,
  };
  
  // Eliminar la versión con tilde si existe
  delete normalized.horasDeSueño;
  
  // Limpiar campos undefined
  return Object.keys(normalized).reduce((acc, key) => {
    if (normalized[key] !== undefined) {
      acc[key] = normalized[key];
    }
    return acc;
  }, {});
};

// Uso:
const dataToSave = normalizeHealthRecord({
  fecha: '2025-11-26',
  horasDeSueno: 7.5,
  // ... otros campos
});
await firestore.collection('health_records').add(dataToSave);
```

---

## Estructura Actual de Firestore

### Colección: `users/{userId}/health_records`

**Campos Estándar (usar estos nombres):**

```javascript
{
  fecha: "2025-11-26",              // String (YYYY-MM-DD)
  horaRegistro: "14:30",            // String (HH:MM)
  horasDeSueno: 7.5,                // Number ⚠️ SIN TILDE
  frecuenciaCardiaca: 72,           // Number
  frecuenciaCardiacaMin: 58,        // Number
  frecuenciaCardiacaMax: 95,        // Number
  pasosDiarios: 8540,               // Number
  saturacionOxigeno: 98,            // Number
  nivelDeEstres: 35,                // Number (0-100)
  relojColocado: true,              // Boolean
  lastUpdated: Timestamp,           // Firebase Timestamp
  createdAt: Timestamp              // Firebase Timestamp
}
```

### Campos que PUEDEN existir en datos antiguos:

- `horasDeSueño` (con tilde) - **NO USAR en nuevos registros**
- `event_timestamp` - Timestamp alternativo

---

## Testing Sugerido

### Casos de Prueba para la App Móvil

```javascript
// Test 1: Lectura de datos antiguos (con tilde)
const oldRecord = {
  horasDeSueño: 8.0, // Formato antiguo
  // ... otros campos
};
const sleep1 = oldRecord.horasDeSueno || oldRecord.horasDeSueño;
console.assert(sleep1 === 8.0, "Debe leer correctamente datos antiguos");

// Test 2: Lectura de datos nuevos (sin tilde)
const newRecord = {
  horasDeSueno: 7.5, // Formato nuevo
  // ... otros campos
};
const sleep2 = newRecord.horasDeSueno || newRecord.horasDeSueño;
console.assert(sleep2 === 7.5, "Debe leer correctamente datos nuevos");

// Test 3: Normalización antes de guardar
const mixedData = {
  horasDeSueño: 6.8, // Versión incorrecta
  pasosDiarios: 5000
};
const normalized = normalizeHealthRecord(mixedData);
console.assert(normalized.horasDeSueno === 6.8, "Debe normalizar a sin tilde");
console.assert(!normalized.horasDeSueño, "No debe tener versión con tilde");

// Test 4: Manejo de valores nulos
const emptyData = { fecha: '2025-11-26' };
const normalizedEmpty = normalizeHealthRecord(emptyData);
console.assert(normalizedEmpty.horasDeSueno === 0, "Debe usar 0 como default");
```

---

## Logs de Debug Recomendados

Para identificar problemas en producción:

```javascript
// Al leer de Firestore
const fetchHealthRecords = async (userId) => {
  const snapshot = await firestore
    .collection(`users/${userId}/health_records`)
    .get();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Log si encuentra ambas versiones
    if (data.horasDeSueno && data.horasDeSueño) {
      console.warn(`⚠️ Registro ${doc.id} tiene AMBAS versiones del campo sueño`);
    }
    
    // Log si solo encuentra versión antigua
    if (!data.horasDeSueno && data.horasDeSueño) {
      console.info(`ℹ️ Registro ${doc.id} usa formato antiguo (con tilde)`);
    }
  });
};
```

---

## Migración de Datos (Opcional)

Si quieres migrar todos los datos antiguos al nuevo formato:

```javascript
const migrateOldRecords = async (userId) => {
  const snapshot = await firestore
    .collection(`users/${userId}/health_records`)
    .where('horasDeSueño', '!=', null) // Solo registros con tilde
    .get();
  
  const batch = firestore.batch();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, {
      horasDeSueno: data.horasDeSueño,  // Copiar a formato sin tilde
      horasDeSueño: FieldValue.delete()  // Eliminar campo con tilde
    });
  });
  
  await batch.commit();
  console.log(`✅ Migrados ${snapshot.size} registros`);
};
```

---

## Checklist de Integración

Para el equipo de la app móvil:

- [ ] Implementar función `normalizeHealthRecord()` en utils
- [ ] Usar normalización en TODAS las escrituras a Firestore
- [ ] Leer con fallback: `data.horasDeSueno || data.horasDeSueño`
- [ ] Actualizar tipos/interfaces: solo definir `horasDeSueno`
- [ ] Agregar tests unitarios para normalización
- [ ] Documentar estándar en código
- [ ] Revisar código existente para inconsistencias
- [ ] Probar con datos reales de Firestore

---

## Contacto para Dudas

Si encuentran casos edge o problemas con la normalización, documentar:
1. Estructura exacta del documento en Firestore
2. Código que está causando el problema
3. Comportamiento esperado vs actual
4. Screenshots de logs/errores

**Estándar:** `horasDeSueno` (sin tilde) para todo nuevo desarrollo.
