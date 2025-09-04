import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Medicos from "./pages/Medicos";
import Plantao from "./pages/Plantao";
import Relatorios from "./pages/Relatorios";
import Filtros from "./pages/Filtros";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/medicos" element={<Medicos />} />
            <Route path="/plantao" element={<Plantao />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/filtros" element={<Filtros />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;
