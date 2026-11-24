// EXEMPLO — adaptar as rotas do seu App.tsx/App.jsx; não substituir o arquivo inteiro.
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../src/auth/RequireAuth'
import { LoginExample } from '../src/pages/LoginExample'
// Ajustar o import conforme o seu projeto existente:
import Medicos from '../src/pages/Medicos'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginExample />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/medicos" replace />} />
        <Route path="/medicos" element={<Medicos />} />
        {/* Agrupe aqui as demais rotas privadas do sistema. */}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
