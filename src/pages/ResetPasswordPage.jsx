// src/pages/ResetPasswordPage.jsx
// Página para restablecer contraseña desde enlace de email

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useTheme } from '../hooks/useTheme';
import '../styles/ResetPasswordPage.css';

const ResetPasswordPage = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const { theme } = useTheme();
    const navigate = useNavigate();

    // Verificar si hay sesión activa al cargar
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Verificar tanto hash como query params
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const queryParams = new URLSearchParams(window.location.search);
                
                // Supabase puede enviar un "code" que necesitamos intercambiar por una sesión
                const code = queryParams.get('code');
                
                let accessToken = hashParams.get('access_token') || queryParams.get('access_token');
                let refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
                let type = hashParams.get('type') || queryParams.get('type');

                console.log('🔍 URL completa:', window.location.href);
                console.log('🔍 Hash:', window.location.hash);
                console.log('🔍 Search params:', window.location.search);
                console.log('🔍 Code presente:', !!code);
                console.log('🔍 Verificando tipo de evento:', type);
                console.log('🔍 Access token presente:', !!accessToken);

                // Si hay un code, intercambiarlo por una sesión
                if (code) {
                    console.log('🔄 Intercambiando code por sesión...');
                    
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    
                    if (error) {
                        console.error('❌ Error intercambiando code:', error);
                        throw error;
                    }

                    if (data.session) {
                        console.log('✅ Sesión obtenida exitosamente del code');
                        setHasSession(true);
                        return;
                    }
                }

                // Si hay tokens en la URL y es un recovery, establecer la sesión
                if (accessToken && refreshToken && type === 'recovery') {
                    console.log('🔄 Estableciendo sesión de recuperación...');
                    
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (error) {
                        console.error('❌ Error estableciendo sesión:', error);
                        throw error;
                    }

                    console.log('✅ Sesión de recuperación establecida');
                    setHasSession(true);
                } else {
                    // Si no hay tokens en la URL, verificar sesión existente
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session) {
                        console.log('✅ Sesión existente detectada');
                        setHasSession(true);
                    } else {
                        console.log('❌ No se detectó sesión válida');
                        console.log('Detalles de debugging:');
                        console.log('- code:', code);
                        console.log('- accessToken:', accessToken);
                        console.log('- refreshToken:', refreshToken);
                        console.log('- type:', type);
                        setError('Enlace inválido o expirado. Por favor solicita un nuevo enlace de recuperación.');
                    }
                }
            } catch (err) {
                console.error('❌ Error verificando sesión:', err);
                setError('Error al verificar la sesión. Por favor solicita un nuevo enlace.');
            } finally {
                setCheckingSession(false);
            }
        };
        
        checkSession();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // Validar que las contraseñas coincidan
            if (newPassword !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            if (newPassword.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            // Actualizar contraseña
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setMessage('✅ Contraseña actualizada exitosamente. Redirigiendo...');
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('Error al restablecer contraseña:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`reset-pwd-container ${theme === 'light' ? 'theme-light' : ''}`}>
            <div className="reset-pwd-card">
                <div className="reset-pwd-header">
                    <div className="reset-pwd-icon">🔐</div>
                    <h2 className="reset-pwd-title">Restablecer Contraseña</h2>
                    <p className="reset-pwd-subtitle">
                        Ingresa tu nueva contraseña
                    </p>
                </div>
                
                {checkingSession ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="reset-pwd-spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p style={{ color: 'var(--color-text-medium)' }}>Verificando enlace...</p>
                    </div>
                ) : !hasSession ? (
                    <div className="reset-pwd-error-box">
                        <p>{error}</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="reset-pwd-btn reset-pwd-btn-secondary"
                        >
                            Volver al Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="reset-pwd-form">
                        <div className="reset-pwd-form-group">
                            <label className="reset-pwd-label">Nueva Contraseña</label>
                            <input
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="reset-pwd-input"
                            />
                        </div>
                        
                        <div className="reset-pwd-form-group">
                            <label className="reset-pwd-label">Confirmar Contraseña</label>
                            <input
                                type="password"
                                placeholder="Repite la contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="reset-pwd-input"
                            />
                        </div>

                        <div className="reset-pwd-info-box">
                            ℹ️ La contraseña debe tener al menos 6 caracteres
                        </div>
                        
                        <button 
                            type="submit" 
                            className={`reset-pwd-btn reset-pwd-btn-primary ${loading ? 'is-loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                        
                        {message && (
                            <div className="reset-pwd-success-box">
                                {message}
                            </div>
                        )}
                        
                        {error && (
                            <div className="reset-pwd-error-box">
                                {error}
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
