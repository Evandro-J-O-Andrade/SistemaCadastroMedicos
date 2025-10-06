import React from "react";
import { Bar } from "react-chartjs-2";

export default function GraficoBarra({ data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: { 
        display: true,
        labels: { color: "#003366", font: { size: 14, weight: "500" } },
      },
      tooltip: { 
        enabled: true,
        backgroundColor: "#ffffff",
        titleColor: "#003366",
        bodyColor: "#003366",
        borderColor: "#003366",
        borderWidth: 1
      },
    },
    layout: { padding: { top: 20, bottom: 20 } },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: { color: "#003366", stepSize: 1 },
        grid: { color: "#e0e0e0" },
      },
      x: {
        ticks: { color: "#003366", autoSkip: false },
        grid: { color: "#e0e0e0" },
      },
    },
  };

  // força as barras a ficarem finas
  const newData = {
    ...data,
    datasets: data.datasets.map(ds => ({
      ...ds,
      barThickness: 40,     // 🔽 largura fixa em px (ajuste aqui)
      maxBarThickness: 40,  // 🔽 garante que não expanda
    }))
  };

  return <Bar data={newData} options={options} />;
}
