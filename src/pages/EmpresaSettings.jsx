// src/pages/EmpresaSettings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';

const EmpresaSettings = () => {
    const { perfil, reloadProfile, isBootstrapping } = useAuth();
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const empresaId = perfil?.empresa_id;

    // ✅ HOOKS PRIMERO - ANTES DE CUALQUIER RETURN CONDICIONAL
    useEffect(() => {
        if (perfil && perfil.empresa && perfil.empresa.nombre) {
            setNombre(perfil.empresa.nombre);
        }
    }, [perfil]);

    // 🛑 1. MANEJAR CARGA Y DATOS NULOS AQUÍ 🛑
    if (isBootstrapping) {
        return <div className="loading-state card">Cargando configuración de la empresa...</div>;
    }

    // 🛑 CRITICAL CHECK 🛑: If the data exists, but the JOIN failed.
    if (!perfil || !perfil.empresa || !perfil.empresa.nombre) {
        // This is the fallback that currently shows:
        return <div className="error-state card">Error: No se pudo cargar el perfil de la empresa.</div>;
    }
    
    // ... if we get here, the data is safe to use: perfil.empresa.nombre

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
            if (perfil?.id) {
                await reloadProfile(perfil.id);
            }
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
            <h2 className="card-title">Configuración de la Empresa</h2>
            <p className="form-help">Aquí puedes personalizar los datos de tu negocio: <b>{perfil.empresa.nombre}</b></p>
            <form onSubmit={handleSave} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                    <label className="form-label">Nombre Actual de la Empresa:</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        className="form-input"
                    />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-full">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                {success && <p className="form-success">{success}</p>}
            </form>
        </div>
    );
};

export default EmpresaSettings;