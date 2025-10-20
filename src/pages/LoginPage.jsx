// src/pages/LoginPage.jsx (FINAL - Refactorizado)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme'; // Importa el hook de tema
// 💡 Importar el nuevo CSS
import '../styles/AuthForms.css'; 

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login, session, isLoading, isBootstrapping } = useAuth();
    const { theme } = useTheme(); // Obtiene el tema actual
    const navigate = useNavigate();

    // Redirigir si la sesión se establece
    useEffect(() => {
        if (!isBootstrapping && session) { 
            navigate('/inventario', { replace: true });
        }
    }, [session, isBootstrapping, navigate]);

    if (isBootstrapping) {
        return (
            <div className="c-auth-container">
                <p className="c-form-message c-form-message--help">Verificando sesión...</p>
            </div>
        );
    }
    
    if (session) {
        return null; 
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const { error: loginError } = await login(email, password);

        if (loginError) {
            setError(loginError.message);
        }
    };

    return (
        <div className={`c-auth-container ${theme === 'light' ? 'theme-light' : ''}`}>
            <div className="c-auth-card">
                <h2 className="c-auth-header">Iniciar Sesión en GestionDevs</h2>
                
                <form onSubmit={handleSubmit} className="c-auth-form">
                    
                    <div className="c-form-group">
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            // Usamos la clase de input genérica de tu sistema de diseño
                            className="c-form-input" 
                        />
                    </div>
                    
                    <div className="c-form-group">
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="c-form-input"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`btn c-auth-button btn-full ${isLoading ? 'is-loading' : ''}`} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Ingresando...' : 'Entrar'}
                    </button>
                    
                    {error && <p className="c-auth-error">{error}</p>}

                </form>
            </div>
        </div>
    );
};
 
export default LoginPage;