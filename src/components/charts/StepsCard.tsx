"use client";

interface StepsCardProps {
  steps: number;
}

export default function StepsCard({ steps }: StepsCardProps) {
  const formattedSteps = steps.toLocaleString("es-ES");

  return (
    <div className="card bg-white shadow-sm border border-gray-100">
      <div className="card-body items-center text-center">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pasos</h3>
        <div className="text-4xl font-semibold text-gray-900 mt-2">
          {formattedSteps}
        </div>
        <span className="text-xs text-gray-400 mt-1">hoy</span>
      </div>
    </div>
  );
}
