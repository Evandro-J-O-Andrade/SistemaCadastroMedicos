import React from "react";
import { Line } from "react-chartjs-2";

export default function GraficoLinha({ data }) {
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { autoSkip: false } },
    },
  };

  // Configura dataset para linha
  const dataLinha = {
    ...data,
    datasets: data.datasets.map(ds => ({
      ...ds,
      tension: 0.3,
      fill: false,
      borderWidth: 2,
    })),
  };

  return <Line data={dataLinha} options={options} />;
}
