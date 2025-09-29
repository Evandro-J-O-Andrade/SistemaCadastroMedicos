import React from "react";
import { Pie } from "react-chartjs-2";

export default function GraficoPizza({ data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#003366", font: { size: 14, weight: "500" } },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#ffffff",
        titleColor: "#003366",
        bodyColor: "#003366",
        borderColor: "#003366",
        borderWidth: 1,
      },
    },
  };

  return <Pie data={data} options={options} />;
}
