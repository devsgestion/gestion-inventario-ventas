// src/pages/LoginPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; 

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login, session, isLoading, isBootstrapping } = useAuth();
    const navigate = useNavigate();
    const buttonStyle = { ...styles.button, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'wait' : 'pointer' };

    // Redirigir si la sesión se establece
    useEffect(() => {
        if (!isBootstrapping && session) {
            // Redirigir al Inventario, que es la página principal de la aplicación
            navigate('/inventario', { replace: true });
        }
    }, [session, isBootstrapping, navigate]);

    // Opcional: Mostrar mensaje de carga si el hook aún está verificando la sesión
    if (isBootstrapping) {
         return <div>Verificando sesión...</div>;
    }
    
    // Si ya tiene sesión, no renderizar nada (la redirección ya está en useEffect)
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
        // Si no hay error, el useEffect se encargará de la redirección.
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Iniciar Sesión en GestionDevs</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                
                <input
                    type="email"
                    placeholder="Correo Electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                />
                
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                />
                
                <button type="submit" style={buttonStyle} disabled={isLoading}>
                    {isLoading ? 'Ingresando...' : 'Entrar'}
                </button>
                
                {error && <p style={styles.error}>{error}</p>}

                <p style={styles.registerPrompt}>
                    {/* CRÍTICO: La ruta /register ahora está protegida, solo el administrador debe usarla. */}
                    ¿Eres el desarrollador? Accede a la ruta <a href="/register">/register</a>.
                </p>

            </form>
        </div>
    );
};

// Estilos
const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '50px' },
    header: { marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', width: '300px' },
    input: { padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' },
    button: { padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: 'red', marginTop: '10px' },
    registerPrompt: { marginTop: '20px', fontSize: '14px' }
};

export default LoginPage;