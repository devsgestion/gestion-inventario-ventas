// src/components/inventario/ProductoForm.jsx (FINAL con Grilla y RHF/UX)

import React, { useState, useCallback } from 'react';
import { supabase } from '../../api/supabaseClient';
import { formatCurrencyCOP, parseDecimal, parseInteger } from '../../utils/formatters';
// 💡 CRÍTICO: Importar Controller para inputs de dinero con formato
import { useForm, Controller } from 'react-hook-form'; 
import '../../styles/inventario.css';

// =========================================================================
// 💡 COMPONENTE CUSTOM: Input de Dinero con Formato COP (UX Mejorada)
// =========================================================================
const CurrencyInput = ({ field, placeholder, disabled, label }) => {
    // Estado interno para la cadena formateada que el usuario ve
    const [displayValue, setDisplayValue] = useState(field.value ? formatCurrencyCOP(field.value) : '');

    const handleChange = (e) => {
        // 1. Limpiar la entrada a solo números (si es posible)
        const rawValue = e.target.value.replace(/[^\d]/g, ''); 
        const numericValue = rawValue ? parseInt(rawValue, 10) : 0;
        
        // 2. Actualizar RHF (el valor REAL es el número)
        field.onChange(numericValue);
        
        // 3. Actualizar el estado de visualización (el formato COP)
        if (rawValue) {
            setDisplayValue(formatCurrencyCOP(numericValue));
        } else {
            setDisplayValue('');
        }
    };
    
    // 💡 UX: Al hacer focus, muestra el valor crudo y selecciona todo para escribir encima
    const handleFocus = (e) => {
        const numericValue = field.value || '';
        // Muestra el número sin formato (ej: 12000) o vacío
        setDisplayValue(numericValue.toString()); 
        e.target.select(); // Selecciona todo el texto
    };

    // 💡 UX: Al perder el focus, si hay valor, formatea de nuevo
    const handleBlur = (e) => {
        if (field.value) {
            setDisplayValue(formatCurrencyCOP(field.value));
        } else {
            // Asegurarse de que RHF reciba 0 si el campo queda vacío
            field.onChange(0);
            setDisplayValue('');
        }
        field.onBlur(e);
    };

    return (
        <div className="c-form-group">
            <label className="c-form-label" htmlFor={field.name}>{label}</label>
            <input
                id={field.name}
                type="text" // Debe ser "text" para el formateo visual
                inputMode="numeric"
                placeholder={placeholder}
                disabled={disabled}
                className="c-form-input"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        </div>
    );
};


// =========================================================================
// 💡 COMPONENTE PRINCIPAL: ProductoForm
// =========================================================================

const ProductoForm = ({ empresaId, onProductSaved, onClose }) => {
    
    const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            // CRÍTICO: Dejar los campos numéricos vacíos para que la UX de 'escribir encima' funcione
            codigo_referencia: '',
            nombre: '',
            categoria: '',
            stock_actual: '', 
            precio_costo: '', 
            precio_venta: '',
            alerta_stock_min: '5',
        }
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const onSubmit = async (formData) => {
        setError(null);
        setSuccess(null);
        
        if (!empresaId) {
            setError('Error: No se encontró la Empresa ID.');
            return;
        }

        const productToInsert = {
            ...formData,
            empresa_id: empresaId,
            // Asegurar que los valores vacíos se conviertan a 0 o al valor de default
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
            setSuccess('¡Producto guardado exitosamente! Cerrando...');
            onProductSaved();
            setTimeout(onClose, 1000);
        }
    };

    return (
        <div className="c-modal-overlay">
            <div className="c-modal-content">
                <div className="c-modal-header">
                    <h2 className="c-modal-title">
                        <span role="img" aria-label="new">➕</span> Ingresar Nuevo Producto
                    </h2>
                    {/* 💡 Botón de cierre en la esquina */}
                    <button onClick={onClose} className="c-modal-close-btn" disabled={isSubmitting}>
                        ✕
                    </button>
                </div>
                
                <div className="c-modal-body">
                    {success && <p className="c-form-message c-form-message--success u-mb-md">{success}</p>}
                    {error && <p className="c-form-message c-form-message--error u-mb-md">{error}</p>}
                    
                    <form onSubmit={handleSubmit(onSubmit)}>
                        
                        {/* 💡 APLICAMOS LA CLASE DE GRILLA DE DOS COLUMNAS */}
                        <div className="c-form--grid">
                            
                            {/* Nombre del Producto */}
                            <div className="c-form-group">
                                <label className="c-form-label" htmlFor="nombre">Nombre del Producto:</label>
                                <input
                                    id="nombre"
                                    type="text"
                                    placeholder="Ej: Camisa Polo"
                                    disabled={isSubmitting || !empresaId}
                                    className="c-form-input"
                                    {...register("nombre", { required: "El nombre es obligatorio" })}
                                />
                                {errors.nombre && <p className="c-form-message c-form-message--error">{errors.nombre.message}</p>}
                            </div>
                            
                            {/* Código de Referencia */}
                            <div className="c-form-group">
                                <label className="c-form-label" htmlFor="codigo_referencia">Referencia (Interna):</label>
                                <input
                                    id="codigo_referencia"
                                    type="text"
                                    placeholder="Ej: REF-001"
                                    disabled={isSubmitting || !empresaId}
                                    className="c-form-input"
                                    {...register("codigo_referencia")}
                                />
                            </div>
                            
                            {/* Stock Inicial */}
                            <div className="c-form-group">
                                <label className="c-form-label" htmlFor="stock_actual">Stock Inicial:</label>
                                <input
                                    id="stock_actual"
                                    type="number"
                                    placeholder="0"
                                    disabled={isSubmitting || !empresaId}
                                    className="c-form-input"
                                    {...register("stock_actual", { 
                                        valueAsNumber: true,
                                        min: { value: 0, message: "El stock debe ser ≥ 0" }
                                    })}
                                />
                                {errors.stock_actual && <p className="c-form-message c-form-message--error">{errors.stock_actual.message}</p>}
                            </div>
                            
                            {/* Alerta Stock Mínimo */}
                            <div className="c-form-group">
                                <label className="c-form-label" htmlFor="alerta_stock_min">Alerta Stock Mínimo:</label>
                                <input
                                    id="alerta_stock_min"
                                    type="number"
                                    placeholder="5"
                                    disabled={isSubmitting || !empresaId}
                                    className="c-form-input"
                                    {...register("alerta_stock_min", { 
                                        valueAsNumber: true,
                                        min: { value: 0, message: "El mínimo debe ser ≥ 0" }
                                    })}
                                />
                                {errors.alerta_stock_min && <p className="c-form-message c-form-message--error">{errors.alerta_stock_min.message}</p>}
                            </div>

                            {/* Precio de Costo (Custom Currency Input) */}
                            <Controller
                                name="precio_costo"
                                control={control}
                                rules={{ required: "Costo es obligatorio", min: { value: 0, message: "El costo debe ser ≥ 0" } }}
                                render={({ field }) => (
                                    <CurrencyInput 
                                        field={field} 
                                        label="Precio de Costo:"
                                        placeholder="0"
                                        disabled={isSubmitting || !empresaId}
                                    />
                                )}
                            />
                            {errors.precio_costo && <p className="c-form-message c-form-message--error u-mt-xs">{errors.precio_costo.message}</p>}
                            
                            {/* Precio de Venta (Custom Currency Input) */}
                            <Controller
                                name="precio_venta"
                                control={control}
                                rules={{ required: "Precio de venta es obligatorio", min: { value: 0.1, message: "Debe ser mayor a cero" } }}
                                render={({ field }) => (
                                    <CurrencyInput 
                                        field={field} 
                                        label="Precio de Venta:"
                                        placeholder="0"
                                        disabled={isSubmitting || !empresaId}
                                    />
                                )}
                            />
                            {errors.precio_venta && <p className="c-form-message c-form-message--error u-mt-xs">{errors.precio_venta.message}</p>}

                            {/* Categoría */}
                            <div className="c-form-group">
                                <label className="c-form-label" htmlFor="categoria">Categoría:</label>
                                <input
                                    id="categoria"
                                    type="text"
                                    placeholder="Ej: Cadenas, Aretes, Pulseras"
                                    disabled={isSubmitting || !empresaId}
                                    className="c-form-input"
                                    {...register("categoria")}
                                />
                            </div>
                            
                        </div> {/* FIN c-form--grid */}

                        <div className="c-modal-footer">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !empresaId} 
                                className="btn btn-primary btn-success"
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProductoForm;