import React, { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import './PedidoDetalle.css';

// Función para formatear en pesos colombianos
const formatCOP = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

export default function PedidoDetalle({ pedido, onClose, onAddProducts }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [editandoTotal, setEditandoTotal] = useState(false);
  const [totalPersonalizado, setTotalPersonalizado] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [estadoPedido, setEstadoPedido] = useState(pedido?.estado || 'pendiente');
  const [imagenesPedido, setImagenesPedido] = useState([]);

  const cargarItems = () => {
    if (!pedido?.id) return;
    setLoading(true);
    supabase
      .from('items_pedido')
      .select('*, productos(id, nombre, codigo_referencia)')
      .eq('pedido_id', pedido.id)
      .then(({ data }) => {
        // Aplanar los datos para facilitar el acceso
        const itemsConProductoId = data?.map(item => ({
          ...item,
          producto_id: item.productos?.id || item.producto_id,
          // Parsear productos_conjunto si es un JSON string
          productos_conjunto: typeof item.productos_conjunto === 'string' 
            ? JSON.parse(item.productos_conjunto) 
            : item.productos_conjunto
        })) || [];
        
        setItems(itemsConProductoId);
        setEditedItems(itemsConProductoId);
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarItems();
    setTotalPersonalizado(pedido.total_pedido);
    setEstadoPedido(pedido?.estado || 'pendiente');
    setImagenesPedido(pedido?.imagenes || []);
  }, [pedido]);

  const calcularTotal = () => {
    const itemsParaCalculo = modoEdicion ? editedItems : items;
    return itemsParaCalculo.reduce((acc, item) => {
      return acc + (parseFloat(item.precio_unitario || 0) * parseInt(item.cantidad || 0));
    }, 0);
  };

  const updateEditedItem = (index, field, value) => {
    const newEditedItems = [...editedItems];
    newEditedItems[index] = {
      ...newEditedItems[index],
      [field]: value
    };
    setEditedItems(newEditedItems);
  };

  const handleGuardarCambios = async () => {
    setGuardando(true);

    try {
      // Verificar si el estado cambió a "entregado"
      const estadoAnterior = pedido.estado;
      const cambioAEntregado = estadoAnterior !== 'entregado' && estadoPedido === 'entregado';

      // Actualizar cada item
      for (const item of editedItems) {
        const { error } = await supabase
          .from('items_pedido')
          .update({
            talla: item.talla || null,
            color: item.color || null,
            cantidad: parseInt(item.cantidad),
            precio_unitario: parseFloat(item.precio_unitario),
          })
          .eq('id', item.id);

        if (error) {
          console.error('Error actualizando item:', error);
          throw error;
        }
      }

      // Actualizar el total del pedido y estado
      const totalFinal = editandoTotal && totalPersonalizado !== null
        ? parseFloat(totalPersonalizado)
        : calcularTotal();

      // Preparar datos de actualización
      const updateData = { 
        total_pedido: totalFinal
      };
      
      // Solo agregar estado si existe en el objeto pedido original
      if (pedido.hasOwnProperty('estado')) {
        updateData.estado = estadoPedido;
      }

      const { error: updateError } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', pedido.id);

      if (updateError) {
        console.error('Error actualizando total:', updateError);
        throw updateError;
      }

      // Si cambió a entregado, descontar del inventario
      if (cambioAEntregado) {
        const { data: { user } } = await supabase.auth.getUser();
        
        for (const item of editedItems) {
          // Si es un conjunto, descontar cada producto del conjunto
          if (item.es_conjunto && item.productos_conjunto?.length > 0) {
            for (const prodConjunto of item.productos_conjunto) {
              if (!prodConjunto.producto_id) continue;

              // Obtener stock actual
              const { data: productoData, error: fetchError } = await supabase
                .from('productos')
                .select('stock_actual')
                .eq('id', prodConjunto.producto_id)
                .single();

              if (fetchError) {
                console.error('Error obteniendo producto del conjunto:', fetchError);
                continue;
              }

              // Calcular cantidad total a descontar (cantidad del producto * cantidad del conjunto)
              const cantidadADescontar = parseInt(prodConjunto.cantidad) * parseInt(item.cantidad);
              const nuevoStock = productoData.stock_actual - cantidadADescontar;

              // Actualizar stock
              const { error: stockError } = await supabase
                .from('productos')
                .update({ stock_actual: nuevoStock })
                .eq('id', prodConjunto.producto_id)
                .eq('empresa_id', pedido.empresa_id);

              if (stockError) {
                console.error('Error descontando stock del conjunto:', stockError);
                continue;
              }

              // Registrar movimiento
              await supabase
                .from('movimientos_inventario')
                .insert({
                  empresa_id: pedido.empresa_id,
                  producto_id: prodConjunto.producto_id,
                  usuario_id: user?.id || null,
                  tipo_movimiento: 'PEDIDO_ENTREGADO',
                  cantidad_cambio: -cantidadADescontar,
                  razon: `Conjunto "${item.nombre_producto}" - Pedido #${pedido.id.substring(0, 8)} entregado a ${pedido.cliente_nombre}`
                });
            }
          } 
          // Si es un producto individual
          else if (item.producto_id) {
            // Obtener el stock actual del producto
            const { data: productoData, error: fetchError } = await supabase
              .from('productos')
              .select('stock_actual')
              .eq('id', item.producto_id)
              .single();

            if (fetchError) {
              console.error('Error obteniendo producto:', fetchError);
              throw fetchError;
            }

            // Descontar stock del producto
            const nuevoStock = productoData.stock_actual - parseInt(item.cantidad);
            
            const { error: stockError } = await supabase
              .from('productos')
              .update({ stock_actual: nuevoStock })
              .eq('id', item.producto_id)
              .eq('empresa_id', pedido.empresa_id);

            if (stockError) {
              console.error('Error descontando stock:', stockError);
              throw stockError;
            }

            // Registrar movimiento de inventario
            await supabase
              .from('movimientos_inventario')
              .insert({
                empresa_id: pedido.empresa_id,
                producto_id: item.producto_id,
                usuario_id: user?.id || null,
                tipo_movimiento: 'PEDIDO_ENTREGADO',
                cantidad_cambio: -parseInt(item.cantidad),
                razon: `Pedido #${pedido.id.substring(0, 8)} entregado a ${pedido.cliente_nombre}`
              });
          }
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setModoEdicion(false);
        setEditandoTotal(false);
        cargarItems();
      }, 1500);

    } catch (error) {
      alert('Error al guardar cambios. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setModoEdicion(false);
    setEditandoTotal(false);
    setEditedItems([...items]);
    setTotalPersonalizado(pedido.total_pedido);
  };

  const handleActivarEdicion = () => {
    setModoEdicion(true);
    setEditedItems([...items]);
  };

  const handleEliminarPedido = async () => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el pedido de ${pedido.cliente_nombre}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setGuardando(true);
    try {
      // Eliminar items del pedido (se eliminan automáticamente por CASCADE)
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedido.id);

      if (error) {
        console.error('Error eliminando pedido:', error);
        throw error;
      }

      // Mostrar confirmación y cerrar
      alert('✅ Pedido eliminado exitosamente');
      onClose();
    } catch (error) {
      alert('❌ Error al eliminar el pedido. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pendiente': return 'badge-warning';
      case 'en_proceso': return 'badge-info';
      case 'en_viaje': return 'badge-primary';
      case 'entregado': return 'badge-success';
      case 'cancelado': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getEstadoTexto = (estado) => {
    switch(estado) {
      case 'pendiente': return '⏳ PENDIENTE';
      case 'en_proceso': return '🔨 EN PROCESO';
      case 'en_viaje': return '🚚 EN VIAJE';
      case 'entregado': return '✅ ENTREGADO';
      case 'cancelado': return '❌ CANCELADO';
      default: return estado.toUpperCase();
    }
  };

  if (showSuccess) {
    return (
      <div className="pedido-detalle__modal">
        <div className="pedido-detalle__success">
          <div className="pedido-detalle__success-icon">✅</div>
          <h3>¡Cambios guardados exitosamente!</h3>
          <p>Los productos del pedido se han actualizado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pedido-detalle__modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="pedido-detalle">
        <div className="pedido-detalle__header">
          <h3>📋 Detalle del Pedido</h3>
          <button type="button" className="pedido-detalle__btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="pedido-detalle__section">
          <div className="pedido-detalle__section-header">
            <h4>Información del Cliente</h4>
            {modoEdicion ? (
              <select 
                className="pedido-detalle__estado-select"
                value={estadoPedido}
                onChange={(e) => setEstadoPedido(e.target.value)}
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="en_proceso">🔨 En Proceso</option>
                <option value="en_viaje">🚚 En Viaje</option>
                <option value="entregado">✅ Entregado</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            ) : (
              <span className={`badge ${getEstadoBadgeClass(pedido.estado)}`}>
                {getEstadoTexto(pedido.estado)}
              </span>
            )}
          </div>
          
          <div className="pedido-detalle__info-grid">
            <div className="pedido-detalle__info-item">
              <span className="pedido-detalle__info-label">👤 Cliente:</span>
              <span className="pedido-detalle__info-value">{pedido.cliente_nombre}</span>
            </div>
            <div className="pedido-detalle__info-item">
              <span className="pedido-detalle__info-label">📱 Teléfono:</span>
              <span className="pedido-detalle__info-value">{pedido.cliente_telefono || 'No especificado'}</span>
            </div>
            <div className="pedido-detalle__info-item">
              <span className="pedido-detalle__info-label">📢 Canal:</span>
              <span className="pedido-detalle__info-value">{pedido.canal}</span>
            </div>
            <div className="pedido-detalle__info-item">
              <span className="pedido-detalle__info-label">📅 Fecha:</span>
              <span className="pedido-detalle__info-value">
                {pedido.created_at 
                  ? new Date(pedido.created_at).toLocaleDateString() 
                  : 'No disponible'}
              </span>
            </div>
          </div>

          {pedido.comentarios && (
            <div className="pedido-detalle__info-item pedido-detalle__info-item--full-width">
              <span className="pedido-detalle__info-label">💬 Comentarios:</span>
              <p className="info-value comentarios">{pedido.comentarios}</p>
            </div>
          )}
        </div>

        <div className="pedido-detalle__section">
          <h4>🛍️ Productos del Pedido</h4>
          
          {loading ? (
            <div className="loading-state">Cargando productos...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <p>📦 No hay productos en este pedido</p>
            </div>
          ) : (
            <>
              <div className="pedido-detalle__table">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Talla</th>
                      <th>Color</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(modoEdicion ? editedItems : items).map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.nombre_producto}</strong>
                          {item.observaciones && (
                            <div className="pedido-detalle__item-observaciones">{item.observaciones}</div>
                          )}
                        </td>
                        <td>
                          {modoEdicion ? (
                            <input
                              type="text"
                              value={item.talla || ''}
                              onChange={(e) => updateEditedItem(index, 'talla', e.target.value)}
                              className="pedido-detalle__input-edit"
                              placeholder="-"
                            />
                          ) : (
                            item.talla || '-'
                          )}
                        </td>
                        <td>
                          {modoEdicion ? (
                            <input
                              type="text"
                              value={item.color || ''}
                              onChange={(e) => updateEditedItem(index, 'color', e.target.value)}
                              className="pedido-detalle__input-edit"
                              placeholder="-"
                            />
                          ) : (
                            item.color || '-'
                          )}
                        </td>
                        <td>
                          {modoEdicion ? (
                            <input
                              type="number"
                              value={item.cantidad}
                              min={1}
                              onChange={(e) => updateEditedItem(index, 'cantidad', e.target.value)}
                              className="pedido-detalle__input-edit pedido-detalle__input-edit--number"
                            />
                          ) : (
                            item.cantidad
                          )}
                        </td>
                        <td>
                          {modoEdicion ? (
                            <input
                              type="number"
                              value={item.precio_unitario}
                              min={0}
                              step="100"
                              onChange={(e) => updateEditedItem(index, 'precio_unitario', e.target.value)}
                              className="pedido-detalle__input-edit pedido-detalle__input-edit--number"
                            />
                          ) : (
                            formatCOP(item.precio_unitario)
                          )}
                        </td>
                        <td>
                          <strong>{formatCOP(parseFloat(item.precio_unitario) * parseInt(item.cantidad))}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pedido-detalle__total">
                <div className="pedido-detalle__total-row">
                  <span>Total del Pedido:</span>
                  {modoEdicion ? (
                    <div className="pedido-detalle__total-edit">
                      {editandoTotal ? (
                        <>
                          <input 
                            type="number" 
                            className="pedido-detalle__total-input"
                            value={totalPersonalizado || ''} 
                            onChange={(e) => setTotalPersonalizado(e.target.value)}
                            step="100"
                            min="0"
                          />
                          <button 
                            type="button" 
                            className="pedido-detalle__btn-icon" 
                            onClick={() => setEditandoTotal(false)}
                            title="Usar total automático"
                          >
                            🔄
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="pedido-detalle__total-amount">{formatCOP(calcularTotal())}</span>
                          <button 
                            type="button" 
                            className="pedido-detalle__btn-icon" 
                            onClick={() => {
                              setEditandoTotal(true);
                              setTotalPersonalizado(calcularTotal());
                            }}
                            title="Editar total manualmente"
                          >
                            ✏️
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="pedido-detalle__total-amount">{formatCOP(totalPersonalizado || calcularTotal())}</span>
                  )}
                </div>
                {modoEdicion && editandoTotal && (
                  <div className="pedido-detalle__total-info">
                    💡 Total calculado: {formatCOP(calcularTotal())}
                  </div>
                )}
              </div>

              {/* Imágenes del pedido */}
              {imagenesPedido && imagenesPedido.length > 0 && (
                <div className="pedido-detalle__imagenes-section">
                  <h3 className="pedido-detalle__imagenes-title">📷 Imágenes de Referencia</h3>
                  <div className="pedido-detalle__imagenes-grid">
                    {imagenesPedido.map((imagen, index) => (
                      <div key={index} className="pedido-detalle__imagen-item">
                        <img 
                          src={imagen.url} 
                          alt={`Referencia ${index + 1}`}
                          className="pedido-detalle__imagen-preview"
                          onClick={() => window.open(imagen.url, '_blank')}
                        />
                        <span className="pedido-detalle__imagen-nombre">{imagen.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pedido-detalle__actions">
          {modoEdicion ? (
            <>
              <button 
                className="pedido-detalle__btn pedido-detalle__btn--secondary" 
                onClick={handleCancelarEdicion}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button 
                className="pedido-detalle__btn pedido-detalle__btn--primary" 
                onClick={handleGuardarCambios}
                disabled={guardando}
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </button>
            </>
          ) : (
            <>
              {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
                <>
                  <button 
                    className="pedido-detalle__btn pedido-detalle__btn--secondary" 
                    onClick={handleActivarEdicion}
                  >
                    ✏️ Editar Productos
                  </button>
                  <button 
                    className="pedido-detalle__btn pedido-detalle__btn--primary" 
                    onClick={() => onAddProducts && onAddProducts(pedido)}
                  >
                    ➕ Agregar más productos
                  </button>
                </>
              )}
              <button 
                className="pedido-detalle__btn pedido-detalle__btn--danger" 
                onClick={handleEliminarPedido}
                disabled={guardando}
              >
                🗑️ Eliminar Pedido
              </button>
              <button className="pedido-detalle__btn pedido-detalle__btn--secondary" onClick={onClose}>Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

