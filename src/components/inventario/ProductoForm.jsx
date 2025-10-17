// src/components/inventario/ProductoForm.jsx

import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { formatCurrencyCOP, parseDecimal, parseInteger } from '../../utils/formatters';
import '../../styles/inventario.css';

const ProductoForm = ({ empresaId, onProductSaved }) => {

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

    const handlePrecioChange = (e) => {
        const { name, value } = e.target;
        const raw = value.replace(/[^\d]/g, '');
        setFormData(prev => ({
            ...prev,
            [name]: raw
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

        const productToInsert = {
            ...formData,
            empresa_id: empresaId,
            stock_actual: parseInteger(formData.stock_actual, 0),
            precio_costo: parseDecimal(formData.precio_costo, 0),
            precio_venta: parseDecimal(formData.precio_venta, 0),
            alerta_stock_min: parseInteger(formData.alerta_stock_min, 5),
        };

        const { error: insertError } = await supabase
            .from('productos')
            .insert([productToInsert]);

        if (insertError) {
            console.error(insertError);
            setError(`Error al guardar producto: ${insertError.message}`);
        } else {
            setSuccess('¡Producto guardado exitosamente!');
            if (onProductSaved) {
                onProductSaved();
            }
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

    return (
        <div className="c-card" style={{ maxWidth: '450px' }}> {/* Se eliminó inventario-form-container, usando c-card */}
            <h3 className="c-card__title">
                {success ? success : 'Crear/Ingresar Inventario Inicial'}
            </h3>
            {!empresaId && <p className="c-form-message c-form-message--help">Cargando datos de la empresa...</p>}
            
            <form onSubmit={handleSubmit} className="c-form">
                
                <div className="c-form-group">
                    <label className="c-form-label">Referencia (Interna):</label>
                    <input
                        type="text"
                        name="codigo_referencia"
                        value={formData.codigo_referencia}
                        onChange={handleChange}
                        required
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        placeholder="Ej: REF-001"
                    />
                </div>
                
                <div className="c-form-group">
                    <label className="c-form-label">Nombre del Producto:</label>
                    <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        required
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        placeholder="Ej: Camisa Polo"
                    />
                </div>
                
                <div className="c-form-group">
                    <label className="c-form-label">Stock Inicial (Unidades Actuales):</label>
                    <input
                        type="number"
                        name="stock_actual"
                        value={formData.stock_actual}
                        onChange={handleChange}
                        required
                        min="0"
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        placeholder="Ej: 10"
                    />
                </div>
                
                <div className="c-form-group">
                    <label className="c-form-label">Precio de Costo:</label>
                    <input
                        type="text"
                        name="precio_costo"
                        // El formateo se mantiene, asegurando que el input type="text" funcione con el formateo visual
                        value={formData.precio_costo ? formatCurrencyCOP(parseInt(formData.precio_costo, 10) || 0) : ''}
                        onChange={handlePrecioChange}
                        required
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        inputMode="numeric"
                        placeholder="$ 0"
                        autoComplete="off"
                    />
                </div>
                
                <div className="c-form-group">
                    <label className="c-form-label">Precio de Venta:</label>
                    <input
                        type="text"
                        name="precio_venta"
                        value={formData.precio_venta ? formatCurrencyCOP(parseInt(formData.precio_venta, 10) || 0) : ''}
                        onChange={handlePrecioChange}
                        required
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        inputMode="numeric"
                        placeholder="$ 0"
                        autoComplete="off"
                    />
                </div>
                
                <div className="c-form-group">
                    <label className="c-form-label">Alerta Stock Mínimo:</label>
                    <input
                        type="number"
                        name="alerta_stock_min"
                        value={formData.alerta_stock_min}
                        onChange={handleChange}
                        min="1"
                        disabled={!empresaId || loading}
                        className="c-form-input"
                        placeholder="Ej: 5"
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={loading || !empresaId} 
                    className="btn btn-primary btn-success btn-full" /* Usamos btn-success y btn-full (100% width) */
                >
                    {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
            </form>
            {error && <p className="c-form-message c-form-message--error u-mt-lg">{error}</p>}
        </div>
    );
};

export default ProductoForm;