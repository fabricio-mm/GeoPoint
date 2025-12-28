import React, { useState, useRef, useEffect } from 'react';
import { MapPin, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const roleLabels = {
  admin: 'Administrador',
  rh: 'RH Manager',
  employee: 'Empregado',
};

export default function Header() {
  const { user, viewMode, logout, switchViewMode, canSwitchToEmployee } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchMode = (mode: 'admin' | 'rh' | 'employee') => {
    switchViewMode(mode);
    setDropdownOpen(false);
  };

  if (!user) return null;

  const displayRole = roleLabels[viewMode] || 'Empregado';

  return (
    <header className="header-container">
      <div className="header-left">
        <div className="header-logo">
          <MapPin className="header-logo-icon" strokeWidth={1.5} />
          <span className="header-logo-text">GeoPoint</span>
        </div>
        <span className="header-separator">|</span>
        <span className="header-user-name">{user.name}</span>
      </div>

      <div className="header-right">
        {canSwitchToEmployee && (
          <div className="header-dropdown" ref={dropdownRef}>
            <button 
              className={`header-dropdown-trigger ${dropdownOpen ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <User size={16} />
              <span>{displayRole}</span>
              <ChevronDown size={14} className={`header-chevron ${dropdownOpen ? 'rotated' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="header-dropdown-menu">
                {user.role === 'admin' && (
                  <button 
                    className={`header-dropdown-item ${viewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => handleSwitchMode('admin')}
                  >
                    <span className="dropdown-item-dot"></span>
                    Administrador
                  </button>
                )}
                {user.role === 'rh_analyst' && (
                  <button 
                    className={`header-dropdown-item ${viewMode === 'rh' ? 'active' : ''}`}
                    onClick={() => handleSwitchMode('rh')}
                  >
                    <span className="dropdown-item-dot"></span>
                    RH Manager
                  </button>
                )}
                <button 
                  className={`header-dropdown-item ${viewMode === 'employee' ? 'active' : ''}`}
                  onClick={() => handleSwitchMode('employee')}
                >
                  <span className="dropdown-item-dot"></span>
                  Meu Ponto
                </button>
              </div>
            )}
          </div>
        )}
        
        <button className="header-logout" onClick={handleLogout}>
          <LogOut className="header-logout-icon" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
