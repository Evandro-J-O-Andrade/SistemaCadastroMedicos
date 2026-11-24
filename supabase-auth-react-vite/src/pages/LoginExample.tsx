import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

type LocationState = { from?: unknown } | null

export function LoginExample() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const from = (location.state as LocationState)?.from
  // Impede redirects externos por estado de navegação alterado.
  const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : '/medicos'

  useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true })
  }, [user, loading, navigate, destination])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // O AuthProvider atualiza a sessão e o efeito acima redireciona.
    } catch {
      setErrorMessage('Não foi possível entrar. Verifique as credenciais e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p role="status">Verificando sessão...</p>
  if (user) return <Navigate to={destination} replace />

  return (
    <main>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="auth-email">E-mail</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="auth-password">Senha</label>
        <input
          id="auth-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
