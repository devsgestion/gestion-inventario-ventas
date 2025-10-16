// src/pages/AdminDashboard.jsx

import React from 'react';
import AdminUserList from '../components/admin/AdminUserList'; 

const AdminDashboard = () => {
    return (
        <div style={styles.pageContainer}>
            <h1>Panel de Administración 👑</h1>
            <p>Gestiona clientes, permisos y verifica el estado de la plataforma.</p>
            
            <div style={styles.gridContainer}>
                {/* Herramienta 1: Alta de Clientes */}
                <div style={styles.card}>
                    <h3>Alta de Clientes</h3>
                    <p>Crea un nuevo usuario y su empresa asociada para comenzar la suscripción.</p>
                    <a href="/admin/register" style={styles.button}>Ir a Registro</a>
                </div>

                {/* Herramienta 2: Lista de Clientes */}
                <div style={styles.card}>
                    <h3>Visión General de Clientes</h3>
                    <p>Revisa la información de todos los usuarios y sus empresas (tenants).</p>
                    <a href="#users-list" style={styles.button}>Ver Lista Abajo</a>
                </div>
            </div>
            
            <hr style={styles.separator} id="users-list" />

            <h2>Usuarios Registrados</h2>
            <AdminUserList /> 
            
        </div>
    );
};

const styles = {
    pageContainer: { padding: '20px' },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' },
    card: { padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#333' },
    button: { display: 'inline-block', padding: '10px 15px', backgroundColor: '#2ecc71', color: 'white', textDecoration: 'none', borderRadius: '4px', marginTop: '10px' },
    separator: { margin: '30px 0', border: 'none', borderTop: '1px solid #555' }
};

export default AdminDashboard;