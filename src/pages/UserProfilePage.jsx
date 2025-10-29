// src/pages/UserProfilePage.jsx
// Página de perfil de usuario - Cambiar contraseña y datos personales

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import '../styles/UserProfilePage.css';

const UserProfilePage = () => {
    const { perfil, reloadProfile } = useAuth();
    
    // Estado para el email del usuario
    const [userEmail, setUserEmail] = useState('');
    
    // Estado para cambio de contraseña
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    // Estado para información personal
    const [nombreCompleto, setNombreCompleto] = useState(perfil?.nombre_completo || '');
    
    // Estado de UI
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Cargar email del usuario autenticado
    useEffect(() => {
        const loadUserEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email);
            }
        };
        loadUserEmail();
    }, []);

    // Manejador de cambio de contraseña
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Validaciones
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                throw new Error('Las contraseñas nuevas no coinciden');
            }

            if (passwordData.newPassword.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            // Verificar contraseña actual intentando iniciar sesión
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: passwordData.currentPassword
            });

            if (signInError) {
                throw new Error('La contraseña actual es incorrecta');
            }

            // Actualizar contraseña
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (updateError) throw updateError;

            setSuccessMessage('Contraseña actualizada exitosamente');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            // Auto-limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Manejador de actualización de información personal
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const { error } = await supabase
                .from('perfiles')
                .update({ 
                    nombre_completo: nombreCompleto,
                    nombre: nombreCompleto // Actualizar ambos campos
                })
                .eq('id', perfil.id);

            if (error) throw error;

            setSuccessMessage('Información actualizada exitosamente');
            await reloadProfile(perfil.id);

            // Auto-limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!perfil) {
        return (
            <div className="user-profile-loading">
                <div className="user-profile-spinner"></div>
                <p>Cargando perfil...</p>
            </div>
        );
    }

    return (
        <div className="user-profile-page">
            <div className="user-profile-container">
                <div className="user-profile-header">
                    <h1 className="user-profile-title">Mi Perfil</h1>
                    <p className="user-profile-subtitle">
                        Administra tu información personal y contraseña
                    </p>
                </div>

                {/* Mensajes de éxito/error */}
                {successMessage && (
                    <div className="user-profile-alert user-profile-alert-success">
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="user-profile-alert user-profile-alert-error">
                        {errorMessage}
                    </div>
                )}

                {/* Sección: Información Personal */}
                <section className="user-profile-section">
                    <h2 className="user-profile-section-title">Información Personal</h2>
                    <form onSubmit={handleUpdateProfile} className="user-profile-form">
                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Email</label>
                            <input
                                type="email"
                                value={userEmail || 'Cargando...'}
                                disabled
                                className="user-profile-input user-profile-input-disabled"
                            />
                            <small className="user-profile-help-text">
                                El email no se puede modificar
                            </small>
                        </div>

                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Nombre Completo</label>
                            <input
                                type="text"
                                value={nombreCompleto}
                                onChange={(e) => setNombreCompleto(e.target.value)}
                                required
                                className="user-profile-input"
                                placeholder="Tu nombre completo"
                            />
                        </div>

                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Empresa</label>
                            <input
                                type="text"
                                value={perfil.empresa?.nombre || 'No asignada'}
                                disabled
                                className="user-profile-input user-profile-input-disabled"
                            />
                        </div>

                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Rol</label>
                            <input
                                type="text"
                                value={perfil.rol || 'usuario'}
                                disabled
                                className="user-profile-input user-profile-input-disabled"
                                style={{ textTransform: 'capitalize' }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="user-profile-btn user-profile-btn-primary"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </section>

                {/* Sección: Cambiar Contraseña */}
                <section className="user-profile-section">
                    <h2 className="user-profile-section-title">Cambiar Contraseña</h2>
                    <form onSubmit={handleChangePassword} className="user-profile-form">
                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Contraseña Actual</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({
                                    ...passwordData, 
                                    currentPassword: e.target.value
                                })}
                                required
                                className="user-profile-input"
                                placeholder="Ingresa tu contraseña actual"
                            />
                        </div>

                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({
                                    ...passwordData, 
                                    newPassword: e.target.value
                                })}
                                required
                                minLength={6}
                                className="user-profile-input"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        <div className="user-profile-form-group">
                            <label className="user-profile-label">Confirmar Nueva Contraseña</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({
                                    ...passwordData, 
                                    confirmPassword: e.target.value
                                })}
                                required
                                minLength={6}
                                className="user-profile-input"
                                placeholder="Repite la nueva contraseña"
                            />
                        </div>

                        <div className="user-profile-info-box">
                            ℹ️ La contraseña debe tener al menos 6 caracteres. 
                            Se recomienda usar letras, números y símbolos.
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="user-profile-btn user-profile-btn-primary"
                        >
                            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default UserProfilePage;
