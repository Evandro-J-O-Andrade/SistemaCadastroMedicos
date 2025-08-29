import React from "react";
import { Line } from "react-chartjs-2";

export default function GraficoLinha({ data }) {
  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Line
        data={data}
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
