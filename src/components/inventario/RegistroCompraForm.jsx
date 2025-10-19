// src/components/inventario/RegistroCompraForm.jsx (Nuevo componente)

import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient'; 

const RegistroCompraForm = ({ empresaId, productoAComprar, onClose, onSuccess }) => {
    // Estado para capturar la cantidad y el costo de esta nueva compra
    const [compraData, setCompraData] = useState({
        cantidad: 1,
        // CRÍTICO: El costo por defecto es el actual, pero se puede sobrescribir con el costo de la factura.
        nuevoCostoUnitario: productoAComprar.precio_costo, 
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setCompraData({ ...compraData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);

        // 🛑 LLAMADA A LA RPC para registrar la compra y calcular el CPP 🛑
        const { data, error } = await supabase.rpc('registrar_compra', {
            p_empresa_id: empresaId,
            p_producto_id: productoAComprar.id,
            p_cantidad_ingreso: compraData.cantidad,
            p_costo_compra: compraData.nuevoCostoUnitario, // El nuevo precio de costo menor
        });
        
        setLoading(false);

        if (error) {
            alert('Error al registrar la compra: ' + error.message);
            console.error(error);
        } else {
            alert(`Compra registrada. Nuevo CPP calculado: ${data.nuevo_cpp}`);
            onSuccess(); // Actualiza la lista de inventario
            onClose();
        }
    };

    return (
        <div className="c-modal">
            <div className="c-card">
                <h3>Registro de Compra: {productoAComprar.nombre}</h3>
                <p>Stock actual: {productoAComprar.stock_actual} | CPP actual: ${productoAComprar.precio_costo}</p>
                
                <div className="form-group">
                    <label htmlFor="cantidad">Cantidad Comprada que Ingresa</label>
                    <input
                        type="number"
                        id="cantidad"
                        name="cantidad"
                        value={compraData.cantidad}
                        onChange={handleChange}
                        min="1"
                        required
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="nuevoCostoUnitario">Costo Unitario de ESTA Compra</label>
                    <input
                        type="number"
                        id="nuevoCostoUnitario"
                        name="nuevoCostoUnitario"
                        value={compraData.nuevoCostoUnitario}
                        onChange={handleChange}
                        min="0"
                        required
                        className="form-input"
                    />
                    <p className="form-help">Este es el precio al que compraste la nueva mercancía.</p>
                </div>
                
                <button onClick={handleSave} disabled={loading} className="btn btn-primary u-mt-lg">
                    {loading ? 'Procesando...' : 'Registrar Compra y Ajustar Costo'}
                </button>
                <button onClick={onClose} className="btn btn-secondary u-ml-sm">Cancelar</button>
            </div>
        </div>
    );
};