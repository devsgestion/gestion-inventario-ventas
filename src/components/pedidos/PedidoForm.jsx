import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import './PedidoForm.css';

export default function PedidoForm({ empresaId, onClose, onCreated }) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [canal, setCanal] = useState('WhatsApp');
  const [comentarios, setComentarios] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!clienteNombre.trim()) {
      newErrors.clienteNombre = 'El nombre del cliente es obligatorio';
    } else if (clienteNombre.trim().length < 3) {
      newErrors.clienteNombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (clienteTelefono && !/^\d{7,15}$/.test(clienteTelefono.replace(/[\s-]/g, ''))) {
      newErrors.clienteTelefono = 'Teléfono inválido (7-15 dígitos)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('pedidos').insert({
      empresa_id: empresaId,
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim() || null,
      canal,
      comentarios: comentarios.trim() || null,
      estado,
      usuario_id: (await supabase.auth.getUser()).data.user?.id || null,
    }).select();
    
    setLoading(false);
    
    if (!error && data && data[0]?.id) {
      if (onCreated) {
        onCreated(data[0].id);
      } else {
        onClose();
      }
    } else {
      setErrors({ submit: 'Error al crear pedido. Intenta nuevamente.' });
    }
  };

  return (
    <div className="pedido-form__modal" onClick={(e) => e.target.className.includes('pedido-form__modal') && onClose()}>
      <form onSubmit={handleSubmit} className="pedido-form">
        <div className="pedido-form__header">
          <h3>📝 Nuevo Pedido</h3>
          <button type="button" className="pedido-form__btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="pedido-form__body">
          {errors.submit && (
            <div className="pedido-form__alert pedido-form__alert--danger">
              {errors.submit}
            </div>
          )}

          <div className="pedido-form__group">
            <label htmlFor="clienteNombre">
              👤 Nombre del Cliente <span className="required">*</span>
            </label>
            <input 
              id="clienteNombre"
              type="text"
              value={clienteNombre} 
              onChange={(e) => {
                setClienteNombre(e.target.value);
                if (errors.clienteNombre) setErrors({...errors, clienteNombre: null});
              }}
              placeholder="Ej: Juan Pérez" 
              className={`pedido-form__input ${errors.clienteNombre ? 'pedido-form__input--error' : ''}`}
            />
            {errors.clienteNombre && (
              <span className="pedido-form__error">{errors.clienteNombre}</span>
            )}
          </div>

          <div className="pedido-form__group">
            <label htmlFor="clienteTelefono">📱 Teléfono</label>
            <input 
              id="clienteTelefono"
              type="tel"
              value={clienteTelefono} 
              onChange={(e) => {
                setClienteTelefono(e.target.value);
                if (errors.clienteTelefono) setErrors({...errors, clienteTelefono: null});
              }}
              placeholder="Ej: 3001234567" 
              className={`pedido-form__input ${errors.clienteTelefono ? 'pedido-form__input--error' : ''}`}
            />
            {errors.clienteTelefono && (
              <span className="pedido-form__error">{errors.clienteTelefono}</span>
            )}
          </div>

          <div className="pedido-form__group">
            <label htmlFor="canal">📢 Canal de Venta</label>
            <select id="canal" value={canal} onChange={(e) => setCanal(e.target.value)} className="pedido-form__select">
              <option value="WhatsApp">WhatsApp</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Tienda">Tienda Física</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="pedido-form__group">
            <label htmlFor="estado">🏷️ Estado del Pedido</label>
            <select id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="pedido-form__select">
              <option value="pendiente">⏳ Pendiente</option>
              <option value="confirmado">✅ Confirmado</option>
              <option value="entregado">📦 Entregado</option>
              <option value="cancelado">❌ Cancelado</option>
            </select>
          </div>

          <div className="pedido-form__group">
            <label htmlFor="comentarios">💬 Comentarios</label>
            <textarea 
              id="comentarios"
              value={comentarios} 
              onChange={(e) => setComentarios(e.target.value)} 
              placeholder="Observaciones o notas adicionales..."
              rows="3"
              className="pedido-form__textarea"
            />
          </div>
        </div>

        <div className="pedido-form__actions">
          <button type="button" className="pedido-form__btn pedido-form__btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="pedido-form__btn pedido-form__btn--primary" disabled={loading}>
            {loading ? '⏳ Guardando...' : '✅ Guardar y Continuar'}
          </button>
        </div>
      </form>
    </div>
  );
}
