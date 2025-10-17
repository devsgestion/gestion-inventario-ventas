// src/components/layout/Sidebar.jsx (VERSIÓN FINAL)

import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {

    return (
        <aside className="c-sidebar"> {/* Clase principal */}
            <div className="c-sidebar__header">
                <h1 className="c-sidebar__brand">
                    <span className="c-sidebar__brand-icon">📊</span> GestiON
                </h1>
            </div>
            
            <nav className="c-sidebar__nav">
                <ul className="c-nav-list">
                    
                    {/* ENLACES PRINCIPALES */}
                    <li className="c-nav-item">
                        <NavLink 
                            to="/inventario" 
                            className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                        >
                            <span className="c-nav-link__icon">📦</span><span className="c-nav-link__text">Inventario</span>
                        </NavLink>
                    </li>
                    <li className="c-nav-item">
                        <NavLink 
                            to="/ventas" 
                            className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                        >
                            <span className="c-nav-link__icon">🛒</span><span className="c-nav-link__text">Punto de Venta</span>
                        </NavLink>
                    </li>
                    
                    {/* ENLACE: Historial de Caja */}
                    <li className="c-nav-item">
                        <NavLink 
                            to="/historial" 
                            className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                        >
                            <span className="c-nav-link__icon">📜</span><span className="c-nav-link__text">Historial de Caja</span>
                        </NavLink>
                    </li>
                    
                    {/* ENLACE DE CONFIGURACIÓN */}
                    <li className="c-nav-item">
                        <NavLink 
                            to="/settings" 
                            className={({ isActive }) => `c-nav-link ${isActive ? 'c-nav-link-active' : ''}`}
                        >
                            <span className="c-nav-link__icon">⚙️</span><span className="c-nav-link__text">Configuración</span>
                        </NavLink>
                    </li>
                    
                </ul>
            </nav>
            
            {/* Footer del Sidebar */}
            <div className="c-sidebar__footer">
                <div className="c-sidebar__version">
                    <span className="c-sidebar__version-text">v1.0.0</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;