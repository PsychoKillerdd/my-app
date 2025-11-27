"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { prepareHealthDataForSave } from "@/lib/normalize-health-data";

// Función para generar un número aleatorio entre min y max
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

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
  const records: HealthRecord[] = [];
  
  // Generar UN SOLO valor de sueño para todo el día (entre 6 y 9 horas)
  const sleepHours = randomFloat(6, 9);
  
  // Acumulador de pasos que irá aumentando
  let accumulatedSteps = 0;

  // Generar registros cada hora desde las 8:00 hasta las 23:00 (24hrs)
  for (let hour = 8; hour <= 23; hour++) {
    // Frecuencia cardíaca: 1 por hora
    const fcBase = random(60, 100);
    const fcMin = fcBase - random(5, 10);
    const fcMax = fcBase + random(10, 20);
    
    // Pasos: incrementar entre 100 y 500 cada hora
    accumulatedSteps += random(100, 500);
    
    // Oxígeno: cambiar cada hora entre 96 y 99
    const spo2 = random(96, 99);
    
    // Estrés: máximo 35%, bajo en las mañanas (8-11h)
    let stressLevel;
    if (hour >= 8 && hour <= 11) {
      // Mañanas: estrés bajo (5-15%)
      stressLevel = random(5, 15);
    } else {
      // Resto del día: estrés normal (15-35%)
      stressLevel = random(15, 35);
    }
    
    const dateStr = date.toISOString().split('T')[0];
    const minute = random(0, 59);
    const hourStr = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
    
    const recordDate = new Date(date);
    recordDate.setHours(hour, minute, random(0, 59));

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
      pasosDiarios: accumulatedSteps,
      horasDeSueno: sleepHours, // EL MISMO valor de sueño en todos los registros del día
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Fecha actual
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Fecha actual
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setMessage("❌ La fecha de inicio debe ser anterior a la fecha final");
      return;
    }
    
    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayRecords = generateDayData(new Date(currentDate));
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setPreviewData(allRecords);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setMessage(`Preview: ${allRecords.length} registros para ${days} día(s) (${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')})`);
  };

  const uploadData = async () => {
    if (!user) {
      setMessage("❌ Debes iniciar sesión primero");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setMessage("❌ La fecha de inicio debe ser anterior a la fecha final");
      return;
    }

    setLoading(true);
    setProgress(0);
    setMessage("Generando datos...");

    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayRecords = generateDayData(new Date(currentDate));
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setTotal(allRecords.length);
    setMessage(`Subiendo ${allRecords.length} registros (${days} día(s)) a Firestore...`);

    // Usar el ID del usuario autenticado
    const healthRef = collection(db, "users", user.uid, "health_records");
    
    let count = 0;
    let errors = 0;
    for (const record of allRecords) {
      try {
        // Normalizar los datos antes de guardar
        const normalizedRecord = prepareHealthDataForSave(record);
        await addDoc(healthRef, normalizedRecord);
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
            
            {/* Selector de fechas */}
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text font-semibold">Período de datos</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Fecha inicio</span>
                  </label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input input-bordered w-full"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Fecha fin</span>
                  </label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input input-bordered w-full"
                    disabled={loading}
                  />
                </div>
              </div>
              <label className="label">
                <span className="label-text-alt">Selecciona el período para el que quieres generar datos</span>
              </label>
            </div>

            <ul className="list-disc list-inside text-sm text-base-content/70 mb-4">
              <li>Usuario: <span className="font-mono text-xs">{user?.uid}</span></li>
              <li>Email: {user?.email}</li>
              <li>Horarios: Cada hora de 8:00 a 23:00 (16 registros/día)</li>
              <li>Sueño: 1 valor único por día (6-9h) en todos los registros</li>
              <li>Frecuencia cardíaca: Diferente cada hora (60-100 BPM)</li>
              <li>Pasos: Acumulados por hora (+100 a +500 cada hora)</li>
              <li>Saturación O2: Cambia cada hora (96-99%)</li>
              <li>Estrés: Mañanas (8-11h): 5-15% | Resto: 15-35%</li>
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

            <div className="text-xs text-base-content/60 mt-2">
              ℹ️ Los datos se generarán para el período seleccionado y se normalizarán antes de guardar
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
