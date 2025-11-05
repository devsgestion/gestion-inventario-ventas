import React, { useState } from 'react';
import PedidoForm from '../components/pedidos/PedidoForm';
import PedidoDetalle from '../components/pedidos/PedidoDetalle';
import PedidoProductosForm from '../components/pedidos/PedidoProductosForm';
import { usePedidos } from '../hooks/usePedidos';
import useAuth from '../hooks/useAuth';
import './PedidosPage.css';

export default function PedidosPage() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresa_id;
  const { pedidos, refetch } = usePedidos(empresaId);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(null);
  const [showProductosForm, setShowProductosForm] = useState(false);
  const [pedidoParaAgregarProductos, setPedidoParaAgregarProductos] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const handlePedidoCreado = (pedidoId) => {
    setPedidoCreado(pedidoId);
    setShowForm(false);
    setShowProductosForm(true);
  };

  const handleProductosFinalizados = () => {
    setShowProductosForm(false);
    setPedidoCreado(null);
    setPedidoParaAgregarProductos(null);
    refetch();
  };

  const handleAgregarProductos = (pedido) => {
    setPedidoParaAgregarProductos(pedido);
    setSelectedPedido(null);
    setShowProductosForm(true);
  };

  const pedidosFiltrados = filtroEstado === 'todos' 
    ? pedidos 
    : pedidos.filter(p => p.estado === filtroEstado);

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
      case 'pendiente': return '⏳ Pendiente';
      case 'en_proceso': return '🔨 En Proceso';
      case 'en_viaje': return '🚚 En Viaje';
      case 'entregado': return '✅ Entregado';
      case 'cancelado': return '❌ Cancelado';
      default: return estado;
    }
  };

  return (
    <div className="p-pedidos">
      <div className="p-pedidos__header">
        <div>
          <h2>📦 Gestor de Pedidos</h2>
          <p className="p-pedidos__subtitle">Gestiona y organiza todos tus pedidos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="pedidos-page__btn pedidos-page__btn--primary">
          ➕ Nuevo Pedido
        </button>
      </div>

      <div className="p-pedidos__filters">
        <label>Filtrar por estado:</label>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="p-pedidos__filter-select">
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div className="p-pedidos__empty">
          <p>📋 No hay pedidos registrados</p>
          <button onClick={() => setShowForm(true)} className="pedidos-page__btn pedidos-page__btn--primary">
            Crear tu primer pedido
          </button>
        </div>
      ) : (
        <ul className="p-pedidos__list">
          {pedidosFiltrados.map(p => (
            <li key={p.id} onClick={() => setSelectedPedido(p)} className="p-pedidos__item">
              <div className="p-pedidos__item-header">
                <h4>👤 {p.cliente_nombre}</h4>
                <span className={`pedidos-page__badge pedidos-page__badge--${getEstadoBadgeClass(p.estado).replace('badge-', '')}`}>
                  {getEstadoTexto(p.estado)}
                </span>
              </div>
              <div className="p-pedidos__item-info">
                <span>📱 {p.cliente_telefono || 'Sin teléfono'}</span>
                <span>📢 {p.canal}</span>
                {p.created_at && <span>📅 {new Date(p.created_at).toLocaleDateString()}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <PedidoForm 
          empresaId={empresaId} 
          onClose={() => setShowForm(false)} 
          onCreated={handlePedidoCreado} 
        />
      )}
      {showProductosForm && (pedidoCreado || pedidoParaAgregarProductos) && (
        <PedidoProductosForm 
          pedidoId={pedidoCreado || pedidoParaAgregarProductos.id} 
          empresaId={empresaId} 
          onFinish={handleProductosFinalizados}
          modoEdicion={!!pedidoParaAgregarProductos}
          nombreCliente={pedidoParaAgregarProductos?.cliente_nombre}
        />
      )}
      {selectedPedido && (
        <PedidoDetalle 
          pedido={selectedPedido} 
          onClose={() => {
            setSelectedPedido(null);
            refetch();
          }}
          onAddProducts={handleAgregarProductos}
        />
      )}
    </div>
  );
}
