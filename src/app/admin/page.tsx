"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ADMIN_EMAIL = "admin@samsung.cl";

interface HealthRecord {
  fecha: string;
  horasDeSueno: number;
  frecuenciaCardiaca: number;
  nivelDeEstres: number;
  pasosDiarios: number;
  saturacionOxigeno: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  emergencyContact: string;
  dob: string;
  height: number;
  weight: number;
  sex: number;
  goal: string;
  creationDate: Date | null;
  lastHealthRecord: HealthRecord | null;
  allHealthRecords: HealthRecord[];
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Verificar si es admin
        if (currentUser.email !== ADMIN_EMAIL) {
          router.push("/dashboard");
          return;
        }
        setUser(currentUser);
        fetchAllUsers();
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      // Obtener todos los usuarios de la colección users
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      console.log("Total usuarios encontrados:", usersSnapshot.size);
      console.log("IDs de usuarios:", usersSnapshot.docs.map(d => d.id));
      
      const usersData: UserData[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        console.log("Usuario:", userDoc.id, userData);
        
        // Obtener TODOS los registros de salud del usuario
        let lastHealthRecord = null;
        const allHealthRecords: HealthRecord[] = [];
        try {
          const healthRef = collection(db, "users", userDoc.id, "health_records");
          const healthQuery = query(healthRef, orderBy("fecha", "desc"));
          const healthSnapshot = await getDocs(healthQuery);
          
          console.log(`Health records para ${userDoc.id}:`, healthSnapshot.size);
          
          healthSnapshot.docs.forEach((doc, index) => {
            const healthData = doc.data();
            const record: HealthRecord = {
              fecha: healthData.fecha,
              horasDeSueno: healthData.horasDeSueno || healthData.horasDeSueño || 0,
              frecuenciaCardiaca: healthData.frecuenciaCardiaca || 0,
              nivelDeEstres: healthData.nivelDeEstres || 0,
              pasosDiarios: healthData.pasosDiarios || 0,
              saturacionOxigeno: healthData.saturacionOxigeno || 0,
            };
            allHealthRecords.push(record);
            if (index === 0) {
              lastHealthRecord = record;
            }
          });
        } catch (healthError) {
          console.log("Error health records for user:", userDoc.id, healthError);
        }
        
        usersData.push({
          id: userDoc.id,
          email: userData.email || "Sin email",
          name: userData.name || "Sin nombre",
          emergencyContact: userData.emergencyContact || "No registrado",
          dob: userData.dob || "No registrado",
          height: userData.height || 0,
          weight: userData.weight || 0,
          sex: userData.sex || 0,
          goal: userData.goal || "No especificado",
          creationDate: userData.creationDate?.toDate() || null,
          lastHealthRecord,
          allHealthRecords,
        });
      }
      
      console.log("Usuarios procesados:", usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.emergencyContact.includes(searchTerm)
  );

  const getSexLabel = (sex: number) => {
    switch (sex) {
      case 0: return "No especificado";
      case 1: return "Masculino";
      case 2: return "Femenino";
      default: return "Otro";
    }
  };

  // Calcular estadísticas globales
  const calculateGlobalStats = () => {
    const usersWithHealth = users.filter(u => u.lastHealthRecord);
    if (usersWithHealth.length === 0) return null;

    const avgSleep = usersWithHealth.reduce((sum, u) => sum + (u.lastHealthRecord?.horasDeSueno || 0), 0) / usersWithHealth.length;
    const avgStress = usersWithHealth.reduce((sum, u) => sum + (u.lastHealthRecord?.nivelDeEstres || 0), 0) / usersWithHealth.length;
    const avgSteps = usersWithHealth.reduce((sum, u) => sum + (u.lastHealthRecord?.pasosDiarios || 0), 0) / usersWithHealth.length;
    const avgHeartRate = usersWithHealth.reduce((sum, u) => sum + (u.lastHealthRecord?.frecuenciaCardiaca || 0), 0) / usersWithHealth.length;
    const avgSpO2 = usersWithHealth.reduce((sum, u) => sum + (u.lastHealthRecord?.saturacionOxigeno || 0), 0) / usersWithHealth.length;

    return { avgSleep, avgStress, avgSteps, avgHeartRate, avgSpO2 };
  };

  // Datos para gráfico de distribución de estrés
  const getStressDistribution = () => {
    const low = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres <= 20).length;
    const medium = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres > 20 && u.lastHealthRecord.nivelDeEstres <= 40).length;
    const high = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres > 40 && u.lastHealthRecord.nivelDeEstres <= 60).length;
    const veryHigh = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres > 60).length;
    return { low, medium, high, veryHigh };
  };

  // Datos para gráfico de distribución de sueño
  const getSleepDistribution = () => {
    const poor = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.horasDeSueno < 5).length;
    const fair = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.horasDeSueno >= 5 && u.lastHealthRecord.horasDeSueno < 7).length;
    const good = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.horasDeSueno >= 7 && u.lastHealthRecord.horasDeSueno < 8).length;
    const excellent = users.filter(u => u.lastHealthRecord && u.lastHealthRecord.horasDeSueno >= 8).length;
    return { poor, fair, good, excellent };
  };

  // Datos para gráfico de tendencias de los últimos 7 días
  const getWeeklyTrends = () => {
    const allRecords: HealthRecord[] = [];
    users.forEach(u => allRecords.push(...u.allHealthRecords));
    
    // Agrupar por fecha y calcular promedios
    const byDate: { [key: string]: { sleep: number[]; stress: number[]; steps: number[] } } = {};
    allRecords.forEach(r => {
      if (!byDate[r.fecha]) {
        byDate[r.fecha] = { sleep: [], stress: [], steps: [] };
      }
      byDate[r.fecha].sleep.push(r.horasDeSueno);
      byDate[r.fecha].stress.push(r.nivelDeEstres);
      byDate[r.fecha].steps.push(r.pasosDiarios);
    });

    // Ordenar fechas y tomar las últimas 7
    const sortedDates = Object.keys(byDate).sort().slice(-7);
    const avgSleep = sortedDates.map(d => byDate[d].sleep.reduce((a, b) => a + b, 0) / byDate[d].sleep.length);
    const avgStress = sortedDates.map(d => byDate[d].stress.reduce((a, b) => a + b, 0) / byDate[d].stress.length);
    const avgSteps = sortedDates.map(d => byDate[d].steps.reduce((a, b) => a + b, 0) / byDate[d].steps.length);

    return { dates: sortedDates, avgSleep, avgStress, avgSteps };
  };

  // Datos para gráfico de pasos por usuario
  const getUserStepsComparison = () => {
    const usersWithSteps = users.filter(u => u.lastHealthRecord).slice(0, 10);
    return {
      names: usersWithSteps.map(u => u.name.split(' ')[0]),
      steps: usersWithSteps.map(u => u.lastHealthRecord?.pasosDiarios || 0),
    };
  };

  // Datos para distribución por sexo
  const getSexDistribution = () => {
    const male = users.filter(u => u.sex === 1).length;
    const female = users.filter(u => u.sex === 2).length;
    const other = users.filter(u => u.sex !== 1 && u.sex !== 2).length;
    return { male, female, other };
  };

  const globalStats = calculateGlobalStats();
  const stressDistribution = getStressDistribution();
  const sleepDistribution = getSleepDistribution();
  const weeklyTrends = getWeeklyTrends();
  const userSteps = getUserStepsComparison();
  const sexDistribution = getSexDistribution();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="loading loading-spinner loading-lg text-gray-400"></span>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar Power BI Style */}
      <div className="navbar bg-slate-800 text-white shadow-lg">
        <div className="flex-1">
          <span className="text-xl font-bold px-4 tracking-wide">
            Samsung Machine Analytics
          </span>
          <span className="bg-yellow-500 text-slate-800 text-xs font-bold px-2 py-1 rounded ml-2">PRO</span>
        </div>
        <div className="flex-none gap-2">
          <button 
            onClick={() => router.push("/dashboard")}
            className="btn btn-ghost btn-sm text-white hover:bg-slate-700"
          >
            Dashboard Usuario
          </button>
          <div className="bg-yellow-500 text-slate-800 rounded-full w-8 h-8 flex items-center justify-center">
            <span className="text-sm font-bold">A</span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Header con KPIs principales */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
          <p className="text-slate-500 text-sm">{users.length} usuarios activos | Última actualización: {new Date().toLocaleString("es-ES")}</p>
        </div>

        {/* KPI Cards Row - Power BI Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Total Usuarios</p>
            <p className="text-4xl font-bold text-slate-800">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Con Datos Salud</p>
            <p className="text-4xl font-bold text-slate-800">{users.filter(u => u.lastHealthRecord).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Contacto Emergencia</p>
            <p className="text-4xl font-bold text-slate-800">{users.filter(u => u.emergencyContact !== "No registrado").length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Estrés Alto</p>
            <p className="text-4xl font-bold text-red-600">{users.filter(u => u.lastHealthRecord && u.lastHealthRecord.nivelDeEstres > 40).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Prom. Sueño</p>
            <p className="text-4xl font-bold text-slate-800">{globalStats?.avgSleep.toFixed(1) || "0"}h</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-500">
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Prom. Pasos</p>
            <p className="text-4xl font-bold text-slate-800">{globalStats?.avgSteps.toLocaleString("es-ES", { maximumFractionDigits: 0 }) || "0"}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono de emergencia..."
            className="input input-bordered w-full max-w-md bg-white text-slate-900 placeholder-slate-400 border-slate-300 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-8">
          {loadingUsers ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg text-gray-400"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-gray-700 text-base py-4">Usuario</th>
                    <th className="text-gray-700 text-base py-4">Contacto Emergencia</th>
                    <th className="text-gray-700 text-base py-4">Último Registro</th>
                    <th className="text-gray-700 text-base py-4">Métricas Recientes</th>
                    <th className="text-gray-700 text-base py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <div className="font-semibold text-gray-900 text-base">{userData.name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                          </svg>
                          <span className={userData.emergencyContact === "No registrado" ? "text-gray-400" : "text-gray-900 font-medium"}>
                            {userData.emergencyContact}
                          </span>
                        </div>
                      </td>
                      <td>
                        {userData.lastHealthRecord ? (
                          <span className="text-sm text-gray-600">
                            {new Date(userData.lastHealthRecord.fecha).toLocaleDateString("es-ES")}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Sin registros</span>
                        )}
                      </td>
                      <td>
                        {userData.lastHealthRecord ? (
                          <div className="flex gap-2 text-xs">
                            <span className="badge badge-ghost">
                              {userData.lastHealthRecord.horasDeSueno.toFixed(1)}h sueño
                            </span>
                            <span className="badge badge-ghost">
                              {userData.lastHealthRecord.frecuenciaCardiaca} BPM
                            </span>
                            <span className={`badge ${userData.lastHealthRecord.nivelDeEstres > 50 ? 'badge-error' : 'badge-ghost'}`}>
                              {userData.lastHealthRecord.nivelDeEstres}% estrés
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost text-blue-600"
                          onClick={() => setSelectedUser(userData)}
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron usuarios
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={fetchAllUsers}
            disabled={loadingUsers}
            className="btn btn-ghost btn-sm text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Actualizar datos
          </button>
        </div>

        {/* Separador Visual */}
        <div className="border-t border-slate-300 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mt-4 mb-4">Análisis de Datos</h2>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Tendencia Semanal */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Tendencia Semanal - Promedios Globales</h3>
            <div className="h-64">
              <Line
                data={{
                  labels: weeklyTrends.dates.map(d => {
                    const date = new Date(d);
                    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
                  }),
                  datasets: [
                    {
                      label: "Sueño (h)",
                      data: weeklyTrends.avgSleep,
                      borderColor: "#3b82f6",
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: "Estrés (%)",
                      data: weeklyTrends.avgStress,
                      borderColor: "#f59e0b",
                      backgroundColor: "transparent",
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>

          {/* Distribución de Estrés */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribución de Estrés</h3>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: ["Bajo (0-20%)", "Medio (21-40%)", "Alto (41-60%)", "Muy Alto (>60%)"],
                  datasets: [
                    {
                      data: [stressDistribution.low, stressDistribution.medium, stressDistribution.high, stressDistribution.veryHigh],
                      backgroundColor: ["#22c55e", "#facc15", "#f97316", "#ef4444"],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Pasos por Usuario */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Pasos Diarios por Usuario (Top 10)</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: userSteps.names,
                  datasets: [
                    {
                      label: "Pasos",
                      data: userSteps.steps,
                      backgroundColor: userSteps.steps.map(s => s >= 10000 ? "#22c55e" : s >= 7000 ? "#facc15" : "#ef4444"),
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>

          {/* Distribución de Sueño */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Calidad de Sueño</h3>
            <div className="h-64">
              <Pie
                data={{
                  labels: ["Insuficiente (<5h)", "Regular (5-7h)", "Bueno (7-8h)", "Excelente (>8h)"],
                  datasets: [
                    {
                      data: [sleepDistribution.poor, sleepDistribution.fair, sleepDistribution.good, sleepDistribution.excellent],
                      backgroundColor: ["#ef4444", "#f97316", "#3b82f6", "#22c55e"],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Distribución por Sexo */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Usuarios por Género</h3>
            <div className="h-48">
              <Doughnut
                data={{
                  labels: ["Masculino", "Femenino", "Otro"],
                  datasets: [
                    {
                      data: [sexDistribution.male, sexDistribution.female, sexDistribution.other],
                      backgroundColor: ["#3b82f6", "#ec4899", "#8b5cf6"],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
                }}
              />
            </div>
          </div>

          {/* Métricas Promedio Cards */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Métricas Promedio de Salud</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{globalStats?.avgSleep.toFixed(1) || "0"}</p>
                <p className="text-xs text-slate-500">Horas Sueño</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">{globalStats?.avgStress.toFixed(0) || "0"}%</p>
                <p className="text-xs text-slate-500">Nivel Estrés</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{globalStats?.avgSteps.toLocaleString("es-ES", { maximumFractionDigits: 0 }) || "0"}</p>
                <p className="text-xs text-slate-500">Pasos Diarios</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{globalStats?.avgHeartRate.toFixed(0) || "0"}</p>
                <p className="text-xs text-slate-500">BPM Promedio</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{globalStats?.avgSpO2.toFixed(0) || "0"}%</p>
                <p className="text-xs text-slate-500">SpO2 Promedio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalles */}
      {selectedUser && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-white">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">
              Detalles del Usuario
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Info Personal */}
              <div className="col-span-2 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Información Personal</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nombre:</span>
                    <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fecha de nacimiento:</span>
                    <p className="font-medium text-gray-900">{selectedUser.dob}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sexo:</span>
                    <p className="font-medium text-gray-900">{getSexLabel(selectedUser.sex)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Altura:</span>
                    <p className="font-medium text-gray-900">{selectedUser.height} cm</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Peso:</span>
                    <p className="font-medium text-gray-900">{selectedUser.weight} kg</p>
                  </div>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="col-span-2 bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-700 mb-2">Contacto de Emergencia</h4>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span className="text-xl font-semibold text-red-700">
                    {selectedUser.emergencyContact}
                  </span>
                </div>
              </div>

              {/* Último Registro de Salud */}
              {selectedUser.lastHealthRecord && (
                <div className="col-span-2 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 mb-3">
                    Último Registro de Salud ({selectedUser.lastHealthRecord.fecha})
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-semibold text-blue-600">
                        {selectedUser.lastHealthRecord.horasDeSueno.toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500">Sueño</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-red-500">
                        {selectedUser.lastHealthRecord.frecuenciaCardiaca}
                      </p>
                      <p className="text-xs text-gray-500">BPM</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-semibold ${selectedUser.lastHealthRecord.nivelDeEstres > 50 ? 'text-red-500' : 'text-amber-500'}`}>
                        {selectedUser.lastHealthRecord.nivelDeEstres}%
                      </p>
                      <p className="text-xs text-gray-500">Estrés</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-green-600">
                        {selectedUser.lastHealthRecord.pasosDiarios.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Pasos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-purple-600">
                        {selectedUser.lastHealthRecord.saturacionOxigeno}%
                      </p>
                      <p className="text-xs text-gray-500">SpO2</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta y Registro */}
              <div>
                <span className="text-gray-500 text-sm">Meta:</span>
                <p className="font-medium text-gray-900">{selectedUser.goal}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Fecha registro:</span>
                <p className="font-medium text-gray-900">
                  {selectedUser.creationDate?.toLocaleDateString("es-ES") || "No disponible"}
                </p>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setSelectedUser(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setSelectedUser(null)}></div>
        </div>
      )}
    </div>
  );
}
