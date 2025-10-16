// src/components/inventario/ProductoForm.jsx

import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { parseDecimal, parseInteger } from '../../utils/formatters';

const ProductoForm = ({ empresaId, onProductSaved }) => {

    // 2. Estado del formulario
    const [formData, setFormData] = useState({
        codigo_referencia: '',
        nombre: '',
        stock_actual: '0',
        precio_costo: '0',
        precio_venta: '0',
        alerta_stock_min: '5',
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        if (!empresaId) {
            setError('Error de autenticación: No se encontró la Empresa ID.');
            setLoading(false);
            return;
        }

        // 3. Crear el objeto de inserción
        const productToInsert = {
            ...formData,
            empresa_id: empresaId, // <--- CLAVE DEL SAAS: Insertar el tenant_id
            // Asegurar que stock y precios son números enteros/decimales válidos
            stock_actual: parseInteger(formData.stock_actual, 0),
            precio_costo: parseDecimal(formData.precio_costo, 0),
            precio_venta: parseDecimal(formData.precio_venta, 0),
            alerta_stock_min: parseInteger(formData.alerta_stock_min, 5),
        };

        // 4. Insertar en Supabase
        const { error: insertError } = await supabase
            .from('productos')
            .insert([productToInsert]); // El RLS se encargará de verificar el empresa_id

        if (insertError) {
            console.error(insertError);
            setError(`Error al guardar producto: ${insertError.message}`);
        } else {
            setSuccess('¡Producto guardado exitosamente!');
            // Llamar a la función padre para refrescar la lista
            if (onProductSaved) {
                onProductSaved();
            }
            // Limpiar formulario para el próximo producto
            setFormData({
                codigo_referencia: '',
                nombre: '',
                stock_actual: '0',
                precio_costo: '0',
                precio_venta: '0',
                alerta_stock_min: '5',
            });
        }
        setLoading(false);
    };

    // Estilos básicos y estructura del formulario
    return (
        <div style={styles.container}>
            <h3>{success ? success : 'Crear/Ingresar Inventario Inicial'}</h3>
            {!empresaId && <p style={styles.info}>Cargando datos de la empresa...</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                
                <label>Referencia (Interna):</label>
                <input type="text" name="codigo_referencia" value={formData.codigo_referencia} 
                       onChange={handleChange} required disabled={!empresaId || loading} style={styles.input} />

          <label>Nombre del Producto:</label>
          <input type="text" name="nombre" value={formData.nombre} 
              onChange={handleChange} required disabled={!empresaId || loading} style={styles.input} />
                
          <label>Stock Inicial (Unidades Actuales):</label>
          <input type="number" name="stock_actual" value={formData.stock_actual} 
              onChange={handleChange} required min="0" disabled={!empresaId || loading} style={styles.input} />
                
          <label>Precio de Costo:</label>
          <input type="number" name="precio_costo" value={formData.precio_costo} 
              onChange={handleChange} required min="0.00" step="0.01" disabled={!empresaId || loading} style={styles.input} />
                
          <label>Precio de Venta:</label>
          <input type="number" name="precio_venta" value={formData.precio_venta} 
              onChange={handleChange} required min="0.00" step="0.01" disabled={!empresaId || loading} style={styles.input} />
                
          <label>Alerta Stock Mínimo:</label>
          <input type="number" name="alerta_stock_min" value={formData.alerta_stock_min} 
              onChange={handleChange} min="1" disabled={!empresaId || loading} style={styles.input} />

          <button type="submit" disabled={loading || !empresaId} style={styles.button}>
                    {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
            </form>
            {error && <p style={styles.error}>{error}</p>}
        </div>
    );
};

// Estilos rápidos para el MVP
const styles = {
    container: { border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '400px', margin: '20px auto' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    input: { padding: '8px', borderRadius: '4px', border: '1px solid #ddd' },
    button: { padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
    error: { color: 'red', marginTop: '10px', fontWeight: 'bold' },
    info: { color: '#64748b', marginTop: '5px' },
    // ... otros estilos si deseas usar los de LoginPage
};

export default ProductoForm;