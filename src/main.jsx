import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./App.css";

// Inicializa usuários padrão se ainda não existir
if (!localStorage.getItem("usuarios")) {
  localStorage.setItem(
    "usuarios",
    JSON.stringify([
      { usuario: "admin", senha: "1234", role: "admin" } // apenas admin inicial
    ])
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
