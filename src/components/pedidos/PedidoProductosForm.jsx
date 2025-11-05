import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import './PedidoProductosForm.css';

// Función para formatear en pesos colombianos
const formatCOP = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

export default function PedidoProductosForm({ pedidoId, empresaId, onFinish, modoEdicion = false, nombreCliente = '' }) {
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [totalPersonalizado, setTotalPersonalizado] = useState(null);
  const [imagenesPedido, setImagenesPedido] = useState([]);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [editandoTotal, setEditandoTotal] = useState(false);
  const [searchTerms, setSearchTerms] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});

  useEffect(() => {
    if (!empresaId) return;
    supabase
      .from('productos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => setProductos(data || []));
  }, [empresaId]);

  const addItem = () => {
    setItems([...items, { 
      producto_id: '', 
      nombre_producto: '', 
      talla: '', 
      color: '', 
      cantidad: 1, 
      precio_unitario: 0, 
      tipo_venta: 'detal', 
      observaciones: '',
      es_conjunto: false
    }]);
  };

  const removeItem = (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    
    // Limpiar búsquedas del item eliminado
    const newSearchTerms = {...searchTerms};
    delete newSearchTerms[idx];
    setSearchTerms(newSearchTerms);
    
    const newShowSuggestions = {...showSuggestions};
    delete newShowSuggestions[idx];
    setShowSuggestions(newShowSuggestions);
  };

  const updateItem = (idx, field, value) => {
    const newItems = items.map((item, i) => {
      if (i === idx) {
        const updatedItem = { ...item, [field]: value };
        
        // Si se selecciona un producto, cargar sus datos
        if (field === 'producto_id') {
          const prod = productos.find(p => p.id === value);
          if (prod) {
            updatedItem.nombre_producto = prod.nombre;
            updatedItem.precio_unitario = prod.precio_venta;
          } else {
            updatedItem.nombre_producto = '';
            updatedItem.precio_unitario = 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setItems(newItems);
    
    // Limpiar error del item cuando se modifica
    if (errors[`item_${idx}`]) {
      const newErrors = {...errors};
      delete newErrors[`item_${idx}`];
      setErrors(newErrors);
    }
  };

  const addConjunto = () => {
    setItems([...items, {
      producto_id: null,
      nombre_producto: 'CONJUNTO',
      talla: '',
      color: '',
      cantidad: 1,
      precio_unitario: 0,
      tipo_venta: 'detal',
      observaciones: '',
      es_conjunto: true,
      productos_conjunto: [] // Array de productos que componen el conjunto
    }]);
  };

  const addProductoToConjunto = (itemIdx) => {
    const newItems = [...items];
    if (!newItems[itemIdx].productos_conjunto) {
      newItems[itemIdx].productos_conjunto = [];
    }
    newItems[itemIdx].productos_conjunto.push({
      producto_id: '',
      nombre_producto: '',
      cantidad: 1,
      precio_unitario: 0
    });
    setItems(newItems);
  };

  const removeProductoFromConjunto = (itemIdx, prodIdx) => {
    const newItems = [...items];
    newItems[itemIdx].productos_conjunto = newItems[itemIdx].productos_conjunto.filter((_, i) => i !== prodIdx);
    setItems(newItems);
  };

  const updateProductoConjunto = (itemIdx, prodIdx, field, value) => {
    const newItems = [...items];
    const producto = newItems[itemIdx].productos_conjunto[prodIdx];
    
    if (field === 'producto_id') {
      const prod = productos.find(p => p.id === value);
      if (prod) {
        producto.producto_id = value;
        producto.nombre_producto = prod.nombre;
        producto.precio_unitario = prod.precio_venta;
      }
    } else {
      producto[field] = value;
    }
    
    setItems(newItems);
  };

  const handleSearchChange = (itemIdx, prodIdx, value) => {
    const key = prodIdx !== undefined ? `${itemIdx}_${prodIdx}` : itemIdx;
    setSearchTerms({...searchTerms, [key]: value});
    setShowSuggestions({...showSuggestions, [key]: true});
  };

  const selectProductFromSearch = (itemIdx, prodIdx, producto) => {
    const key = prodIdx !== undefined ? `${itemIdx}_${prodIdx}` : itemIdx;
    
    if (prodIdx !== undefined) {
      // Es un producto dentro de un conjunto
      updateProductoConjunto(itemIdx, prodIdx, 'producto_id', producto.id);
      setSearchTerms({...searchTerms, [key]: producto.nombre});
    } else {
      // Es un producto individual
      updateItem(itemIdx, 'producto_id', producto.id);
      setSearchTerms({...searchTerms, [key]: producto.nombre});
    }
    
    setShowSuggestions({...showSuggestions, [key]: false});
  };

  const getFilteredProducts = (searchTerm) => {
    if (!searchTerm) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(term) ||
      p.referencia?.toLowerCase().includes(term)
    );
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSubiendoImagen(true);

    try {
      const uploadedImages = [];

      for (const file of files) {
        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`La imagen ${file.name} es muy grande. Máximo 5MB`);
          continue;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} no es una imagen válida`);
          continue;
        }

        // Generar nombre único
        const fileExt = file.name.split('.').pop();
        const fileName = `${pedidoId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `pedidos/${empresaId}/${fileName}`;

        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('imagenes-pedidos')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          alert(`Error al subir ${file.name}`);
          continue;
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('imagenes-pedidos')
          .getPublicUrl(filePath);

        uploadedImages.push({
          url: publicUrl,
          path: filePath,
          nombre: file.name
        });
      }

      setImagenesPedido([...imagenesPedido, ...uploadedImages]);
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al subir las imágenes');
    } finally {
      setSubiendoImagen(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleEliminarImagen = async (index) => {
    const imagen = imagenesPedido[index];
    
    try {
      // Eliminar de Storage si tiene path
      if (imagen.path) {
        await supabase.storage
          .from('imagenes-pedidos')
          .remove([imagen.path]);
      }

      // Eliminar del estado
      setImagenesPedido(imagenesPedido.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error eliminando imagen:', error);
    }
  };

  const validateItems = () => {
    const newErrors = {};
    
    if (items.length === 0) {
      newErrors.general = 'Debes agregar al menos un producto al pedido';
      setErrors(newErrors);
      return false;
    }

    items.forEach((item, idx) => {
      if (!item.es_conjunto && !item.producto_id) {
        newErrors[`item_${idx}`] = 'Selecciona un producto o márcalo como conjunto';
      }
      if (!item.cantidad || item.cantidad < 1) {
        newErrors[`item_${idx}`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.precio_unitario === null || item.precio_unitario === '' || item.precio_unitario < 0) {
        newErrors[`item_${idx}`] = 'El precio debe ser mayor o igual a 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateItems()) {
      return;
    }

    setLoading(true);
    let hasError = false;

    // Insertar items
    for (const item of items) {
      if (item.es_conjunto && item.productos_conjunto?.length > 0) {
        // Si es conjunto con productos, guardar la información estructurada
        const productosInfo = item.productos_conjunto.map(p => 
          `${p.nombre_producto} x${p.cantidad} (${formatCOP(p.precio_unitario)})`
        ).join(', ');
        
        const { error } = await supabase.from('items_pedido').insert({
          pedido_id: pedidoId,
          empresa_id: empresaId,
          producto_id: null,
          es_conjunto: true,
          productos_conjunto: item.productos_conjunto, // Guardamos el array completo
          nombre_producto: item.nombre_producto,
          talla: item.talla || null,
          color: item.color || null,
          cantidad: parseInt(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          tipo_venta: item.tipo_venta,
          observaciones: item.observaciones || `Productos: ${productosInfo}`,
        });
        
        if (error) {
          console.error('Error insertando conjunto:', error);
          hasError = true;
          break;
        }
      } else {
        // Producto individual
        const { error } = await supabase.from('items_pedido').insert({
          pedido_id: pedidoId,
          empresa_id: empresaId,
          producto_id: item.es_conjunto ? null : item.producto_id,
          nombre_producto: item.nombre_producto,
          talla: item.talla || null,
          color: item.color || null,
          cantidad: parseInt(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          tipo_venta: item.tipo_venta,
          observaciones: item.observaciones || null,
        });
        
        if (error) {
          console.error('Error insertando item:', error);
          hasError = true;
          break;
        }
      }
    }
    
    // Actualizar el total del pedido
    if (!hasError) {
      const totalFinal = totalPersonalizado !== null && !editandoTotal
        ? parseFloat(totalPersonalizado)
        : calcularTotalAutomatico();
      
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ 
          total_pedido: totalFinal,
          imagenes: imagenesPedido // Guardar imágenes en el pedido
        })
        .eq('id', pedidoId);
      
      if (updateError) {
        console.error('Error actualizando total del pedido:', updateError);
        setErrors({ submit: 'Error al actualizar el total del pedido' });
        hasError = true;
      }
    }
    
    setLoading(false);
    
    if (!hasError) {
      setShowSuccess(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 1500);
    } else {
      if (!errors.submit) {
        setErrors({ submit: 'Error al guardar productos. Intenta nuevamente.' });
      }
    }
  };

  const calcularTotalAutomatico = () => {
    return items.reduce((acc, item) => {
      return acc + (parseFloat(item.precio_unitario || 0) * parseInt(item.cantidad || 0));
    }, 0);
  };

  const getTotalMostrar = () => {
    if (totalPersonalizado !== null && editandoTotal) {
      return totalPersonalizado;
    }
    if (totalPersonalizado !== null && !editandoTotal) {
      return parseFloat(totalPersonalizado);
    }
    return calcularTotalAutomatico();
  };

  const handleEditarTotal = () => {
    setEditandoTotal(true);
    setTotalPersonalizado(calcularTotalAutomatico());
  };

  const handleGuardarTotal = () => {
    setEditandoTotal(false);
  };

  const handleCancelarEdicionTotal = () => {
    setEditandoTotal(false);
    setTotalPersonalizado(null);
  };

  if (showSuccess) {
    return (
      <div className="productos-form__modal">
        <div className="productos-form__success">
          <div className="productos-form__success-icon">✅</div>
          <h3>{modoEdicion ? '¡Productos agregados exitosamente!' : '¡Pedido creado exitosamente!'}</h3>
          <p>{modoEdicion ? 'Los nuevos productos se han agregado al pedido' : 'Los productos se han agregado al pedido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="productos-form__modal" onClick={(e) => e.target.className.includes('productos-form__modal') && onFinish()}>
      <form onSubmit={handleSubmit} className="pedido-productos-form">
        <div className="productos-form__header">
          <h3>🛍️ {modoEdicion ? `Agregar más productos - ${nombreCliente}` : 'Agregar Productos al Pedido'}</h3>
          <button type="button" className="productos-form__btn-close" onClick={onFinish}>✕</button>
        </div>

        {modoEdicion && (
          <div className="productos-form__alert productos-form__alert--info">
            ℹ️ Estás agregando productos adicionales a un pedido existente
          </div>
        )}

        {errors.general && (
          <div className="productos-form__alert productos-form__alert--danger">{errors.general}</div>
        )}
        {errors.submit && (
          <div className="productos-form__alert productos-form__alert--danger">{errors.submit}</div>
        )}

        <div className="productos-form__list">
          {items.map((item, idx) => (
            <div key={idx} className={`producto-item-form ${errors[`item_${idx}`] ? 'has-error' : ''} ${item.es_conjunto ? 'es-conjunto' : ''}`}>
              <div className="productos-form__item-header">
                <span className="productos-form__item-number">
                  {item.es_conjunto ? '📦 CONJUNTO' : `#${idx + 1}`}
                </span>
                <button 
                  type="button" 
                  className="productos-form__btn-remove" 
                  onClick={() => removeItem(idx)}
                  title="Eliminar producto"
                >
                  🗑️
                </button>
              </div>

              {errors[`item_${idx}`] && (
                <div className="productos-form__error-message">{errors[`item_${idx}`]}</div>
              )}

              {item.es_conjunto ? (
                <>
                  <div className="productos-form__group">
                    <label>Nombre del Conjunto *</label>
                    <input 
                      className="productos-form__input"
                      type="text"
                      value={item.nombre_producto} 
                      onChange={e => updateItem(idx, 'nombre_producto', e.target.value)} 
                      placeholder="Ej: Conjunto deportivo, Outfit completo" 
                    />
                  </div>

                  <div className="productos-form__conjunto-section">
                    <div className="productos-form__section-header">
                      <label>Productos del Conjunto</label>
                      <button 
                        type="button" 
                        className="productos-form__btn-add-small"
                        onClick={() => addProductoToConjunto(idx)}
                      >
                        ➕ Agregar producto
                      </button>
                    </div>

                    {item.productos_conjunto?.map((prodConjunto, prodIdx) => {
                      const searchKey = `${idx}_${prodIdx}`;
                      const searchTerm = searchTerms[searchKey] || '';
                      const filteredProds = getFilteredProducts(searchTerm);
                      
                      return (
                        <div key={prodIdx} className="productos-form__conjunto-item">
                          <div className="productos-form__conjunto-header">
                            <span className="productos-form__conjunto-number">Producto #{prodIdx + 1}</span>
                            <button 
                              type="button" 
                              className="productos-form__btn-remove-small"
                              onClick={() => removeProductoFromConjunto(idx, prodIdx)}
                            >
                              ✕
                            </button>
                          </div>

                          <div className="productos-form__group productos-form__autocomplete">
                            <label>Buscar Producto *</label>
                            <input 
                              className="productos-form__search-input"
                              type="text"
                              value={searchTerm}
                              onChange={(e) => handleSearchChange(idx, prodIdx, e.target.value)}
                              onFocus={() => setShowSuggestions({...showSuggestions, [searchKey]: true})}
                              placeholder="Escribe para buscar..."
                            />
                            {showSuggestions[searchKey] && searchTerm && (
                              <div className="productos-form__suggestions">
                                {filteredProds.length > 0 ? (
                                  filteredProds.slice(0, 10).map(p => (
                                    <div 
                                      key={p.id}
                                      className="productos-form__suggestion"
                                      onClick={() => selectProductFromSearch(idx, prodIdx, p)}
                                    >
                                      <div className="productos-form__suggestion-name">{p.nombre}</div>
                                      <div className="productos-form__suggestion-price">{formatCOP(p.precio_venta)}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="productos-form__suggestion productos-form__suggestion--empty">
                                    No se encontraron productos
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="productos-form__row productos-form__row--compact">
                            <div className="productos-form__group">
                              <label>Cantidad</label>
                              <input 
                                className="productos-form__input"
                                type="number"
                                value={prodConjunto.cantidad}
                                min={1}
                                onChange={(e) => updateProductoConjunto(idx, prodIdx, 'cantidad', e.target.value)}
                              />
                            </div>
                            <div className="productos-form__group">
                              <label>Precio</label>
                              <div className="productos-form__price-display">
                                {formatCOP(prodConjunto.precio_unitario)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="productos-form__row">
                    <div className="productos-form__group">
                      <label>Talla</label>
                      <input 
                        className="productos-form__input"
                        value={item.talla} 
                        onChange={e => updateItem(idx, 'talla', e.target.value)} 
                        placeholder="Ej: M, L, XL" 
                      />
                    </div>
                    <div className="productos-form__group">
                      <label>Color</label>
                      <input 
                        className="productos-form__input"
                        value={item.color} 
                        onChange={e => updateItem(idx, 'color', e.target.value)} 
                        placeholder="Ej: Rojo, Azul" 
                      />
                    </div>
                  </div>
                  <div className="productos-form__row">
                    <div className="productos-form__group">
                      <label>Cantidad de Conjuntos *</label>
                      <input className="productos-form__input" type="number" value={item.cantidad} 
                        min={1} 
                        onChange={e => updateItem(idx, 'cantidad', e.target.value)} 
                      />
                    </div>
                    <div className="productos-form__group">
                      <label>Precio del Conjunto *</label>
                      <input className="productos-form__input" type="number" value={item.precio_unitario} 
                        min={0} 
                        step="100"
                        onChange={e => updateItem(idx, 'precio_unitario', e.target.value)} 
                        placeholder="Precio total del conjunto"
                      />
                      <div className="productos-form__price-helper">{formatCOP(item.precio_unitario)}</div>
                    </div>
                  </div>
                  <div className="productos-form__group">
                    <label>Observaciones adicionales</label>
                    <textarea
                      className="productos-form__textarea"
                      value={item.observaciones} 
                      onChange={e => updateItem(idx, 'observaciones', e.target.value)} 
                      placeholder="Notas adicionales sobre el conjunto..."
                      rows="2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="productos-form__row">
                    <div className="productos-form__group productos-form__autocomplete">
                      <label>Producto *</label>
                      <input 
                        type="text"
                        value={searchTerms[idx] || ''}
                        onChange={(e) => handleSearchChange(idx, undefined, e.target.value)}
                        onFocus={() => setShowSuggestions({...showSuggestions, [idx]: true})}
                        placeholder="Escribe para buscar un producto..."
                        className={`productos-form__search-input ${!item.producto_id && errors[`item_${idx}`] ? 'productos-form__input--error' : ''}`}
                      />
                      {showSuggestions[idx] && searchTerms[idx] && (
                        <div className="productos-form__suggestions">
                          {getFilteredProducts(searchTerms[idx]).length > 0 ? (
                            getFilteredProducts(searchTerms[idx]).slice(0, 10).map(p => (
                              <div 
                                key={p.id}
                                className="productos-form__suggestion"
                                onClick={() => selectProductFromSearch(idx, undefined, p)}
                              >
                                <div className="productos-form__suggestion-name">{p.nombre}</div>
                                <div className="productos-form__suggestion-price">{formatCOP(p.precio_venta)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="productos-form__suggestion productos-form__suggestion--empty">
                              No se encontraron productos
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="productos-form__row">
                    <div className="productos-form__group">
                      <label>Talla</label>
                      <input 
                        className="productos-form__input"
                        value={item.talla} 
                        onChange={e => updateItem(idx, 'talla', e.target.value)} 
                        placeholder="Ej: M, L, XL" 
                      />
                    </div>
                    <div className="productos-form__group">
                      <label>Color</label>
                      <input 
                        className="productos-form__input"
                        value={item.color} 
                        onChange={e => updateItem(idx, 'color', e.target.value)} 
                        placeholder="Ej: Rojo, Azul" 
                      />
                    </div>
                  </div>

                  <div className="productos-form__row">
                    <div className="productos-form__group">
                      <label>Cantidad *</label>
                      <input 
                        type="number" 
                        value={item.cantidad} 
                        min={1} 
                        onChange={e => updateItem(idx, 'cantidad', e.target.value)} 
                        className={`productos-form__input ${(!item.cantidad || item.cantidad < 1) && errors[`item_${idx}`] ? 'productos-form__input--error' : ''}`}
                      />
                    </div>
                    <div className="productos-form__group">
                      <label>Precio Unitario *</label>
                      <div className="productos-form__price-display productos-form__price-display--large">
                        {formatCOP(item.precio_unitario)}
                      </div>
                    </div>
                    <div className="productos-form__group">
                      <label>Tipo Venta</label>
                      <select 
                        className="productos-form__select"
                        value={item.tipo_venta} 
                        onChange={e => updateItem(idx, 'tipo_venta', e.target.value)}
                      >
                        <option value="detal">Detal</option>
                        <option value="mayorista">Mayorista</option>
                      </select>
                    </div>
                  </div>

                  <div className="productos-form__group">
                    <label>Observaciones</label>
                    <input 
                      className="productos-form__input"
                      value={item.observaciones} 
                      onChange={e => updateItem(idx, 'observaciones', e.target.value)} 
                      placeholder="Notas adicionales..." 
                    />
                  </div>
                </>
              )}

              <div className="productos-form__item-subtotal">
                Subtotal: {formatCOP(parseFloat(item.precio_unitario || 0) * parseInt(item.cantidad || 0))}
              </div>
            </div>
          ))}
        </div>

        <div className="productos-form__add-buttons">
          <button type="button" className="productos-form__btn productos-form__btn--secondary productos-form__btn--add-product" onClick={addItem}>
            ➕ Agregar Producto
          </button>
          <button type="button" className="productos-form__btn productos-form__btn--conjunto productos-form__btn--add-product" onClick={addConjunto}>
            📦 Agregar Conjunto
          </button>
        </div>

        {items.length > 0 && (
          <div className="productos-form__total">
            <div className="productos-form__total-row">
              <strong>Total del Pedido:</strong>
              {editandoTotal ? (
                <div className="productos-form__total-edit">
                  <input 
                    type="number" 
                    className="productos-form__total-input"
                    value={totalPersonalizado || ''} 
                    onChange={(e) => setTotalPersonalizado(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                  <button type="button" className="pedido-detalle__btn-icon" onClick={handleGuardarTotal} title="Guardar">✅</button>
                  <button type="button" className="pedido-detalle__btn-icon" onClick={handleCancelarEdicionTotal} title="Cancelar">❌</button>
                </div>
              ) : (
                <div className="productos-form__total-display">
                  <span className="productos-form__total-amount">{formatCOP(getTotalMostrar())}</span>
                  <button type="button" className="pedido-detalle__btn-icon" onClick={handleEditarTotal} title="Editar total">✏️</button>
                </div>
              )}
            </div>
            {totalPersonalizado !== null && !editandoTotal && (
              <div className="productos-form__total-info">
                💡 Total personalizado (calculado: {formatCOP(calcularTotalAutomatico())})
              </div>
            )}
          </div>
        )}

        {/* Sección de imágenes */}
        <div className="productos-form__imagenes-section">
          <h3 className="productos-form__imagenes-title">📷 Imágenes de Referencia</h3>
          <p className="productos-form__imagenes-subtitle">Adjunta imágenes para mayor claridad del pedido</p>
          
          <div className="productos-form__imagenes-upload">
            <input 
              type="file" 
              id="imageUpload"
              className="productos-form__imagenes-input"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={subiendoImagen}
            />
            <label 
              htmlFor="imageUpload" 
              className={`productos-form__imagenes-label ${subiendoImagen ? 'productos-form__imagenes-label--disabled' : ''}`}
            >
              {subiendoImagen ? '⏳ Subiendo...' : '📁 Seleccionar Imágenes'}
            </label>
            <span className="productos-form__imagenes-hint">Máximo 5MB por imagen</span>
          </div>

          {imagenesPedido.length > 0 && (
            <div className="productos-form__imagenes-grid">
              {imagenesPedido.map((imagen, index) => (
                <div key={index} className="productos-form__imagen-item">
                  <img 
                    src={imagen.url} 
                    alt={`Referencia ${index + 1}`}
                    className="productos-form__imagen-preview"
                  />
                  <button
                    type="button"
                    className="productos-form__imagen-delete"
                    onClick={() => handleEliminarImagen(index)}
                    title="Eliminar imagen"
                  >
                    🗑️
                  </button>
                  <span className="productos-form__imagen-nombre">{imagen.nombre}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="productos-form__actions">
          <button type="button" className="productos-form__btn productos-form__btn--secondary" onClick={onFinish}>
            Cancelar
          </button>
          <button type="submit" className="productos-form__btn productos-form__btn--primary" disabled={loading || items.length === 0}>
            {loading ? '⏳ Guardando...' : modoEdicion ? '✅ Agregar Productos' : '✅ Finalizar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}























