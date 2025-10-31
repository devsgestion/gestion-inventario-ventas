// src/pages/RegisterPage.jsx (Con traducción de errores)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { translateSupabaseError, successMessages } from '../utils/errorMessages';
import '../styles/AuthForms.css'; 

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

        const { data: { user }, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            setError(translateSupabaseError(authError));
            setLoading(false);
            return;
        }

        if (user) {
            const { error: dbError } = await supabase.rpc('create_tenant_and_profile', {
                user_id_input: user.id,
                email_input: user.email,
                nombre_usuario_input: nombreUsuario,
                nombre_empresa_input: nombreEmpresa
            });

            if (dbError) {
                // Si falla la BD, debemos borrar el usuario de Auth para limpiar
                await supabase.auth.admin.deleteUser(user.id); 
                setError(`Error al crear la empresa: ${translateSupabaseError(dbError)}`);
            } else {
                alert('¡Registro exitoso! Revisa tu correo para confirmar y luego inicia sesión.');
                navigate('/login', { replace: true });
            }
        }
        setLoading(false);
    };

    return (
        <div className="c-auth-container"> {/* 💡 Contenedor centrado */}
            <div className="c-auth-card"> {/* 💡 Tarjeta de formulario */}
                
                <h2 className="c-auth-header">Registro de Nueva Empresa</h2>
                
                <form onSubmit={handleRegister} className="c-auth-form"> {/* 💡 Formulario temático */}
                    
                    <div className="c-form-group">
                        <input type="text" placeholder="Nombre de tu Negocio" value={nombreEmpresa}
                            onChange={(e) => setNombreEmpresa(e.target.value)} required className="c-form-input" />
                    </div>
                    
                    <div className="c-form-group">
                        <input type="text" placeholder="Tu Nombre (Admin)" value={nombreUsuario}
                            onChange={(e) => setNombreUsuario(e.target.value)} required className="c-form-input" />
                    </div>
                    
                    <div className="c-form-group">
                        <input type="email" placeholder="Correo (Será tu usuario)" value={email}
                            onChange={(e) => setEmail(e.target.value)} required className="c-form-input" />
                    </div>
                    
                    <div className="c-form-group">
                        <input type="password" placeholder="Contraseña" value={password}
                            onChange={(e) => setPassword(e.target.value)} required className="c-form-input" />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn c-auth-button btn-full" 
                        disabled={loading}
                    >
                        {loading ? 'Registrando...' : 'Crear Cuenta'}
                    </button>
                    
                    {error && <p className="c-auth-error">{error}</p>}
                    
                    <p className="c-auth-prompt">
                        ¿Ya tienes cuenta? <a href="/login">Inicia Sesión</a>
                    </p>

                </form>
            </div>
        </div>
    );
};

export default RegisterPage;