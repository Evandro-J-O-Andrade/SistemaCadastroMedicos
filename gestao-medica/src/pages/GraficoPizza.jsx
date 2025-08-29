import React from "react";
import { Pie } from "react-chartjs-2";

export default function GraficoPizza({ data }) {
  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Pie
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right" },
            tooltip: { mode: "index", intersect: false },
          },
        }}
      />
    </div>
  );
}
