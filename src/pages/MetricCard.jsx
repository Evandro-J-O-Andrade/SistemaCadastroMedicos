// src/components/MetricCard.jsx
import React from "react";

const MetricCard = ({ title, value, color = "#1e293b" }) => {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        textAlign: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
      }}
    >
      <h3 style={{ marginBottom: "8px", fontSize: "1rem" }}>{title}</h3>
      <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{value}</p>
    </div>
  );
};

export default MetricCard;
