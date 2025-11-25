// Tipos para los datos de salud de Firestore
export interface HealthRecord {
  altura: number;
  createdAt: Date;
  event_timestamp: Date;
  fecha: string;
  frecuenciaCardiaca: number;
  frecuenciaCardiacaMax: number;
  frecuenciaCardiacaMin: number;
  horaRegistro: string;
  horasDeSueno: number;
  nivelDeEstres: number;
  saturacionOxigeno: number;
  pasosDiarios: number;
  peso: number;
  relojColocado: boolean;
  tiempoPantalla: number;
}

export interface UserProfile {
  creationDate: Date;
  dob: string;
  email: string;
  emergencyContact: string;
  goal: string;
  height: number;
  name: string;
  sex: number;
  userId: string;
  weight: number;
}
