import React from "react";
import { Line } from "react-chartjs-2";

export default function GraficoArea({ data }) {
  const areaData = {
    ...data,
    datasets: data.datasets.map((ds) => ({
      ...ds,
      fill: true,
      tension: 0.4,
    })),
  };

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Line
        data={areaData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            x: { display: true },
            y: { beginAtZero: true },
          },
        }}
      />
    </div>
  );
}
