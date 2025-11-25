"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { HealthRecord } from "@/types/health";
import {
  SleepChart,
  StressChart,
  StepsCard,
} from "@/components/charts";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchHealthRecords(currentUser.uid);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchHealthRecords = async (userId: string) => {
    setLoadingRecords(true);
    try {
      const healthRef = collection(db, "users", userId, "health_records");
      // Obtener registros ordenados por fecha descendente
      const q = query(healthRef, orderBy("fecha", "desc"), limit(200));
      const querySnapshot = await getDocs(q);

      console.log("Total documentos obtenidos:", querySnapshot.size);

      const recordsByDate: Map<string, HealthRecord> = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const fecha = data.fecha;
        
        if (!fecha) {
          console.log("Documento sin fecha:", doc.id, data);
          return;
        }
        
        // Si ya tenemos un registro para esta fecha, solo actualizar si este tiene horas de sueño
        const existing = recordsByDate.get(fecha);
        const currentSleep = data.horasDeSueno || 0;
        const existingSleep = existing?.horasDeSueno || 0;
        
        // Preferir el registro con horas de sueño, o el más reciente
        if (!existing || (currentSleep > 0 && existingSleep === 0) || 
            (currentSleep > 0 && currentSleep > existingSleep)) {
          recordsByDate.set(fecha, {
            altura: data.altura,
            createdAt: data.createdAt?.toDate(),
            event_timestamp: data.event_timestamp?.toDate(),
            fecha: data.fecha,
            frecuenciaCardiaca: data.frecuenciaCardiaca,
            frecuenciaCardiacaMax: data.frecuenciaCardiacaMax,
            frecuenciaCardiacaMin: data.frecuenciaCardiacaMin,
            horaRegistro: data.horaRegistro,
            horasDeSueno: data.horasDeSueno,
            nivelDeEstres: data.nivelDeEstres,
            saturacionOxigeno: data.saturacionOxigeno,
            pasosDiarios: data.pasosDiarios,
            peso: data.peso,
            relojColocado: data.relojColocado,
            tiempoPantalla: data.tiempoPantalla,
          });
        } else if (existing) {
          // Combinar datos: mantener horas de sueño existentes pero actualizar otros valores si son mayores
          recordsByDate.set(fecha, {
            ...existing,
            frecuenciaCardiaca: Math.max(existing.frecuenciaCardiaca || 0, data.frecuenciaCardiaca || 0),
            frecuenciaCardiacaMax: Math.max(existing.frecuenciaCardiacaMax || 0, data.frecuenciaCardiacaMax || 0),
            frecuenciaCardiacaMin: Math.min(existing.frecuenciaCardiacaMin || 999, data.frecuenciaCardiacaMin || 999),
            pasosDiarios: Math.max(existing.pasosDiarios || 0, data.pasosDiarios || 0),
            saturacionOxigeno: data.saturacionOxigeno || existing.saturacionOxigeno,
          });
        }
      });

      console.log("Fechas únicas encontradas:", Array.from(recordsByDate.keys()));

      // Convertir a array y tomar los últimos 7 días
      const records = Array.from(recordsByDate.values())
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-7);

      console.log("Registros finales (7 días):", records.map(r => ({ fecha: r.fecha, sueno: r.horasDeSueno })));

      setHealthRecords(records);
    } catch (error) {
      console.error("Error fetching health records:", error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="loading loading-spinner loading-lg text-gray-400"></span>
      </div>
    );
  }

  // Obtener el último registro para los valores actuales
  const latestRecord = healthRecords[healthRecords.length - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="navbar bg-white shadow-sm border-b border-gray-100">
        <div className="flex-1">
          <span className="text-xl font-semibold text-gray-800 px-4">Samsung Machine</span>
        </div>
        <div className="flex-none gap-2">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar placeholder"
            >
              <div className="bg-gray-200 text-gray-600 rounded-full w-10">
                <span>{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-white rounded-lg w-52 border border-gray-100"
            >
              <li>
                <a className="text-gray-700 hover:bg-gray-50">Perfil</a>
              </li>
                  <li>
                <button onClick={handleLogout} className="text-gray-700 hover:bg-gray-50">Cerrar Sesión</button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-8">
        {/* Header con saludo */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Resumen de Salud</h1>
          <p className="text-gray-500 text-sm mt-1">
            Últimos 7 días
          </p>
        </div>

        {loadingRecords ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg text-gray-400"></span>
          </div>
        ) : healthRecords.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-gray-500">No hay registros de salud disponibles aún.</p>
          </div>
        ) : (
          <>
            {/* Primera fila: Cards principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Sueño de Hoy */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Sueño de Hoy</h3>
                  <div className="text-4xl font-semibold" style={{ color: (latestRecord?.horasDeSueno || 0) >= 7 ? '#22c55e' : (latestRecord?.horasDeSueno || 0) >= 5 ? '#eab308' : '#ef4444' }}>
                    {(latestRecord?.horasDeSueno || 0).toFixed(1)}
                  </div>
                  <span className="text-xs text-gray-400">horas</span>
                </div>
              </div>

              {/* Pasos Diarios */}
              <StepsCard steps={latestRecord?.pasosDiarios || 0} />

              {/* Frecuencia Cardíaca */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Frecuencia Cardíaca</h3>
                  <div className="text-4xl font-semibold text-red-500">
                    {latestRecord?.frecuenciaCardiaca || 0}
                  </div>
                  <span className="text-xs text-gray-400">BPM</span>
                  <div className="flex justify-center gap-3 mt-3">
                    <span className="text-xs text-gray-400">Min: {latestRecord?.frecuenciaCardiacaMin || 0}</span>
                    <span className="text-xs text-gray-400">Max: {latestRecord?.frecuenciaCardiacaMax || 0}</span>
                  </div>
                </div>
              </div>

              {/* Oxígeno en Sangre */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Oxígeno en Sangre</h3>
                  <div className="text-4xl font-semibold" style={{ color: (latestRecord?.saturacionOxigeno || 0) >= 95 ? '#22c55e' : (latestRecord?.saturacionOxigeno || 0) >= 90 ? '#eab308' : '#ef4444' }}>
                    {latestRecord?.saturacionOxigeno || 0}
                    <span className="text-xl">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Segunda fila: Gráfico de Horas de Sueño */}
            <div className="mb-6">
              <SleepChart
                data={healthRecords.map((r) => ({
                  fecha: r.fecha,
                  horasDeSueno: r.horasDeSueno,
                }))}
              />
            </div>

            {/* Tercera fila: Gráfico de Estrés */}
            <div className="mb-6">
              <StressChart
                data={healthRecords.map((r) => ({
                  fecha: r.fecha,
                  nivelDeEstres: r.nivelDeEstres,
                }))}
              />
            </div>

            {/* Última actualización */}
            <div className="text-center text-xs text-gray-400 mt-8">
              Última actualización:{" "}
              {latestRecord?.fecha
                ? new Date(latestRecord.fecha).toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
