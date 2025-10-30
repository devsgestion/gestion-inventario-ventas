// src/pages/AdminUsersPage.jsx
// Panel de administración de usuarios (solo superadmin)

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPage.css';

const AdminUsersPage = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newUserCredentials, setNewUserCredentials] = useState({ email: '', password: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nombre_completo: '',
        empresa_nombre: '',
        rol: 'usuario'
    });

    // Verificar que el usuario es superadmin
    useEffect(() => {
        if (perfil && perfil.rol !== 'superadmin') {
            alert('⛔ Acceso denegado: Esta sección es solo para administradores');
            navigate('/inventario');
        }
    }, [perfil, navigate]);

    // Cargar usuarios
    useEffect(() => {
        if (perfil?.rol === 'superadmin') {
            loadUsers();
        }
    }, [perfil]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_all_users', {
                p_admin_id: perfil.id
            });

            if (error) throw error;

            // Obtener conteo de productos por empresa usando RPC (bypass RLS)
            const { data: productCounts, error: countError } = await supabase.rpc('get_products_count_by_empresa');
            
            if (countError) {
                console.error('Error al obtener conteo de productos:', countError);
            }

            // Crear un mapa de empresa_id -> total_productos
            const productCountMap = {};
            if (productCounts) {
                productCounts.forEach(item => {
                    productCountMap[item.empresa_id] = item.total_productos;
                });
            }

            // Agregar el conteo a cada usuario
            const usuariosConProductos = (data || []).map(user => ({
                ...user,
                total_productos: productCountMap[user.empresa_id] || 0
            }));

            setUsuarios(usuariosConProductos);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            setErrorMessage('Error al cargar la lista de usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setErrorMessage('');

        try {
            // Validaciones básicas
            if (!formData.email || !formData.nombre_completo || !formData.empresa_nombre) {
                throw new Error('Email, nombre y empresa son obligatorios');
            }

            // Generar contraseña temporal
            const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

            // 1. Crear empresa primero
            const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .insert([{ 
                    nombre: formData.empresa_nombre,
                    owner_id: null
                }])
                .select()
                .single();

            if (empresaError) throw empresaError;

            console.log('✅ Empresa creada:', empresaData.id);

            // Guardar la sesión actual del admin ANTES de crear el nuevo usuario
            const { data: { session: adminSession } } = await supabase.auth.getSession();

            // 2. Crear usuario usando la función de registro normal
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: tempPassword,
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error('No se pudo crear el usuario');

            console.log('✅ Usuario auth creado:', user.id);

            // Restaurar la sesión del admin inmediatamente
            if (adminSession) {
                await supabase.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token
                });
            }

            // 3. Crear perfil usando RPC (bypass RLS)
            const { error: perfilError } = await supabase.rpc('create_user_profile_admin', {
                p_user_id: user.id,
                p_nombre_completo: formData.nombre_completo,
                p_empresa_id: empresaData.id,
                p_rol: formData.rol,
                p_created_by: perfil.id
            });

            if (perfilError) {
                console.error('❌ Error creando perfil:', perfilError);
                throw perfilError;
            }

            console.log('✅ Perfil creado');

            // 4. Actualizar owner_id de la empresa
            const { error: updateError } = await supabase
                .from('empresas')
                .update({ owner_id: user.id })
                .eq('id', empresaData.id);

            if (updateError) {
                console.warn('⚠️ Error actualizando empresa:', updateError);
            }

            // 5. NO hacemos signOut porque cierra la sesión del admin
            // La sesión del nuevo usuario se cierra automáticamente al no confirmar email

            // Guardar credenciales para mostrar en modal
            setNewUserCredentials({
                email: formData.email,
                password: tempPassword
            });

            // Cerrar modal de creación
            setShowCreateModal(false);
            setFormData({
                email: '',
                password: '',
                nombre_completo: '',
                empresa_nombre: '',
                rol: 'usuario'
            });

            // Mostrar modal con contraseña
            setShowPasswordModal(true);
            
            // Recargar lista
            loadUsers();

        } catch (error) {
            console.error('❌ Error al crear usuario:', error);
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        if (!confirm(`¿Estás seguro de ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) {
            return;
        }

        try {
            const { error } = await supabase.rpc('toggle_user_status', {
                p_admin_id: perfil.id,
                p_user_id: userId,
                p_activo: !currentStatus
            });

            if (error) throw error;

            setSuccessMessage(`Usuario ${currentStatus ? 'desactivado' : 'activado'} correctamente`);
            loadUsers();
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    if (loading) {
        return <div className="admin-loading-state">Cargando panel de administración...</div>;
    }

    return (
        <div className="m-inventory-layout admin-panel-container">
            <header className="admin-panel-header">
                <div>
                    <h1 className="admin-panel-title">Panel de Administración</h1>
                    <p className="admin-panel-subtitle">Gestión de usuarios y accesos del sistema</p>
                </div>
                <div className="admin-panel-header-actions">
                    <button onClick={() => setShowCreateModal(true)} className="admin-btn admin-btn-primary admin-btn-success">
                        + Crear Nuevo Usuario
                    </button>
                    <button onClick={logout} className="admin-btn admin-btn-secondary">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {successMessage && (
                <div className="admin-alert admin-alert-success" style={{
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    padding: '20px',
                    lineHeight: '1.6'
                }}>
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className="admin-alert admin-alert-error">
                    {errorMessage}
                </div>
            )}

            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{usuarios.length}</div>
                    <div className="admin-stat-label">Total Usuarios</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{usuarios.filter(u => u.activo).length}</div>
                    <div className="admin-stat-label">Activos</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{usuarios.filter(u => !u.activo).length}</div>
                    <div className="admin-stat-label">Inactivos</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">
                        {usuarios.reduce((sum, u) => sum + (u.total_productos || 0), 0).toLocaleString('es-CO')}
                    </div>
                    <div className="admin-stat-label">Total Productos</div>
                </div>
            </div>

            <div className="admin-users-card">
                <h3 className="admin-users-card-title">Lista de Usuarios</h3>
                
                <div className="admin-table-wrapper">
                    <table className="admin-users-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Nombre</th>
                                <th>Empresa</th>
                                <th>Rol</th>
                                <th>Productos</th>
                                <th>Estado</th>
                                <th>Último Login</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(user => {
                                const productCount = user.total_productos || 0;
                                let usageLevel = 'low';
                                if (productCount > 100) usageLevel = 'high';
                                else if (productCount > 50) usageLevel = 'medium';

                                return (
                                    <tr key={user.id} className={!user.activo ? 'admin-row-inactive' : ''}>
                                        <td>{user.email}</td>
                                        <td>{user.nombre_completo}</td>
                                        <td>{user.empresa_nombre || '-'}</td>
                                        <td>
                                            <span className={`admin-role-badge admin-role-badge-${user.rol}`}>
                                                {user.rol}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ 
                                                    fontWeight: '600',
                                                    fontSize: '0.95rem',
                                                    color: 'var(--color-text-high)'
                                                }}>
                                                    {productCount.toLocaleString('es-CO')}
                                                </span>
                                                {productCount > 0 && (
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: usageLevel === 'high' ? 'var(--color-error)' : 
                                                                   usageLevel === 'medium' ? 'var(--color-warning)' : 
                                                                   'var(--color-success)'
                                                    }} />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`admin-status-badge ${user.activo ? 'admin-status-active' : 'admin-status-inactive'}`}>
                                                {user.activo ? '✓ Activo' : '⏸ Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            {user.last_login 
                                                ? new Date(user.last_login).toLocaleString('es-CO')
                                                : 'Nunca'
                                            }
                                        </td>
                                        <td>
                                            {user.id !== perfil.id && (
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, user.activo)}
                                                    className={`admin-btn admin-btn-sm ${user.activo ? 'admin-btn-warning' : 'admin-btn-success'}`}
                                                >
                                                    {user.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para crear usuario */}
            {showCreateModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content" style={{ maxWidth: 500 }}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">Crear Nuevo Usuario</h3>
                            <button onClick={() => setShowCreateModal(false)} className="admin-modal-close-btn">
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser}>
                            <div className="admin-modal-body">
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="admin-form-input"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre_completo}
                                        onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                                        className="admin-form-input"
                                        placeholder="Juan Pérez"
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.empresa_nombre}
                                        onChange={(e) => setFormData({...formData, empresa_nombre: e.target.value})}
                                        className="admin-form-input"
                                        placeholder="Mi Negocio S.A.S"
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Rol</label>
                                    <select
                                        value={formData.rol}
                                        onChange={(e) => setFormData({...formData, rol: e.target.value})}
                                        className="admin-form-input"
                                    >
                                        <option value="usuario">Usuario</option>
                                        <option value="admin">Administrador</option>
                                        <option value="superadmin">Superadministrador</option>
                                    </select>
                                </div>
                                
                                <div className="admin-form-note" style={{ 
                                    padding: '10px', 
                                    background: 'var(--color-surface-300)', 
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-medium)'
                                }}>
                                    ℹ️ Se generará una contraseña temporal automáticamente. El usuario recibirá las credenciales por pantalla.
                                </div>
                            </div>

                            <div className="admin-modal-footer">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="admin-btn admin-btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading} className="admin-btn admin-btn-primary admin-btn-success">
                                    {actionLoading ? 'Creando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para mostrar contraseña generada */}
            {showPasswordModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content" style={{ maxWidth: 500 }}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">Usuario Creado Exitosamente</h3>
                        </div>
                        
                        <div className="admin-modal-body" style={{ padding: '30px' }}>
                            <div style={{ 
                                background: 'var(--color-surface-300)', 
                                padding: '24px', 
                                borderRadius: 'var(--border-radius-md)',
                                marginBottom: '20px',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '0.875rem', 
                                        color: 'var(--color-text-medium)',
                                        marginBottom: '8px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Email
                                    </label>
                                    <div style={{
                                        background: 'var(--color-surface-200)',
                                        padding: '12px 16px',
                                        borderRadius: 'var(--border-radius-sm)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.95rem',
                                        color: 'var(--color-text-high)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        {newUserCredentials.email}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '0.875rem', 
                                        color: 'var(--color-text-medium)',
                                        marginBottom: '8px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Contraseña Temporal
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                                        <div style={{
                                            flex: 1,
                                            background: 'var(--color-surface-200)',
                                            padding: '12px 16px',
                                            borderRadius: 'var(--border-radius-sm)',
                                            fontFamily: 'monospace',
                                            fontSize: '1.05rem',
                                            fontWeight: '600',
                                            color: 'var(--color-text-high)',
                                            border: '1px solid var(--color-border)',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            {newUserCredentials.password}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(newUserCredentials.password);
                                                const btn = event.target;
                                                const originalText = btn.textContent;
                                                btn.textContent = 'Copiado';
                                                btn.style.background = 'var(--color-success)';
                                                btn.style.borderColor = 'var(--color-success)';
                                                setTimeout(() => {
                                                    btn.textContent = originalText;
                                                    btn.style.background = '';
                                                    btn.style.borderColor = '';
                                                }, 2000);
                                            }}
                                            className="admin-btn admin-btn-secondary"
                                            style={{
                                                minWidth: '90px',
                                                padding: '12px 16px',
                                                fontSize: '0.875rem',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--color-surface-300)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--border-radius-sm)',
                                padding: '16px',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'flex-start'
                            }}>
                                <span style={{ 
                                    fontSize: '1.25rem',
                                    color: 'var(--color-text-medium)',
                                    flexShrink: 0
                                }}>ℹ️</span>
                                <div style={{ 
                                    fontSize: '0.875rem', 
                                    color: 'var(--color-text-medium)', 
                                    lineHeight: '1.5' 
                                }}>
                                    <strong style={{ color: 'var(--color-text-high)' }}>Importante:</strong> Esta contraseña solo se muestra una vez. 
                                    Asegúrate de copiarla y enviarla al usuario de forma segura.
                                </div>
                            </div>
                        </div>

                        <div className="admin-modal-footer">
                            <button 
                                onClick={() => setShowPasswordModal(false)} 
                                className="admin-btn admin-btn-primary"
                                style={{ width: '100%' }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;