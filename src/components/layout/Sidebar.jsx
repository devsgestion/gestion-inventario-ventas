// src/components/layout/Sidebar.jsx (SIN LÓGICA DE ROLES)

import React from 'react';
import { NavLink } from 'react-router-dom';
// import useAuth from '../../hooks/useAuth'; // Ya no es necesario
import './Sidebar.css';

const Sidebar = () => {
    // const { perfil } = useAuth(); // Ya no es necesario

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="sidebar-brand">
                    <span className="brand-icon">📊</span> GestiON
                </h1>
            </div>
            
            <nav className="sidebar-nav">
                <ul className="nav-list">
                    
                    {/* ENLACES NORMALES (Clientes) */}
                    <li className="nav-item">
                        <NavLink to="/inventario" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                            <span className="nav-icon">📦</span><span className="nav-text">Inventario</span>
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/ventas" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                            <span className="nav-icon">🛒</span><span className="nav-text">Punto de Venta</span>
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                            <span className="nav-icon">⚙️</span><span className="nav-text">Configuración</span>
                        </NavLink>
                    </li>
                    
                </ul>
            </nav>
            
            {/* Footer del Sidebar (opcional) */}
            <div className="sidebar-footer">
                <div className="sidebar-version">
                    <span className="version-text">v1.0.0</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;