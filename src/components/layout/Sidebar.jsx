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
                        {(permissions.isSuperAdmin || permissions.isAdmin || permissions.isGestor) && (
                            <li className="c-nav-item">
                                <NavLink 
                                    to="/pedidos" 
                                    className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <span className="c-nav-link__icon">📋</span><span className="c-nav-link__text">Gestor de Pedidos</span>
                                </NavLink>
                            </li>
                        )}
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
            </aside>
        </>
    );
}

export default Sidebar;