// src/components/admin/AdminUserList.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';

const AdminUserList = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsuarios = async () => {
            // CRÍTICO: El RLS debe permitir a los administradores ver TODAS las filas.
            // Si el RLS en 'perfiles' no lo permite, esta consulta fallará.
            
            const { data, error } = await supabase
                .from('perfiles')
                .select(`
                    id, 
                    nombre, 
                    is_admin,
                    rol,
                    empresa:empresas(nombre, plan_activo)
                `)
                .order('empresa(nombre)', { ascending: true }); 

            if (error) {
                console.error('Error fetching admin user list:', error);
                // Si falla por RLS, se lo notificamos al admin
                alert('Fallo de RLS: Debes verificar la política SELECT de la tabla "perfiles" para el administrador.');
            } else {
                setUsuarios(data || []);
            }
            setLoading(false);
        };
        fetchUsuarios();
    }, []);

    if (loading) return <p>Cargando lista de usuarios y clientes...</p>;

    return (
        <div style={styles.tableContainer}>
            <p>Total de Usuarios Registrados: {usuarios.length}</p>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Empresa Cliente</th>
                        <th style={styles.th}>Nombre de Usuario</th>
                        <th style={styles.th}>Rol</th>
                        <th style={styles.th}>Plan Activo</th>
                        <th style={styles.th}>ID Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(u => (
                        <tr key={u.id} style={u.is_admin ? styles.adminRow : {}}>
                            <td style={styles.td}>{u.empresa?.nombre || 'N/A'}</td>
                            <td style={styles.td}>{u.nombre}</td>
                            <td style={styles.td}>{u.is_admin ? 'ADMIN (DEV)' : u.rol}</td>
                            <td style={styles.td}>{u.empresa?.plan_activo || 'basico'}</td>
                            <td style={styles.td}>{u.id.substring(0, 8)}...</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    tableContainer: { overflowX: 'auto', marginTop: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#2a2a2a' },
    th: { border: '1px solid #555', padding: '10px', textAlign: 'left', backgroundColor: '#1e1e1e', color: '#fff' },
    td: { border: '1px solid #555', padding: '10px' },
    adminRow: { backgroundColor: '#581515' } // Resaltar fila de administrador
};

export default AdminUserList;