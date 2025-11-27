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
