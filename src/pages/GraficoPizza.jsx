import React from "react";
import { Pie } from "react-chartjs-2";

export default function GraficoPizza({ data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: { position: "right" },
      tooltip: { enabled: true },
    },
  };

  return <Pie data={data} options={options} />;
}
