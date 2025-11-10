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
                        {/* Dashboard - Accesible para todos los roles */}
                        {permissions.canViewDashboard && (
                            <li className="c-nav-item">
                                <NavLink 
                                    to="/dashboard" 
                                    className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <span className="c-nav-link__icon">📊</span><span className="c-nav-link__text">Dashboard</span>
                                </NavLink>
                            </li>
                        )}

                        {/* Inventario - gestor, admin_gestor, admin, superadmin, vendedor (solo consulta) */}
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

                        {/* Punto de Venta - vendedor, admin_vendedor, admin, superadmin */}
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

                        {/* Cambios y Devoluciones - vendedor, admin_vendedor, admin, superadmin */}
                        {permissions.canViewCambios && (
                            <li className="c-nav-item">
                                <NavLink 
                                    to="/cambios-devoluciones" 
                                    className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <span className="c-nav-link__icon">🔄</span><span className="c-nav-link__text">Cambios y Devoluciones</span>
                                </NavLink>
                            </li>
                        )}

                        {/* Gestor de Pedidos - gestor, admin_gestor, admin, superadmin */}
                        {permissions.canViewPedidos && (
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

                        {/* Historial de Caja - admin_vendedor, admin_gestor, admin, superadmin */}
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

                        {/* Gastos Varios - admin_vendedor, admin_gestor, admin, superadmin */}
                        {permissions.canViewExpenses && (
                            <li className="c-nav-item">
                                <NavLink 
                                    to="/gastos" 
                                    className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <span className="c-nav-link__icon">💸</span><span className="c-nav-link__text">Gastos Varios</span>
                                </NavLink>
                            </li>
                        )}

                        {/* Panel de Admin - SOLO superadmin */}
                        {permissions.canAccessAdminPanel && (
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