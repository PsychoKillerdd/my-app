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

// Tipos de condición de salud
type HealthCondition = "healthy" | "sick";

// Parámetros según condición de salud
const HEALTH_PARAMS = {
  healthy: {
    // Persona sana
    sleepMin: 6,
    sleepMax: 9,
    fcMin: 60,
    fcMax: 100,
    spo2Min: 96,
    spo2Max: 99,
    stressMorningMin: 5,
    stressMorningMax: 15,
    stressDayMin: 15,
    stressDayMax: 35,
    stepsHourMin: 300,
    stepsHourMax: 800,
  },
  sick: {
    // Persona enferma - parámetros alterados para detección por ML
    sleepMin: 2,           // Poco sueño (insomnio, malestar)
    sleepMax: 4.5,
    fcMin: 90,             // Frecuencia cardíaca elevada (fiebre, infección)
    fcMax: 130,
    spo2Min: 88,           // Saturación baja (problemas respiratorios)
    spo2Max: 94,
    stressMorningMin: 45,  // Estrés elevado todo el día
    stressMorningMax: 65,
    stressDayMin: 55,
    stressDayMax: 85,
    stepsHourMin: 20,      // Pocos pasos (fatiga, debilidad)
    stepsHourMax: 150,
  },
};

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

// Genera datos para una fecha específica según condición de salud
function generateDayData(date: Date, condition: HealthCondition): HealthRecord[] {
  const records: HealthRecord[] = [];
  const params = HEALTH_PARAMS[condition];
  
  // Generar UN SOLO valor de sueño para todo el día
  const sleepHours = randomFloat(params.sleepMin, params.sleepMax);
  
  // Acumulador de pasos que irá aumentando
  let accumulatedSteps = 0;

  // Generar registros cada hora desde las 8:00 hasta las 23:00
  for (let hour = 8; hour <= 23; hour++) {
    // Frecuencia cardíaca según condición
    const fcBase = random(params.fcMin, params.fcMax);
    const fcVariation = condition === "sick" ? random(10, 25) : random(5, 10);
    const fcMin = fcBase - fcVariation;
    const fcMax = fcBase + random(10, 20);
    
    // Pasos: incrementar según condición
    accumulatedSteps += random(params.stepsHourMin, params.stepsHourMax);
    
    // Oxígeno según condición
    const spo2 = random(params.spo2Min, params.spo2Max);
    
    // Estrés según condición y hora
    let stressLevel;
    if (hour >= 8 && hour <= 11) {
      stressLevel = random(params.stressMorningMin, params.stressMorningMax);
    } else {
      stressLevel = random(params.stressDayMin, params.stressDayMax);
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [healthCondition, setHealthCondition] = useState<HealthCondition>("healthy");
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
      setMessage("La fecha de inicio debe ser anterior a la fecha final");
      return;
    }
    
    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayRecords = generateDayData(new Date(currentDate), healthCondition);
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setPreviewData(allRecords);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const conditionLabel = healthCondition === "healthy" ? "SANA" : "ENFERMA";
    setMessage(`Preview: ${allRecords.length} registros para ${days} día(s) - Persona ${conditionLabel}`);
  };

  const uploadData = async () => {
    if (!user) {
      setMessage("Debes iniciar sesión primero");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setMessage("La fecha de inicio debe ser anterior a la fecha final");
      return;
    }

    setLoading(true);
    setProgress(0);
    const conditionLabel = healthCondition === "healthy" ? "SANA" : "ENFERMA";
    setMessage(`Generando datos de persona ${conditionLabel}...`);

    const allRecords: HealthRecord[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayRecords = generateDayData(new Date(currentDate), healthCondition);
      allRecords.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setTotal(allRecords.length);
    setMessage(`Subiendo ${allRecords.length} registros (${days} día(s)) - Persona ${conditionLabel}...`);

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
        <h1 className="text-3xl font-bold mb-8">Generador de Datos de Prueba</h1>
        
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Configuración</h2>
            
            {/* Selector de condición de salud */}
            <div className="form-control w-full mb-6">
              <label className="label">
                <span className="label-text font-semibold text-lg">Estado de Salud de la Persona</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`card cursor-pointer transition-all ${healthCondition === "healthy" ? "bg-green-100 border-2 border-green-500" : "bg-base-200 hover:bg-green-50"}`}
                  onClick={() => !loading && setHealthCondition("healthy")}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${healthCondition === "healthy" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      <h3 className="font-bold text-green-700">Persona Sana</h3>
                    </div>
                    <ul className="text-xs mt-2 text-gray-600 space-y-1">
                      <li>Sueño: 6-9 horas</li>
                      <li>Frecuencia cardíaca: 60-100 BPM</li>
                      <li>Saturación O2: 96-99%</li>
                      <li>Estrés: 5-35%</li>
                      <li>Pasos/hora: 300-800</li>
                    </ul>
                  </div>
                </div>
                <div 
                  className={`card cursor-pointer transition-all ${healthCondition === "sick" ? "bg-red-100 border-2 border-red-500" : "bg-base-200 hover:bg-red-50"}`}
                  onClick={() => !loading && setHealthCondition("sick")}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${healthCondition === "sick" ? "bg-red-500" : "bg-gray-300"}`}></div>
                      <h3 className="font-bold text-red-700">Persona Enferma</h3>
                    </div>
                    <ul className="text-xs mt-2 text-gray-600 space-y-1">
                      <li>Sueño: 2-4.5 horas (insomnio)</li>
                      <li>Frecuencia cardíaca: 90-130 BPM (elevada)</li>
                      <li>Saturación O2: 88-94% (baja)</li>
                      <li>Estrés: 45-85% (alto)</li>
                      <li>Pasos/hora: 20-150 (fatiga)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
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
              <li>Condición: <span className={`font-bold ${healthCondition === "healthy" ? "text-green-600" : "text-red-600"}`}>
                {healthCondition === "healthy" ? "SANA" : "ENFERMA"}
              </span></li>
              <li>Horarios: Cada hora de 8:00 a 23:00 (16 registros/día)</li>
            </ul>

            <div className={`alert ${healthCondition === "healthy" ? "alert-success" : "alert-error"} mb-4`}>
              <div>
                <span className="font-semibold">
                  {healthCondition === "healthy" ? "Parámetros Normales:" : "Parámetros Alterados (detección ML):"}
                </span>
                <ul className="text-xs mt-1">
                  {healthCondition === "healthy" ? (
                    <>
                      <li>FC: 60-100 BPM | SpO2: 96-99% | Sueño: 6-9h | Estrés: 5-35%</li>
                    </>
                  ) : (
                    <>
                      <li>FC: 90-130 BPM (taquicardia) | SpO2: 88-94% (hipoxemia leve)</li>
                      <li>Sueño: 2-4.5h (insomnio) | Estrés: 45-85% (elevado)</li>
                      <li>Pasos muy reducidos (fatiga/debilidad)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                className="btn btn-secondary"
                onClick={generatePreview}
                disabled={loading}
              >
                Vista Previa
              </button>
              <button 
                className={`btn ${healthCondition === "healthy" ? "btn-success" : "btn-error"}`}
                onClick={uploadData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Subiendo...
                  </>
                ) : (
                  `Generar Datos ${healthCondition === "healthy" ? "Sanos" : "Enfermos"}`
                )}
              </button>
            </div>

            <div className="text-xs text-base-content/60 mt-2">
              Los datos se generarán para el período seleccionado según la condición elegida
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
