import React from "react";
import { Bar } from "react-chartjs-2";

export default function GraficoBarra({ data }) {
  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            x: { stacked: false },
            y: { stacked: false, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}
