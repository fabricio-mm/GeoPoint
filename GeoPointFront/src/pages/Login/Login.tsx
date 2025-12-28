import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
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

  const demoAccounts = [
    { role: 'Admin', email: 'admin@geopoint.com', password: 'admin123' },
    { role: 'RH Analyst', email: 'rh@geopoint.com', password: 'rh123' },
    { role: 'Employee', email: 'user@geopoint.com', password: 'user123' },
  ];

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <MapPin className="login-logo-icon" strokeWidth={1.5} />
          <h1 className="login-title">Geopoint</h1>
          <p className="login-subtitle">Sistema de Controle de Ponto por Geolocalização</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="login-field">
            <label htmlFor="email" className="login-label">Email</label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="seuemail@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">Senha</label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>

        <div className="login-forgot">
          <span className="login-forgot-link">Esqueceu sua senha?</span>
        </div>

        <div className="login-demo">
          <p className="login-demo-title">Contas para demonstração</p>
          <div className="login-demo-list">
            {demoAccounts.map((account) => (
              <div 
                key={account.email} 
                className="login-demo-item"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="login-demo-role">{account.role}</span>
                <span className="login-demo-credentials">{account.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
