import React from "react";
import { Bar } from "react-chartjs-2";

export default function GraficoBarra({ data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { autoSkip: false } },
    },
  };

  return <Bar data={data} options={options} />;
}
