// src/pages/EmpresaSettings.jsx (FINAL)

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme'; // Asumimos que useTheme está en hooks/useTheme

// Importar el CSS de configuración
import '../styles/SettingsPage.css'; 
// Importar la lógica de layout si la usas (ej. m-inventory-layout)
// import '../styles/inventario.css'; 

// Importar el nuevo componente de modal para la impresora
import PrinterSettingsModal from '../components/PrinterSettingsModal';

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
    const { theme, setAppTheme } = useTheme();
    
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    
    // 💡 NUEVO ESTADO PARA EL MODAL DE LA IMPRESORA
    const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
    
    // 🛑 CONFIGURACIONES SIMPLIFICADAS - Solo documentos 🛑
    const [configuraciones, setConfiguraciones] = useState({
        formato_facturas: 'simple'
    });

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

    // 🛑 FUNCIÓN SIMPLIFICADA: Solo para documentos 🛑
    const handleSaveConfiguraciones = async (campo, valor) => {
        setLoading(true);
        
        const { error } = await supabase
            .from('configuraciones_empresa')
            .upsert({
                empresa_id: empresaId,
                [campo]: valor
            }, { onConflict: 'empresa_id' });

        if (error) {
            alert(`Error al guardar configuración: ${error.message}`);
        } else {
            setConfiguraciones(prev => ({ ...prev, [campo]: valor }));
            setSuccess(`Configuración de ${campo} actualizada!`);
            setTimeout(() => setSuccess(''), 3000);
        }
        setLoading(false);
    };

    return (
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

                {/* --- 3. FORMATOS Y DOCUMENTOS --- */}
                <SettingsModuleCard title="📄 Documentos y Facturas">
                    <div className="c-form-group">
                        <label className="c-form-label">Formato de Facturas:</label>
                        <select 
                            value={configuraciones.formato_facturas}
                            onChange={(e) => handleSaveConfiguraciones('formato_facturas', e.target.value)}
                            className="c-form-input"
                        >
                            <option value="simple">Simple (Ticket básico)</option>
                            <option value="detallado">Detallado (Con IVA)</option>
                            <option value="empresarial">Empresarial (Logo + Info fiscal)</option>
                        </select>
                    </div>
                    {/* 💡 CAMBIO: El botón abre el modal */}
                    <button 
                        onClick={() => setIsPrinterModalOpen(true)} // 🛑 ABRIR MODAL
                        className="btn btn-secondary btn-full u-mt-md"
                    >
                        🖨️ Configurar Impresora
                    </button>
                </SettingsModuleCard>
            </div>

            {/* 💡 NUEVO: MODAL DE CONFIGURACIÓN DE IMPRESORA */}
            {isPrinterModalOpen && (
                <PrinterSettingsModal 
                    isOpen={isPrinterModalOpen}
                    onClose={() => setIsPrinterModalOpen(false)}
                    empresaId={empresaId}
                    currentSettings={configuraciones}
                    onSettingsUpdated={handleSaveConfiguraciones}
                />
            )}
        </div>
    );
};

export default EmpresaSettings;