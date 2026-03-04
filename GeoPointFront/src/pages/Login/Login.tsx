import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-badge">
            <MapPin size={28} strokeWidth={1.5} />
          </div>
          <h1 className="login-title">Geopoint</h1>
          <p className="login-subtitle">Sistema de Controle de Ponto por Geolocalização</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label className="login-label" htmlFor="email">Email</label>
            <div className="login-input-wrapper">
              <Mail size={18} className="login-input-icon" />
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Senha</label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="login-spinner" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="login-forgot">
          <a href="#" className="login-forgot-link">Esqueceu sua senha?</a>
        </div>
      </div>
    </div>
  );
}
