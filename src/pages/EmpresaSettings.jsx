// src/pages/EmpresaSettings.jsx (FINAL)

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme'; // Asumimos que useTheme está en hooks/useTheme
import * as XLSX from 'xlsx';

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
    const { theme, setAppTheme } = useTheme();
    
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    
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

    // 🛑 NUEVA FUNCIÓN: Exportar inventario a Excel 🛑
    const handleExportToExcel = async () => {
        setExportLoading(true);
        setSuccess('');

        try {
            // Obtener todos los productos de la empresa
            const { data: productos, error } = await supabase
                .from('productos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('nombre', { ascending: true });

            if (error) throw error;

            if (!productos || productos.length === 0) {
                alert('No hay productos para exportar');
                setExportLoading(false);
                return;
            }

            // Preparar los datos para Excel
            const datosExcel = productos.map(p => ({
                'Referencia': p.codigo_referencia || '',
                'Nombre del Producto': p.nombre,
                'Stock Actual': p.stock_actual,
                'Precio de Venta': p.precio_venta,
                'Precio de Costo (CPP)': p.precio_costo || 0,
                'Alerta Stock Mínimo': p.alerta_stock_min,
                'Estado': p.activo !== false ? 'Activo' : 'Inactivo',
                'Fecha de Creación': new Date(p.created_at).toLocaleDateString('es-CO')
            }));

            // Crear el libro de trabajo
            const worksheet = XLSX.utils.json_to_sheet(datosExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

            // Ajustar el ancho de las columnas
            const columnWidths = [
                { wch: 15 }, // Referencia
                { wch: 35 }, // Nombre
                { wch: 12 }, // Stock
                { wch: 15 }, // Precio Venta
                { wch: 18 }, // Precio Costo
                { wch: 18 }, // Alerta Mínimo
                { wch: 12 }, // Estado
                { wch: 18 }  // Fecha
            ];
            worksheet['!cols'] = columnWidths;

            // Generar el nombre del archivo con fecha
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Inventario_${perfil.empresa.nombre}_${fecha}.xlsx`;

            // Descargar el archivo
            XLSX.writeFile(workbook, nombreArchivo);

            setSuccess(`✅ Inventario exportado exitosamente: ${productos.length} productos`);
            setTimeout(() => setSuccess(''), 5000);

        } catch (error) {
            console.error('Error al exportar:', error);
            alert(`Error al exportar el inventario: ${error.message}`);
        } finally {
            setExportLoading(false);
        }
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

                {/* --- 3. EXPORTAR DATOS --- */}
                <SettingsModuleCard title="Exportar Datos" successMessage={success}>
                    <p className="c-form-message c-form-message--help u-mb-md">
                        Descarga tu inventario completo en formato Excel (.xlsx) para respaldo o análisis externo.
                    </p>
                    <div className="c-export-info u-mb-md">
                        <div className="c-export-info__item">
                            <span className="c-export-info__icon">📊</span>
                            <div className="c-export-info__text">
                                <strong>Incluye:</strong> Referencia, nombre, stock, precios, estado y fechas
                            </div>
                        </div>
                        <div className="c-export-info__item">
                            <span className="c-export-info__icon">💾</span>
                            <div className="c-export-info__text">
                                <strong>Formato:</strong> Excel compatible con Microsoft Office y Google Sheets
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportToExcel}
                        disabled={exportLoading}
                        className="btn btn-primary btn-success btn-full"
                    >
                        {exportLoading ? (
                            <>
                                <span className="c-spinner"></span>
                                Exportando...
                            </>
                        ) : (
                            <>
                                📥 Exportar Inventario a Excel
                            </>
                        )}
                    </button>
                </SettingsModuleCard>

            </div>
        </div>
    );
};

export default EmpresaSettings;