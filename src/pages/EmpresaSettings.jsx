// src/pages/EmpresaSettings.jsx (FINAL)

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme'; // Asumimos que useTheme está en hooks/useTheme

// Importar el CSS de configuración
import '../styles/SettingsPage.css'; 
// Importar la lógica de layout si la usas (ej. m-inventory-layout)
// import '../styles/inventario.css'; 


// 💡 Componente Wrapper para la tarjeta de configuración
const SettingsModuleCard = ({ title, children, successMessage }) => (
    <div className="c-settings-card">
        <h3 className="c-settings-card__title">{title}</h3>
        {children}
        {successMessage && <p className="c-form-message c-form-message--success u-mt-md">{successMessage}</p>}
    </div>
);


const EmpresaSettings = () => {
    const { perfil, reloadProfile, isBootstrapping } = useAuth();
    const { theme, setAppTheme } = useTheme(); // 💡 Hook para gestionar el tema
    
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const empresaId = perfil?.empresa_id;

    useEffect(() => {
        if (perfil && perfil.empresa && perfil.empresa.nombre) {
            setNombre(perfil.empresa.nombre);
        }
    }, [perfil]);

    // 🛑 CRITICAL CHECKS 🛑
    if (isBootstrapping) {
        return <div className="loading-state c-card">Cargando configuración de la empresa...</div>;
    }
    if (!perfil || !perfil.empresa) {
        return <div className="c-state-message c-card">Error: No se pudo cargar el perfil de la empresa.</div>;
    }
    
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');

        const { error } = await supabase
            .from('empresas')
            .update({ nombre: nombre })
            .eq('id', empresaId);

        if (error) {
            alert(`Error al guardar: ${error.message}`);
        } else {
            setSuccess('Nombre de empresa actualizado con éxito!');
            await reloadProfile(perfil.id);
        }
        setLoading(false);
    };

    return (
        // Usamos m-inventory-layout para el offset del sidebar y centrado estético.
        <div className="m-inventory-layout c-settings-page"> 
            <h1 className="c-page-header__title u-mb-xl">Ajustes del Sistema y Empresa</h1>

            <div className="c-settings-grid">
                
                {/* --- 1. CONFIGURACIÓN DE EMPRESA --- */}
                <SettingsModuleCard title="Datos Generales de la Empresa" successMessage={success}>
                    <p className="c-form-message c-form-message--help u-mb-md">
                        Nombre actual del negocio: <b>{perfil.empresa.nombre}</b>
                    </p>
                    <form onSubmit={handleSave}>
                        <div className="c-form-group">
                            <label className="c-form-label" htmlFor="nombre-empresa">Nombre de la Empresa:</label>
                            <input
                                id="nombre-empresa"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                className="c-form-input"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-full u-mt-md">
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </SettingsModuleCard>


                {/* --- 2. CONFIGURACIÓN DE APARIENCIA (Modo Claro/Oscuro) --- */}
                <SettingsModuleCard title="Apariencia y Tema">
                    <p className="c-form-message c-form-message--help u-mb-md">
                        Personaliza el tema de la aplicación para reducir la fatiga visual.
                    </p>
                    <div className="c-theme-selector-group">
                        <label className="c-form-label u-mb-sm">Seleccionar Tema:</label>
                        <div className="c-theme-options">
                            
                            <button
                                onClick={() => setAppTheme('light')}
                                className={`btn btn-secondary c-theme-btn ${theme === 'light' ? 'is-active' : ''}`}
                            >
                                ☀️ Claro
                            </button>
                            
                            <button
                                onClick={() => setAppTheme('dark')}
                                className={`btn btn-secondary c-theme-btn ${theme === 'dark' ? 'is-active' : ''}`}
                            >
                                🌙 Oscuro
                            </button>
                        </div>
                    </div>
                </SettingsModuleCard>
                
                {/* --- 3. Módulo Futuro --- */}
                <SettingsModuleCard title="Próximos Ajustes (Placeholder)">
                    <p className="c-form-message c-form-message--help">
                        Aquí se añadirán configuraciones avanzadas. Por ejemplo, ajuste de tasas de IVA, roles de usuario, o integración de hardware POS.
                    </p>
                </SettingsModuleCard>
            </div>
        </div>
    );
};

export default EmpresaSettings;