"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HeartRateData {
  fecha: string;
  frecuenciaCardiaca: number;
  frecuenciaCardiacaMax: number;
  frecuenciaCardiacaMin: number;
}

interface HeartRateChartProps {
  data: HeartRateData[];
}

export default function HeartRateChart({ data }: HeartRateChartProps) {
  const labels = data.map((d) => {
    const date = new Date(d.fecha);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Promedio",
        data: data.map((d) => d.frecuenciaCardiaca),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: "Máximo",
        data: data.map((d) => d.frecuenciaCardiacaMax),
        borderColor: "#f97316",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: "Mínimo",
        data: data.map((d) => d.frecuenciaCardiacaMin),
        borderColor: "#22c55e",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 40,
        max: 120,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          callback: function (value: string | number) {
            return value + " BPM";
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Obtener el último registro para mostrar el valor actual
  const lastRecord = data[data.length - 1];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-lg">❤️ Frecuencia Cardíaca</h3>
          {lastRecord && (
            <div className="badge badge-error badge-lg gap-1">
              <span className="animate-pulse">●</span>
              {lastRecord.frecuenciaCardiaca} BPM
            </div>
          )}
        </div>
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
