// src/pages/AdminUsersPage.jsx
// Panel de administración de usuarios (solo superadmin)

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth';
import usePermissions from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPage.css';

const AdminUsersPage = () => {
    const { perfil, logout } = useAuth();
    const permissions = usePermissions();
    const navigate = useNavigate();
    
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false); // 🛑 Nuevo estado para modal de eliminación
    const [userToDelete, setUserToDelete] = useState(null); // 🛑 Usuario a eliminar
    const [deleteMode, setDeleteMode] = useState('user'); // 'user' | 'company'
    const [userToEdit, setUserToEdit] = useState(null);
    const [newUserCredentials, setNewUserCredentials] = useState({ email: '', password: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // New state for company selection
    const [empresas, setEmpresas] = useState([]);
    const [isNewCompany, setIsNewCompany] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nombre_completo: '',
        empresa_nombre: '',
        empresa_id: '', // New field
        rol: 'vendedor'
    });

    // Verificar que el usuario tiene permisos de superadmin
    useEffect(() => {
        if (perfil && !permissions.canManageUsers) {
            alert('⛔ Acceso denegado: Esta sección es solo para super administradores');
            navigate('/inventario');
        }
    }, [perfil, permissions, navigate]);

    // Cargar usuarios y empresas
    useEffect(() => {
        if (permissions.canManageUsers) {
            loadUsers();
            loadEmpresas();
        }
    }, [permissions]);

    const loadEmpresas = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('id, nombre')
                .order('nombre');
            
            if (error) throw error;
            setEmpresas(data || []);
        } catch (error) {
            console.error('Error al cargar empresas:', error);
        }
    };

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
            if (!formData.email || !formData.nombre_completo) {
                throw new Error('Email y nombre son obligatorios');
            }

            if (isNewCompany && !formData.empresa_nombre) {
                throw new Error('El nombre de la empresa es obligatorio para nuevas empresas');
            }

            if (!isNewCompany && !formData.empresa_id) {
                throw new Error('Debe seleccionar una empresa existente');
            }

            // Generar contraseña temporal
            const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

            let empresaIdToUse;

            if (isNewCompany) {
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
                empresaIdToUse = empresaData.id;
            } else {
                empresaIdToUse = formData.empresa_id;
            }

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
                p_empresa_id: empresaIdToUse,
                p_rol: formData.rol,
                p_created_by: perfil.id
            });

            if (perfilError) {
                console.error('❌ Error creando perfil:', perfilError);
                throw perfilError;
            }

            console.log('✅ Perfil creado');

            // 4. Actualizar owner_id de la empresa (SOLO SI ES NUEVA)
            if (isNewCompany) {
                const { error: updateError } = await supabase
                    .from('empresas')
                    .update({ owner_id: user.id })
                    .eq('id', empresaIdToUse);

                if (updateError) {
                    console.warn('⚠️ Error actualizando empresa:', updateError);
                }
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
                empresa_id: '',
                rol: 'vendedor'
            });
            setIsNewCompany(true); // Resetear toggle

            // Mostrar modal con contraseña
            setShowPasswordModal(true);
            
            // Recargar lista
            loadUsers();
            loadEmpresas(); // Recargar empresas por si se creó una nueva

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

    const handleEditRole = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setErrorMessage('');

        // Validación: no permitir que el usuario edite su propio rol
        if (userToEdit.id === perfil.id) {
            setErrorMessage('No puedes cambiar tu propio rol');
            setActionLoading(false);
            return;
        }

        try {
            // Llamar a RPC para actualizar el rol
            const { error } = await supabase.rpc('update_user_role', {
                p_admin_id: perfil.id,
                p_user_id: userToEdit.id,
                p_new_rol: userToEdit.rol
            });

            if (error) throw error;

            setSuccessMessage(`Rol actualizado correctamente para ${userToEdit.nombre_completo}`);
            setShowEditRoleModal(false);
            setUserToEdit(null);
            loadUsers();
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (error) {
            console.error('Error:', error);
            setErrorMessage(`Error al actualizar rol: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const openEditRoleModal = (user) => {
        setUserToEdit({ ...user });
        setShowEditRoleModal(true);
        setErrorMessage('');
    };

    // 🛑 Funciones de Eliminación 🛑
    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setDeleteMode('user'); // Por defecto solo usuario
        setShowDeleteModal(true);
        setErrorMessage('');
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        setActionLoading(true);
        setErrorMessage('');

        try {
            let rpcName = '';
            let params = {};

            if (deleteMode === 'company') {
                if (!confirm(`⚠️ ¡PELIGRO EXTREMO! ⚠️\n\nEstás a punto de eliminar la empresa "${userToDelete.empresa_nombre}" y TODOS sus datos:\n- Todos los usuarios\n- Inventario\n- Ventas\n- Historial\n\nEsta acción NO SE PUEDE DESHACER.\n\n¿Estás absolutamente seguro?`)) {
                    setActionLoading(false);
                    return;
                }
                rpcName = 'delete_company_full';
                params = {
                    p_admin_id: perfil.id,
                    p_empresa_id: userToDelete.empresa_id
                };
            } else {
                if (!confirm(`¿Estás seguro de eliminar al usuario ${userToDelete.nombre_completo}?`)) {
                    setActionLoading(false);
                    return;
                }
                rpcName = 'delete_single_user';
                params = {
                    p_admin_id: perfil.id,
                    p_user_id: userToDelete.id
                };
            }

            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) throw error;

            setSuccessMessage(data.message || 'Operación realizada con éxito');
            setShowDeleteModal(false);
            setUserToDelete(null);
            loadUsers();
            loadEmpresas();
            setTimeout(() => setSuccessMessage(''), 4000);

        } catch (error) {
            console.error('Error eliminando:', error);
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="ap-loading-state">Cargando panel de administración...</div>;
    }

    return (
        <div className="ap-container">
            <header className="ap-header">
                <div>
                    <h1 className="ap-title">Panel de Administración</h1>
                    <p className="ap-subtitle">Gestión de usuarios y accesos del sistema</p>
                </div>
                <div className="ap-header-actions">
                    <button onClick={() => setShowCreateModal(true)} className="ap-btn ap-btn-primary ap-btn-success">
                        + Crear Nuevo Usuario
                    </button>
                </div>
            </header>

            {successMessage && (
                <div className="ap-alert ap-alert-success" style={{
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
                <div className="ap-alert ap-alert-error">
                    {errorMessage}
                </div>
            )}

            <div className="ap-stats-grid">
                <div className="ap-stat-card">
                    <div className="ap-stat-value">{usuarios.length}</div>
                    <div className="ap-stat-label">Total Usuarios</div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-value">{usuarios.filter(u => u.activo).length}</div>
                    <div className="ap-stat-label">Activos</div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-value">{usuarios.filter(u => !u.activo).length}</div>
                    <div className="ap-stat-label">Inactivos</div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-value">
                        {usuarios.reduce((sum, u) => sum + (u.total_productos || 0), 0).toLocaleString('es-CO')}
                    </div>
                    <div className="ap-stat-label">Total Productos</div>
                </div>
            </div>

            <div className="ap-users-card">
                <h3 className="ap-users-card-title">Lista de Usuarios</h3>
                
                <div className="ap-table-wrapper">
                    <table className="ap-users-table">
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
                                    <tr key={user.id} className={!user.activo ? 'ap-row-inactive' : ''}>
                                        <td>{user.email}</td>
                                        <td>{user.nombre_completo}</td>
                                        <td>{user.empresa_nombre || '-'}</td>
                                        <td>
                                            <span className={`ap-role-badge ap-role-badge-${user.rol}`}>
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
                                            <span className={`ap-status-badge ${user.activo ? 'ap-status-active' : 'ap-status-inactive'}`}>
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
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {user.id !== perfil.id && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditRoleModal(user)}
                                                            className="ap-btn ap-btn-sm ap-btn-primary"
                                                            style={{ minWidth: '90px' }}
                                                        >
                                                            Editar Rol
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(user.id, user.activo)}
                                                            className={`ap-btn ap-btn-sm ${user.activo ? 'ap-btn-warning' : 'ap-btn-success'}`}
                                                            style={{ minWidth: '90px' }}
                                                        >
                                                            {user.activo ? 'Desactivar' : 'Activar'}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(user)}
                                                            className="ap-btn ap-btn-sm ap-btn-danger"
                                                            style={{ minWidth: '90px', backgroundColor: '#e74c3c', color: 'white' }}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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
                <div className="ap-modal-overlay">
                    <div className="ap-modal-content" style={{ maxWidth: 500 }}>
                        <div className="ap-modal-header">
                            <h3 className="ap-modal-title">Crear Nuevo Usuario</h3>
                            <button onClick={() => setShowCreateModal(false)} className="ap-modal-close-btn">
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser}>
                            <div className="ap-modal-body">
                                <div className="ap-form-group">
                                    <label className="ap-form-label">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="ap-form-input"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-form-label">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre_completo}
                                        onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                                        className="ap-form-input"
                                        placeholder="Juan Pérez"
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-form-label">Asignación de Empresa</label>
                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input 
                                                type="radio" 
                                                checked={isNewCompany} 
                                                onChange={() => setIsNewCompany(true)}
                                            />
                                            Nueva Empresa
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input 
                                                type="radio" 
                                                checked={!isNewCompany} 
                                                onChange={() => setIsNewCompany(false)}
                                            />
                                            Empresa Existente
                                        </label>
                                    </div>

                                    {isNewCompany ? (
                                        <input
                                            type="text"
                                            required={isNewCompany}
                                            value={formData.empresa_nombre}
                                            onChange={(e) => setFormData({...formData, empresa_nombre: e.target.value})}
                                            className="ap-form-input"
                                            placeholder="Nombre de la nueva empresa"
                                        />
                                    ) : (
                                        <select
                                            required={!isNewCompany}
                                            value={formData.empresa_id}
                                            onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}
                                            className="ap-form-input"
                                        >
                                            <option value="">-- Seleccionar Empresa --</option>
                                            {empresas.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-form-label">Rol</label>
                                    <select
                                        value={formData.rol}
                                        onChange={(e) => setFormData({...formData, rol: e.target.value})}
                                        className="ap-form-input"
                                    >
                                        <option value="vendedor">Vendedor</option>
                                        <option value="gestor">Gestor</option>
                                        <option value="admin_vendedor">Admin Vendedor</option>
                                        <option value="admin_gestor">Admin Gestor</option>
                                        <option value="admin">Administrador</option>
                                        <option value="superadmin">Superadministrador</option>
                                    </select>
                                    <small style={{ 
                                        display: 'block', 
                                        marginTop: '6px',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-medium)',
                                        lineHeight: '1.4'
                                    }}>
                                        <strong>Vendedor:</strong> Inventario + POS + Cambios/Devoluciones | 
                                        <strong>Gestor:</strong> Inventario + Pedidos | 
                                        <strong>Admin Vendedor:</strong> Vendedor + Dashboard | 
                                        <strong>Admin Gestor:</strong> Gestor + Dashboard | 
                                        <strong>Admin:</strong> Todos los módulos excepto Panel Admin | 
                                        <strong>Superadmin:</strong> Control total
                                    </small>
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

                            <div className="ap-modal-footer">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="ap-btn ap-btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading} className="ap-btn ap-btn-primary ap-btn-success">
                                    {actionLoading ? 'Creando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para mostrar contraseña generada */}
            {showPasswordModal && (
                <div className="ap-modal-overlay">
                    <div className="ap-modal-content" style={{ maxWidth: 500 }}>
                        <div className="ap-modal-header">
                            <h3 className="ap-modal-title">Usuario Creado Exitosamente</h3>
                        </div>
                        
                        <div className="ap-modal-body" style={{ padding: '30px' }}>
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
                                            className="ap-btn ap-btn-secondary"
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

                        <div className="ap-modal-footer">
                            <button 
                                onClick={() => setShowPasswordModal(false)} 
                                className="ap-btn ap-btn-primary"
                                style={{ width: '100%' }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para editar rol */}
            {showEditRoleModal && userToEdit && (
                <div className="ap-modal-overlay">
                    <div className="ap-modal-content" style={{ maxWidth: 500 }}>
                        <div className="ap-modal-header">
                            <h3 className="ap-modal-title">Editar Rol de Usuario</h3>
                            <button 
                                onClick={() => {
                                    setShowEditRoleModal(false);
                                    setUserToEdit(null);
                                    setErrorMessage('');
                                }} 
                                className="ap-modal-close-btn"
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditRole}>
                            <div className="ap-modal-body">
                                {errorMessage && (
                                    <div className="ap-alert ap-alert-error" style={{ marginBottom: '20px' }}>
                                        {errorMessage}
                                    </div>
                                )}

                                <div style={{
                                    background: 'var(--color-surface-300)',
                                    padding: '16px',
                                    borderRadius: 'var(--border-radius-sm)',
                                    marginBottom: '20px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ color: 'var(--color-text-high)' }}>Usuario:</strong>{' '}
                                        <span style={{ color: 'var(--color-text-medium)' }}>{userToEdit.nombre_completo}</span>
                                    </div>
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ color: 'var(--color-text-high)' }}>Email:</strong>{' '}
                                        <span style={{ color: 'var(--color-text-medium)' }}>{userToEdit.email}</span>
                                    </div>
                                    <div>
                                        <strong style={{ color: 'var(--color-text-high)' }}>Rol Actual:</strong>{' '}
                                        <span className={`ap-role-badge ap-role-badge-${userToEdit.rol}`}>
                                            {userToEdit.rol}
                                        </span>
                                    </div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-form-label">Nuevo Rol</label>
                                    <select
                                        value={userToEdit.rol}
                                        onChange={(e) => setUserToEdit({...userToEdit, rol: e.target.value})}
                                        className="ap-form-input"
                                        required
                                    >
                                        <option value="vendedor">Vendedor</option>
                                        <option value="gestor">Gestor</option>
                                        <option value="admin_vendedor">Admin Vendedor</option>
                                        <option value="admin_gestor">Admin Gestor</option>
                                        <option value="admin">Administrador</option>
                                        <option value="superadmin">Superadministrador</option>
                                    </select>
                                    <small style={{ 
                                        display: 'block', 
                                        marginTop: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-medium)',
                                        lineHeight: '1.4'
                                    }}>
                                        <strong>Vendedor:</strong> Inventario + POS + Cambios/Devoluciones<br/>
                                        <strong>Gestor:</strong> Solo Inventario + Pedidos<br/>
                                        <strong>Admin Vendedor:</strong> Todo lo de vendedor + Dashboard avanzado<br/>
                                        <strong>Admin Gestor:</strong> Todo lo de gestor + Dashboard avanzado<br/>
                                        <strong>Admin:</strong> Todos los módulos excepto Panel de Admin (usuarios)<br/>
                                        <strong>Superadmin:</strong> Control total del sistema
                                    </small>
                                </div>
                                
                                <div style={{ 
                                    padding: '12px', 
                                    background: 'rgba(255, 193, 7, 0.1)', 
                                    border: '1px solid rgba(255, 193, 7, 0.3)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-medium)',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start'
                                }}>
                                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                                    <span>
                                        Al cambiar el rol, los permisos del usuario se actualizarán inmediatamente. 
                                        Asegúrate de que el nuevo rol sea apropiado para este usuario.
                                    </span>
                                </div>
                            </div>

                            <div className="ap-modal-footer">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowEditRoleModal(false);
                                        setUserToEdit(null);
                                        setErrorMessage('');
                                    }} 
                                    className="ap-btn ap-btn-secondary"
                                    disabled={actionLoading}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading} 
                                    className="ap-btn ap-btn-primary"
                                >
                                    {actionLoading ? 'Actualizando...' : 'Actualizar Rol'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🛑 Modal de Eliminación 🛑 */}
            {showDeleteModal && userToDelete && (
                <div className="ap-modal-overlay">
                    <div className="ap-modal-content" style={{ maxWidth: 500 }}>
                        <div className="ap-modal-header" style={{ borderBottom: '1px solid #e74c3c' }}>
                            <h3 className="ap-modal-title" style={{ color: '#e74c3c' }}>⚠️ Eliminar Datos</h3>
                            <button 
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                    setErrorMessage('');
                                }} 
                                className="ap-modal-close-btn"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="ap-modal-body">
                            {errorMessage && (
                                <div className="ap-alert ap-alert-error" style={{ marginBottom: '20px' }}>
                                    {errorMessage}
                                </div>
                            )}

                            <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                                ¿Qué deseas eliminar en relación al usuario <strong>{userToDelete.nombre_completo}</strong>?
                            </p>

                            <div className="ap-form-group">
                                <label className="ap-form-label">Selecciona una opción:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'flex-start', 
                                        gap: '10px', 
                                        cursor: 'pointer',
                                        padding: '15px',
                                        border: deleteMode === 'user' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        background: deleteMode === 'user' ? 'var(--color-surface-200)' : 'transparent'
                                    }}>
                                        <input 
                                            type="radio" 
                                            name="deleteMode"
                                            checked={deleteMode === 'user'} 
                                            onChange={() => setDeleteMode('user')}
                                            style={{ marginTop: '4px' }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', marginBottom: '4px' }}>Solo este Usuario</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-medium)' }}>
                                                Elimina el acceso de este usuario. Los datos de la empresa (ventas, inventario) permanecen intactos.
                                            </span>
                                        </div>
                                    </label>

                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'flex-start', 
                                        gap: '10px', 
                                        cursor: 'pointer',
                                        padding: '15px',
                                        border: deleteMode === 'company' ? '2px solid #e74c3c' : '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        background: deleteMode === 'company' ? '#fff5f5' : 'transparent'
                                    }}>
                                        <input 
                                            type="radio" 
                                            name="deleteMode"
                                            checked={deleteMode === 'company'} 
                                            onChange={() => setDeleteMode('company')}
                                            style={{ marginTop: '4px' }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', marginBottom: '4px', color: '#c0392b' }}>Toda la Empresa y sus Datos</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-medium)' }}>
                                                Elimina la empresa <strong>{userToDelete.empresa_nombre}</strong>, TODOS sus usuarios, inventario, ventas e historial. <br/>
                                                <strong style={{ color: '#c0392b' }}>¡Esta acción es irreversible!</strong>
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="ap-modal-footer">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                    setErrorMessage('');
                                }} 
                                className="ap-btn ap-btn-secondary"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                disabled={actionLoading} 
                                className="ap-btn"
                                style={{ 
                                    backgroundColor: deleteMode === 'company' ? '#c0392b' : '#e74c3c',
                                    color: 'white'
                                }}
                            >
                                {actionLoading ? 'Eliminando...' : (deleteMode === 'company' ? '🗑️ Eliminar TODO' : 'Eliminar Usuario')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;






