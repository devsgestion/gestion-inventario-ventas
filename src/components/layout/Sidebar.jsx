// src/components/layout/Sidebar.jsx (VERSIÓN CON SISTEMA DE ROLES)

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import './Sidebar.css';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { perfil } = useAuth();
    const permissions = usePermissions();

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* Botón hamburguesa (solo visible en móvil) */}
            <button 
                className="c-sidebar__hamburger" 
                onClick={toggleSidebar}
                aria-label="Toggle menu"
            >
                <span className="c-sidebar__hamburger-line"></span>
                <span className="c-sidebar__hamburger-line"></span>
                <span className="c-sidebar__hamburger-line"></span>
            </button>

            {/* Overlay para cerrar el sidebar en móvil */}
            {isOpen && (
                <div 
                    className="c-sidebar__overlay" 
                    onClick={closeSidebar}
                ></div>
            )}

            <aside className={`c-sidebar ${isOpen ? 'c-sidebar--open' : ''}`}>
                <div className="c-sidebar__header">
                    <h1 className="c-sidebar__brand">
                        <span className="c-sidebar__brand-icon"></span> GestionDevs
                    </h1>
                    {/* Botón cerrar (solo visible en móvil cuando está abierto) */}
                    <button 
                        className="c-sidebar__close" 
                        onClick={closeSidebar}
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>
            
            <nav className="c-sidebar__nav">
                <ul className="c-nav-list">
                    
                    {/* ENLACES PRINCIPALES - Todos los usuarios */}
                    {permissions.canViewInventory && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/inventario" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">📦</span><span className="c-nav-link__text">Inventario</span>
                            </NavLink>
                        </li>
                    )}
                    
                    {permissions.canViewSales && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/ventas" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">🛒</span><span className="c-nav-link__text">Punto de Venta</span>
                            </NavLink>
                        </li>
                    )}
                    
                    {/* HISTORIAL DE CAJA - Solo admin y superadmin */}
                    {permissions.canViewCashHistory && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/historial" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">📜</span><span className="c-nav-link__text">Historial de Caja</span>
                            </NavLink>
                        </li>
                    )}
                    
                    {/* CONFIGURACIÓN - Solo admin y superadmin */}
                    {permissions.canAccessSettings && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/settings" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">⚙️</span><span className="c-nav-link__text">Configuración</span>
                            </NavLink>
                        </li>
                    )}
                    
                    {/* PERFIL DE USUARIO - Todos */}
                    {permissions.canViewOwnProfile && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/profile" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">👤</span><span className="c-nav-link__text">Mi Perfil</span>
                            </NavLink>
                        </li>
                    )}
                    
                    {/* PANEL DE ADMINISTRACIÓN - Solo superadmin */}
                    {permissions.canManageUsers && (
                        <li className="c-nav-item">
                            <NavLink 
                                to="/admin" 
                                className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span className="c-nav-link__icon">👥</span><span className="c-nav-link__text">Panel de Admin</span>
                            </NavLink>
                        </li>
                    )}
                    
                </ul>
            </nav>
            
            {/* Footer del Sidebar */}
            <div className="c-sidebar__footer">
                <div className="c-sidebar__user-info">
                    <span className="c-sidebar__user-name">{perfil?.nombre || 'Usuario'}</span>
                    <span className="c-sidebar__user-role">
                        {permissions.isSuperAdmin && '👑 Super Admin'}
                        {permissions.isAdmin && '🔧 Admin'}
                        {permissions.isUsuario && '👤 Usuario'}
                    </span>
                </div>
                <div className="c-sidebar__version">
                    <span className="c-sidebar__version-text">v1.0.0</span>
                </div>
            </div>
        </aside>
        </>
    );
};

export default Sidebar;