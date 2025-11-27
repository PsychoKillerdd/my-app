// Script para generar datos falsos de salud
// Ejecutar con: npx ts-node src/scripts/generateFakeData.ts

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

// Usuario ID - CAMBIAR POR EL ID REAL DEL USUARIO
const USER_ID = "6VsRDCu3wldPe7oOHm9iMAdnnUa2";

// Función para generar un número aleatorio entre min y max
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

// Días de ejercicio: lunes (1), miércoles (3), viernes (5), sábado (6)
const exerciseDays = [1, 3, 5, 6];

// Genera datos para una fecha específica
function generateDayData(date: Date) {
  const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, etc.
  const isExerciseDay = exerciseDays.includes(dayOfWeek);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Horarios de registro durante el día
  const hours = [7, 9, 12, 15, 18, 21, 23];
  const records = [];

  for (const hour of hours) {
    const isExerciseTime = isExerciseDay && hour >= 16 && hour <= 18;
    const isNightTime = hour >= 21;
    const isMorning = hour <= 9;
    
    // Frecuencia cardíaca base según actividad
    let fcBase = 60; // reposo normal
    let fcMin = 55;
    let fcMax = 75;
    
    if (isExerciseTime) {
      fcBase = random(120, 150); // ejercicio
      fcMin = random(100, 120);
      fcMax = random(150, 175);
    } else if (isMorning) {
      fcBase = random(58, 68); // mañana, más bajo
      fcMin = random(52, 58);
      fcMax = random(68, 78);
    } else if (isNightTime) {
      fcBase = random(55, 65); // noche, más bajo
      fcMin = random(50, 55);
      fcMax = random(65, 72);
    } else {
      fcBase = random(65, 85); // día normal
      fcMin = random(58, 65);
      fcMax = random(85, 100);
    }

    // Nivel de estrés (0-70)
    let stressLevel = random(10, 40); // base normal
    if (isExerciseTime) {
      stressLevel = random(5, 20); // bajo durante ejercicio
    } else if (isWeekend) {
      stressLevel = random(5, 30); // más bajo fines de semana
    } else if (hour >= 9 && hour <= 18) {
      stressLevel = random(20, 50); // más alto durante trabajo/estudio
    }
    
    // Saturación de oxígeno (95-99%)
    let spo2 = random(96, 99);
    if (isExerciseTime) {
      spo2 = random(95, 97); // puede bajar un poco durante ejercicio intenso
    }

    // Pasos - acumulativos durante el día
    let steps = 0;
    if (hour <= 9) steps = random(500, 2000);
    else if (hour <= 12) steps = random(3000, 5000);
    else if (hour <= 15) steps = random(5000, 7000);
    else if (hour <= 18) steps = isExerciseDay ? random(10000, 14000) : random(6000, 8000);
    else if (hour <= 21) steps = isExerciseDay ? random(12000, 16000) : random(7000, 10000);
    else steps = isExerciseDay ? random(13000, 18000) : random(8000, 12000);

    // Horas de sueño (solo en registros de la mañana)
    let sleepHours = 0;
    if (isMorning) {
      if (isWeekend) {
        sleepHours = randomFloat(7.5, 9); // más sueño fines de semana
      } else {
        sleepHours = randomFloat(6, 8); // días de semana
      }
    }

    const dateStr = date.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0') + ':' + random(0, 59).toString().padStart(2, '0');
    
    const recordDate = new Date(date);
    recordDate.setHours(hour, random(0, 59), random(0, 59));

    records.push({
      fecha: dateStr,
      horaRegistro: hourStr,
      createdAt: Timestamp.fromDate(recordDate),
      lastUpdated: Timestamp.fromDate(recordDate),
      frecuenciaCardiaca: fcBase,
      frecuenciaCardiacaMin: fcMin,
      frecuenciaCardiacaMax: fcMax,
      nivelDeEstres: stressLevel,
      saturacionOxigeno: spo2,
      pasosDiarios: steps,
      horasDeSueno: sleepHours,
      relojColocado: true,
    });
  }

  return records;
}

// Función principal para generar datos de 2 semanas
export async function generateTwoWeeksData() {
  const endDate = new Date('2025-11-25');
  const startDate = new Date('2025-11-11'); // 2 semanas atrás
  
  const allRecords = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayRecords = generateDayData(new Date(currentDate));
    allRecords.push(...dayRecords);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Generados ${allRecords.length} registros`);
  console.log('Subiendo a Firestore...');

  const healthRef = collection(db, "users", USER_ID, "health_records");
  
  let count = 0;
  for (const record of allRecords) {
    try {
      const docId = `${record.fecha}_${record.createdAt.toMillis()}`;
      await addDoc(healthRef, record);
      count++;
      if (count % 10 === 0) {
        console.log(`Subidos ${count}/${allRecords.length} registros...`);
      }
    } catch (error) {
      console.error('Error subiendo registro:', error);
    }
  }

  console.log(`✅ Completado! Se subieron ${count} registros.`);
  return allRecords;
}

// Para ver los datos que se generarían (sin subir)
export function previewData() {
  const endDate = new Date('2025-11-25');
  const startDate = new Date('2025-11-11');
  
  const allRecords = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayRecords = generateDayData(new Date(currentDate));
    allRecords.push(...dayRecords);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Total registros: ${allRecords.length}`);
  console.log('\nPrimeros 5 registros:');
  allRecords.slice(0, 5).forEach(r => {
    console.log(`${r.fecha} ${r.horaRegistro} - FC:${r.frecuenciaCardiaca} SpO2:${r.saturacionOxigeno}% Estrés:${r.nivelDeEstres} Pasos:${r.pasosDiarios} Sueño:${r.horasDeSueno}h`);
  });
  
  return allRecords;
}
