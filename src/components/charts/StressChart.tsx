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

interface StressData {
  fecha: string;
  nivelDeEstres: number;
}

interface StressChartProps {
  data: StressData[];
}

export default function StressChart({ data }: StressChartProps) {
  const labels = data.map((d) => {
    const date = new Date(d.fecha);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Nivel de Estrés",
        data: data.map((d) => d.nivelDeEstres),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1f2937",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (context: { parsed: { y: number | null } }) {
            return `Estrés: ${context.parsed.y ?? 0}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#9ca3af",
          callback: function (value: string | number) {
            return value + "%";
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#9ca3af",
        },
      },
    },
  };

  const lastRecord = data[data.length - 1];
  const stressLevel = lastRecord?.nivelDeEstres || 0;

  const getStressLabel = (level: number) => {
    if (level <= 25) return "Bajo";
    if (level <= 50) return "Moderado";
    if (level <= 75) return "Alto";
    return "Muy Alto";
  };

  return (
    <div className="card bg-white shadow-sm border border-gray-100">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Nivel de Estrés</h3>
          {lastRecord && (
            <span className="text-sm font-medium text-gray-900">
              {stressLevel}% · {getStressLabel(stressLevel)}
            </span>
          )}
        </div>
        <div className="h-48">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
