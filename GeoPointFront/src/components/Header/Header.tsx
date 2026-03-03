import React, { useState, useRef, useEffect } from 'react';
import { MapPin, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { jobTitleLabels, getViewForJobTitle } from '@/services/api';
import './Header.css';

const viewLabels: Record<string, string> = {
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

  const displayRole = viewLabels[viewMode] || 'Empregado';
  const baseView = getViewForJobTitle(user.jobTitle);

  return (
    <header className="header-container">
      <div className="header-left">
        <div className="header-logo">
          <MapPin className="header-logo-icon" strokeWidth={1.5} />
          <span className="header-logo-text">GeoPoint</span>
        </div>
        <span className="header-separator">|</span>
        <span className="header-user-name">{user.name}</span>
        <span className="header-job-title">({jobTitleLabels[user.jobTitle] || ''})</span>
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
                {baseView === 'admin' && (
                  <button
                    className={`header-dropdown-item ${viewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => handleSwitchMode('admin')}
                  >
                    <span className="dropdown-item-dot"></span>
                    Administrador
                  </button>
                )}
                {baseView === 'rh' && (
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
