"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";

// Función para generar un número aleatorio entre min y max
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

// Días de ejercicio: lunes (1), miércoles (3), viernes (5), sábado (6)
const exerciseDays = [1, 3, 5, 6];

interface HealthRecord {
  fecha: string;
  horaRegistro: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  frecuenciaCardiaca: number;
  frecuenciaCardiacaMin: number;
  frecuenciaCardiacaMax: number;
  nivelDeEstres: number;
  saturacionOxigeno: number;
  pasosDiarios: number;
  horasDeSueno: number;
  relojColocado: boolean;
}

// Genera datos para una fecha específica
function generateDayData(date: Date): HealthRecord[] {
  const dayOfWeek = date.getDay();
  const isExerciseDay = exerciseDays.includes(dayOfWeek);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const hours = [7, 9, 12, 15, 18, 21, 23];
  const records: HealthRecord[] = [];

  for (const hour of hours) {
    const isExerciseTime = isExerciseDay && hour >= 16 && hour <= 18;
    const isNightTime = hour >= 21;
    const isMorning = hour <= 9;
    
    let fcBase = 65;
    let fcMin = 55;
    let fcMax = 75;
    
    if (isExerciseTime) {
      fcBase = random(120, 150);
      fcMin = random(100, 120);
      fcMax = random(150, 175);
    } else if (isMorning) {
      fcBase = random(58, 68);
      fcMin = random(52, 58);
      fcMax = random(68, 78);
    } else if (isNightTime) {
      fcBase = random(55, 65);
      fcMin = random(50, 55);
      fcMax = random(65, 72);
    } else {
      fcBase = random(65, 85);
      fcMin = random(58, 65);
      fcMax = random(85, 100);
    }

    let stressLevel = random(10, 40);
    if (isExerciseTime) {
      stressLevel = random(5, 20);
    } else if (isWeekend) {
      stressLevel = random(5, 30);
    } else if (hour >= 9 && hour <= 18) {
      stressLevel = random(20, 50);
    }
    
    let spo2 = random(96, 99);
    if (isExerciseTime) {
      spo2 = random(95, 97);
    }

    let steps = 0;
    if (hour <= 9) steps = random(500, 2000);
    else if (hour <= 12) steps = random(3000, 5000);
    else if (hour <= 15) steps = random(5000, 7000);
    else if (hour <= 18) steps = isExerciseDay ? random(10000, 14000) : random(6000, 8000);
    else if (hour <= 21) steps = isExerciseDay ? random(12000, 16000) : random(7000, 10000);
    else steps = isExerciseDay ? random(13000, 18000) : random(8000, 12000);

    // Solo generar horas de sueño en el registro de las 7:00 (1 por día)
    let sleepHours = 0;
    if (hour === 7) {
      if (isWeekend) {
        sleepHours = randomFloat(7.5, 9);
      } else {
        sleepHours = randomFloat(6, 8);
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

export default function GenerateDataPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState<HealthRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const generatePreview = () => {
    const endDate = new Date('2025-11-25');
    const startDate = new Date('2025-11-11');
    
    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayRecords = generateDayData(new Date(currentDate));
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setPreviewData(allRecords);
    setMessage(`Preview: ${allRecords.length} registros serán generados`);
  };

  const uploadData = async () => {
    if (!user) {
      setMessage("❌ Debes iniciar sesión primero");
      return;
    }

    setLoading(true);
    setProgress(0);
    setMessage("Generando datos...");

    const endDate = new Date('2025-11-25');
    const startDate = new Date('2025-11-11');
    
    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayRecords = generateDayData(new Date(currentDate));
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setTotal(allRecords.length);
    setMessage(`Subiendo ${allRecords.length} registros a Firestore...`);

    // Usar el ID del usuario autenticado
    const healthRef = collection(db, "users", user.uid, "health_records");
    
    let count = 0;
    let errors = 0;
    for (const record of allRecords) {
      try {
        await addDoc(healthRef, record);
        count++;
        setProgress(count);
      } catch (error) {
        errors++;
        console.error('Error subiendo registro:', error);
        if (errors >= 3) {
          setMessage(`❌ Error: No tienes permisos para escribir. Verifica las reglas de Firestore.`);
          setLoading(false);
          return;
        }
      }
    }

    setMessage(`✅ Completado! Se subieron ${count} registros.`);
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Generador de Datos de Prueba</h1>
        
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Configuración</h2>
            <ul className="list-disc list-inside text-sm text-base-content/70 mb-4">
              <li>Período: 11/11/2025 - 25/11/2025 (2 semanas)</li>
              <li>Usuario: <span className="font-mono text-xs">{user?.uid}</span></li>
              <li>Email: {user?.email}</li>
              <li>Días de ejercicio: Lunes, Miércoles, Viernes, Sábado (16:00-18:00)</li>
              <li>Saturación O2: 95-99%</li>
              <li>Nivel de estrés: 0-70</li>
              <li>7 registros por día (diferentes horarios)</li>
            </ul>

            <div className="flex gap-4">
              <button 
                className="btn btn-secondary"
                onClick={generatePreview}
                disabled={loading}
              >
                👁️ Vista Previa
              </button>
              <button 
                className="btn btn-primary"
                onClick={uploadData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Subiendo...
                  </>
                ) : (
                  "🚀 Generar y Subir Datos"
                )}
              </button>
            </div>

            {loading && (
              <div className="mt-4">
                <progress 
                  className="progress progress-primary w-full" 
                  value={progress} 
                  max={total}
                ></progress>
                <p className="text-sm text-center mt-2">{progress} / {total}</p>
              </div>
            )}

            {message && (
              <div className="alert alert-info mt-4">
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        {previewData.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Vista Previa (primeros 20 registros)</h2>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>FC</th>
                      <th>SpO2</th>
                      <th>Estrés</th>
                      <th>Pasos</th>
                      <th>Sueño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td>{r.fecha}</td>
                        <td>{r.horaRegistro}</td>
                        <td>{r.frecuenciaCardiaca} BPM</td>
                        <td>{r.saturacionOxigeno}%</td>
                        <td>{r.nivelDeEstres}</td>
                        <td>{r.pasosDiarios.toLocaleString()}</td>
                        <td>{r.horasDeSueno > 0 ? `${r.horasDeSueno}h` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
