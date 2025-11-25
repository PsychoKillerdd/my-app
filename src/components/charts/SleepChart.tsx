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

interface SleepData {
  fecha: string;
  horasDeSueno: number;
}

interface SleepChartProps {
  data: SleepData[];
}

export default function SleepChart({ data }: SleepChartProps) {
  const labels = data.map((d) => {
    const date = new Date(d.fecha);
    return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Horas de Sueño",
        data: data.map((d) => d.horasDeSueno),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointStyle: "circle",
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: "#6366f1",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 3,
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
            return `Sueño: ${context.parsed.y ?? 0}h`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 12,
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#9ca3af",
          callback: function (value: string | number) {
            return value + "h";
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

  const validSleepData = data.filter((d) => d.horasDeSueno > 0);
  const avgSleep = validSleepData.length > 0
    ? validSleepData.reduce((sum, d) => sum + d.horasDeSueno, 0) / validSleepData.length
    : 0;

  return (
    <div className="card bg-white shadow-sm border border-gray-100">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Horas de Sueño</h3>
          <span className="text-sm font-medium text-gray-900">
            Promedio: {avgSleep.toFixed(1)}h
          </span>
        </div>
        <div className="h-48">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
