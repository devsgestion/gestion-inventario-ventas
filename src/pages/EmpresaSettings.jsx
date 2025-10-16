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
        return <div style={{padding: '20px'}}>Cargando configuración de la empresa...</div>;
    }

    // 🛑 CRITICAL CHECK 🛑: If the data exists, but the JOIN failed.
    if (!perfil || !perfil.empresa || !perfil.empresa.nombre) {
        // This is the fallback that currently shows:
        return <div style={{padding: '20px'}}>Error: No se pudo cargar el perfil de la empresa.</div>;
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
        <div style={{ padding: '20px' }}>
            {/* La línea problemática ahora es segura */}
            <h2>Configuración de la Empresa</h2>
            <p>Aquí puedes personalizar los datos de tu negocio: {perfil.empresa.nombre}</p>

            <form onSubmit={handleSave} style={{ maxWidth: '400px', marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nombre Actual de la Empresa:</label>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
            </form>
        </div>
    );
};

export default EmpresaSettings;