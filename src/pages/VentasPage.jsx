// src/pages/VentasPage.jsx
import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import VentaProductosLista from '../components/ventas/VentaProductosLista';
import CarritoDeVentas from '../components/ventas/CarritoDeVentas';
import { supabase } from '../api/supabaseClient';
import { formatCurrencyCOP } from '../utils/formatters';

const VentasPage = () => {
    const { perfil } = useAuth();
    const [carrito, setCarrito] = useState([]); // Estado del carrito (productos a vender)

    // 1. Función para añadir un producto al carrito
    const handleAddToCart = (producto) => {
        setCarrito(prevCarrito => {
            const existe = prevCarrito.find(item => item.id === producto.id);

            if (existe) {
                // Si el producto ya está, solo aumentar la cantidad
                return prevCarrito.map(item =>
                    item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            } else {
                // Si es nuevo, añadirlo con cantidad 1
                return [...prevCarrito, { ...producto, cantidad: 1, precio_venta: Number(producto.precio_venta) || 0 }];
            }
        });
    };

    // 2. Función para manejar cambios en el carrito (ej. cambio de cantidad o eliminar)
    const handleUpdateCart = (productoId, nuevaCantidad) => {
        const quantity = Number.parseInt(nuevaCantidad, 10);
        setCarrito(prevCarrito => {
            if (!Number.isFinite(quantity) || quantity <= 0) {
                // Si la cantidad es 0 o menos, eliminar del carrito
                return prevCarrito.filter(item => item.id !== productoId);
            }
            // Actualizar la cantidad
            return prevCarrito.map(item =>
                item.id === productoId ? { ...item, cantidad: quantity } : item
            );
        });
    };
    
    // 3. Función para finalizar la venta (LÓGICA ACTUALIZADA)
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        const empresaId = perfil?.empresa_id;
        const userId = perfil?.id;

        if (!empresaId || !userId) {
            alert('Error: No se puede identificar la empresa o el usuario.');
            return;
        }

        // Mapear el carrito al formato que espera la función RPC
        const itemsParaRPC = carrito.map(item => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_venta
        }));

        // Llamada a la función RPC
        const { data, error } = await supabase.rpc('registrar_venta', {
            p_empresa_id: empresaId,
            p_usuario_id: userId,
            p_items: itemsParaRPC
        });

        if (error) {
            console.error('Error al finalizar venta:', error);
            alert(`Error al registrar la venta. Inténtalo de nuevo. Detalle: ${error.message}`);
        } else {
            // Venta exitosa
            alert(`Venta registrada exitosamente! Total: ${formatCurrencyCOP(data.total)}`); 
            setCarrito([]); // Limpiar el carrito
            
            // Opcional: Redirigir o refrescar la lista de productos
            // (La lista en la izquierda se actualizará automáticamente en el próximo ciclo de React/cambio de estado)
        }
    };

    return (
        <div style={styles.pageContainer}>
            <h2 style={styles.header}>Punto de Venta (POS) - {perfil?.empresa?.nombre}</h2>
            
            <div style={styles.contentGrid}>
                {/* Columna Izquierda: Búsqueda y Lista de Productos */}
                <VentaProductosLista empresaId={perfil?.empresa_id} onAddToCart={handleAddToCart} />
                
                {/* Columna Derecha: Carrito y Totales */}
                <CarritoDeVentas 
                    carrito={carrito} 
                    onUpdateCart={handleUpdateCart}
                    onFinalizarVenta={handleFinalizarVenta}
                />
            </div>
        </div>
    );
};

const styles = {
    pageContainer: { padding: '20px' },
    header: { marginBottom: '30px' },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr', // 2/3 para productos, 1/3 para carrito
        gap: '20px',
        minHeight: '600px'
    }
};

export default VentasPage;