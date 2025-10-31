// src/pages/LoginPage.jsx (Con traducción de errores)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../api/supabaseClient';
import { translateSupabaseError, successMessages } from '../utils/errorMessages';
import '../styles/AuthForms.css'; 

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
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
            setError(translateSupabaseError(loginError));
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetMessage('');
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setResetMessage(successMessages.passwordResetEmailSent);
            setResetEmail('');
            
            // Cerrar el modal después de 3 segundos
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetMessage('');
            }, 3000);

        } catch (error) {
            setError(translateSupabaseError(error));
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

                    <div style={{ 
                        textAlign: 'center', 
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--color-border)'
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="login-forgot-pwd-link"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                </form>
            </div>

            {/* Modal para recuperar contraseña */}
            {showForgotPassword && (
                <div className="login-forgot-modal-overlay">
                    <div className="login-forgot-modal-content">
                        <h3 className="login-forgot-modal-title">
                            Recuperar Contraseña
                        </h3>
                        <p className="login-forgot-modal-subtitle">
                            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                        </p>

                        <form onSubmit={handleForgotPassword}>
                            <div className="c-form-group">
                                <input
                                    type="email"
                                    placeholder="tu-email@ejemplo.com"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                    className="c-form-input"
                                />
                            </div>

                            {resetMessage && (
                                <div className="login-forgot-success-box">
                                    {resetMessage}
                                </div>
                            )}

                            {error && (
                                <div className="login-forgot-error-box">
                                    {error}
                                </div>
                            )}

                            <div className="login-forgot-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetEmail('');
                                        setResetMessage('');
                                        setError(null);
                                    }}
                                    className="login-forgot-btn login-forgot-btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="login-forgot-btn login-forgot-btn-primary"
                                >
                                    Enviar Enlace
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
 
export default LoginPage;