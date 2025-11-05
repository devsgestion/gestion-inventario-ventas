import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import useAuth from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import './TopBar.css';

export default function TopBar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const permissions = usePermissions();

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detectar scroll para agregar sombra
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goToProfile = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const goToSettings = () => {
    setShowDropdown(false);
    navigate('/settings');
  };

  // Obtener iniciales del nombre
  const getInitials = () => {
    if (!perfil?.nombre) return 'U';
    const names = perfil.nombre.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  const getRoleDisplay = () => {
    if (permissions.isSuperAdmin) return '👑 Super Admin';
    if (permissions.isAdmin) return '🔧 Administrador';
    if (permissions.isVendedor) return '🛍️ Vendedor';
    if (permissions.isGestor) return '📦 Gestor';
    return '👤 Usuario';
  };

  return (
    <div className={`tb-topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="tb-topbar__title">
        {/* Puedes poner el título de la página actual aquí si quieres */}
      </div>

      <div className="tb-topbar__actions">
        {/* Menú de usuario */}
        <div className="tb-topbar__user-menu" ref={dropdownRef}>
          <button
            className="tb-topbar__user-button"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Menú de usuario"
          >
            <div className="tb-topbar__avatar">
              {getInitials()}
            </div>
            <span className="tb-topbar__user-name">{perfil?.nombre || 'Usuario'}</span>
            <svg 
              className={`tb-topbar__chevron ${showDropdown ? 'tb-topbar__chevron--open' : ''}`}
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="tb-topbar__dropdown">
              <div className="tb-topbar__dropdown-header">
                <div className="tb-topbar__dropdown-avatar">
                  {getInitials()}
                </div>
                <div className="tb-topbar__dropdown-info">
                  <span className="tb-topbar__dropdown-name">{perfil?.nombre || 'Usuario'}</span>
                  <span className="tb-topbar__dropdown-email">{perfil?.email || ''}</span>
                  <span className="tb-topbar__dropdown-role">{getRoleDisplay()}</span>
                </div>
              </div>

              <div className="tb-topbar__dropdown-divider"></div>

              <div className="tb-topbar__dropdown-menu">
                {permissions.canViewOwnProfile && (
                  <button className="tb-topbar__dropdown-item" onClick={goToProfile}>
                    <span className="tb-topbar__dropdown-item-icon">👤</span>
                    <span className="tb-topbar__dropdown-item-text">Mi Perfil</span>
                  </button>
                )}

                {permissions.canAccessSettings && (
                  <button className="tb-topbar__dropdown-item" onClick={goToSettings}>
                    <span className="tb-topbar__dropdown-item-icon">⚙️</span>
                    <span className="tb-topbar__dropdown-item-text">Configuración</span>
                  </button>
                )}
              </div>

              <div className="tb-topbar__dropdown-divider"></div>

              <div className="tb-topbar__dropdown-menu">
                <button className="tb-topbar__dropdown-item tb-topbar__dropdown-item--logout" onClick={handleLogout}>
                  <span className="tb-topbar__dropdown-item-icon">🚪</span>
                  <span className="tb-topbar__dropdown-item-text">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
