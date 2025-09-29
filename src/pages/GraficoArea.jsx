import React from "react";
import { Line } from "react-chartjs-2";

export default function GraficoArea({ data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: { 
        display: false,
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

  // Configura dataset para área (fill)
  const dataArea = {
    ...data,
    datasets: data.datasets.map(ds => ({
      ...ds,
      tension: 0.3,
      fill: true,
      borderWidth: 2,
    })),
  };

  return <Line data={dataArea} options={options} />;
}
