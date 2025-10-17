// src/pages/RegisterPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombreEmpresa, setNombreEmpresa] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // 1. Crear el usuario en Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (user) {
            // 2. Ejecutar la función de base de datos para crear la Empresa y el Perfil
            // Pasamos los datos que NO son de autenticación (nombre, empresa, etc.)
            const { error: dbError } = await supabase.rpc('create_tenant_and_profile', {
                user_id_input: user.id,
                email_input: user.email,
                nombre_usuario_input: nombreUsuario,
                nombre_empresa_input: nombreEmpresa
            });

            if (dbError) {
                // Si falla la BD, debemos borrar el usuario de Auth para limpiar
                await supabase.auth.admin.deleteUser(user.id); 
                setError(`Error de BD al crear empresa: ${dbError.message}`);
            } else {
                alert('¡Registro exitoso! Revisa tu correo para confirmar.');
                navigate('/login', { replace: true });
            }
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
            <h2 className="card-title" style={{ textAlign: 'center' }}>Registro de Nueva Empresa</h2>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                    <input type="text" placeholder="Nombre de tu Negocio" value={nombreEmpresa}
                        onChange={(e) => setNombreEmpresa(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                    <input type="text" placeholder="Tu Nombre (Admin)" value={nombreUsuario}
                        onChange={(e) => setNombreUsuario(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                    <input type="email" placeholder="Correo (Será tu usuario)" value={email}
                        onChange={(e) => setEmail(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                    <input type="password" placeholder="Contraseña" value={password}
                        onChange={(e) => setPassword(e.target.value)} required className="form-input" />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? 'Registrando...' : 'Crear Cuenta'}
                </button>
                {error && <p className="form-error">{error}</p>}
                <p className="form-help" style={{ textAlign: 'center', marginTop: 12 }}>
                    ¿Ya tienes cuenta? <a href="/login">Inicia Sesión</a>
                </p>
            </form>
        </div>
    );
};

export default RegisterPage;