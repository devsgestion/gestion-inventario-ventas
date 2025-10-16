// src/components/inventario/AjusteStockModal.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import useAuth from '../../hooks/useAuth';
import { parseInteger } from '../../utils/formatters';

// Este componente se usa para editar el stock de un producto específico.
const AjusteStockModal = ({ producto, onClose, onStockAdjusted }) => {
    const { perfil } = useAuth(); // <--- ASEGÚRATE DE IMPORTAR ESTO Y USARLO
    // Usamos el stock_actual del producto como valor inicial
    const [cantidadAjuste, setCantidadAjuste] = useState(''); 
    const [razon, setRazon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAjuste = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const ajusteNumerico = parseInteger(cantidadAjuste, Number.NaN);

        if (!Number.isFinite(ajusteNumerico) || ajusteNumerico === 0) {
            setError('Ingresa una cantidad válida a sumar o restar.');
            setLoading(false);
            return;
        }

        // Obtener la empresaId y userId
        const empresaId = perfil?.empresa_id;
        const userId = perfil?.id;

        if (!empresaId) {
            setError('Error: No se puede identificar la empresa.');
            setLoading(false);
            return;
        }

        // 1. Calcular el nuevo stock
        const nuevoStock = producto.stock_actual + ajusteNumerico;

        // Iniciar Transacción (Podríamos usar un RPC, pero para el MVP usaremos dos llamadas)
        
        // 2. Insertar el Movimiento (PRIORIDAD: la trazabilidad)
        const { error: movError } = await supabase
            .from('movimientos_inventario')
            .insert([{
                empresa_id: empresaId,
                producto_id: producto.id,
                usuario_id: userId,
                tipo_movimiento: ajusteNumerico > 0 ? 'RECEPCION' : 'AJUSTE',
                cantidad_cambio: ajusteNumerico,
                razon: razon,
            }]);

        if (movError) {
            setError(`Error al registrar movimiento: ${movError.message}`);
            setLoading(false);
            return;
        }

        // 3. Ejecutar la actualización en Supabase (Solo si el movimiento se registró)
        const { error: updateError } = await supabase
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', producto.id)
            .eq('empresa_id', empresaId)
            .select();

        if (updateError) {
            // En un sistema real, aquí revertirías el movimiento, pero para el MVP:
            setError(`Error al actualizar stock: ${updateError.message}`);
        } else {
            // Éxito
            onStockAdjusted();
            setCantidadAjuste('');
            setRazon('');
            onClose();
        }
        setLoading(false);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3>Ajustar Stock de: {producto.nombre}</h3>
                <p>Stock Actual: {producto.stock_actual} unidades</p>
                <form onSubmit={handleAjuste} style={styles.form}>
                    <label>Cantidad a Sumar/Restar (Ej: 5 o -3):</label>
                    <input 
                        type="number" 
                        value={cantidadAjuste} 
                        onChange={(e) => setCantidadAjuste(e.target.value)} 
                        required 
                        style={styles.input}
                    />

                    <label>Razón del Ajuste (Obligatorio para inventario):</label>
                    <input 
                        type="text" 
                        placeholder="Ej: Inventario físico o Mercancía recibida"
                        value={razon} 
                        onChange={(e) => setRazon(e.target.value)} 
                        required 
                        style={styles.input}
                    />

                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} disabled={loading} style={styles.cancelButton}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} style={styles.adjustButton}>
                            {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
                        </button>
                    </div>
                </form>
                {error && <p style={styles.error}>{error}</p>}
            </div>
        </div>
    );
};

// Estilos básicos para el Modal
const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' },
    input: { padding: '8px', borderRadius: '4px', border: '1px solid #ddd' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    cancelButton: { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white' },
    adjustButton: { padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: 'red', marginTop: '10px', fontWeight: 'bold' }
};

export default AjusteStockModal;