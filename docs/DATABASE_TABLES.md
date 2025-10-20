# 🗃️ Estructura de Tablas - GestiON Database

## 🏗️ Arquitectura General

**Base de Datos:** Supabase (PostgreSQL)
**Patrón:** Multi-tenant (Una instancia, múltiples empresas)
**Autenticación:** Supabase Auth + Row Level Security (RLS)

---

## 📋 TABLAS PRINCIPALES

### 1. **empresas** 
```sql
CREATE TABLE public.empresas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    owner_id UUID NULL,
    plan_activo VARCHAR(50) NOT NULL DEFAULT 'basico',
    created_at TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
    CONSTRAINT empresas_pkey PRIMARY KEY (id),
    CONSTRAINT empresas_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Tabla maestra de empresas/negocios
**🔑 Características:**
- `owner_id`: Usuario propietario de la empresa
- `plan_activo`: Control de planes de suscripción
- Timestamps automáticos con zona horaria UTC

---

### 2. **perfiles**
```sql
CREATE TABLE public.perfiles (
    id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'vendedor',
    empresa_id UUID NOT NULL,
    updated_at TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
    is_admin BOOLEAN NULL DEFAULT false,
    CONSTRAINT perfiles_pkey PRIMARY KEY (id),
    CONSTRAINT perfiles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Perfiles de usuario vinculados a Supabase Auth
**🔑 Características:**
- `rol`: Sistema de roles ('vendedor', 'admin', etc.)
- `is_admin`: Flag para permisos administrativos
- Relación directa con auth.users

---

### 3. **productos**
```sql
CREATE TABLE public.productos (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    codigo_referencia VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    precio_costo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    alerta_stock_min INTEGER NULL DEFAULT 5,
    created_at TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
    CONSTRAINT productos_pkey PRIMARY KEY (id),
    CONSTRAINT productos_empresa_id_codigo_referencia_key UNIQUE (empresa_id, codigo_referencia),
    CONSTRAINT productos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id)
);
```
**📝 Descripción:** Inventario de productos por empresa
**🔑 Características:** 
- `precio_costo`: Costo Promedio Ponderado (CPP)
- `codigo_referencia`: Único por empresa (no globalmente)
- `descripcion`: Campo opcional para detalles adicionales
- Control de stock con alertas mínimas

---

### 4. **estado_caja**
```sql
CREATE TABLE public.estado_caja (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    fecha_apertura DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'ABIERTA',
    usuario_apertura_id UUID NULL,
    usuario_cierre_id UUID NULL,
    monto_inicial NUMERIC(10,2) NULL DEFAULT 0.00,
    CONSTRAINT estado_caja_pkey PRIMARY KEY (id),
    CONSTRAINT estado_caja_empresa_id_key UNIQUE (empresa_id),
    CONSTRAINT estado_caja_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT estado_caja_usuario_apertura_id_fkey FOREIGN KEY (usuario_apertura_id) REFERENCES auth.users (id),
    CONSTRAINT estado_caja_usuario_cierre_id_fkey FOREIGN KEY (usuario_cierre_id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Estado actual de la caja por empresa
**🔑 Características:**
- Una caja por empresa (UNIQUE empresa_id)
- Control de apertura/cierre diario
- Estados: 'ABIERTA', 'CERRADA'
- Tracking de usuarios responsables

---

### 5. **ventas**
```sql
CREATE TABLE public.ventas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    fecha_venta TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
    total_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    usuario_id UUID NULL,
    estado VARCHAR(50) NULL DEFAULT 'completada',
    CONSTRAINT ventas_pkey PRIMARY KEY (id),
    CONSTRAINT ventas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT ventas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Registro de ventas realizadas
**🔑 Características:**
- `estado`: Control de estado de ventas ('completada', 'pendiente', 'cancelada')
- Timestamp automático con zona horaria UTC
- Vinculado al usuario que realizó la venta

---

### 6. **detalle_venta**
```sql
CREATE TABLE public.detalle_venta (
    id BIGSERIAL NOT NULL,
    venta_id UUID NULL,
    producto_id UUID NOT NULL,
    empresa_id UUID NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT detalle_venta_pkey PRIMARY KEY (id),
    CONSTRAINT detalle_venta_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT detalle_venta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT detalle_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE
);
```
**📝 Descripción:** Detalle de productos vendidos en cada venta
**🔑 Características:**
- `id`: BIGSERIAL para alto volumen de transacciones
- `costo_unitario`: CPP al momento de la venta (para cálculo de utilidad)
- `precio_unitario`: Precio de venta al momento de la transacción
- CASCADE DELETE al eliminar venta
- Redundancia de `empresa_id` para optimización de consultas

---

### 7. **movimientos_inventario**
```sql
CREATE TABLE public.movimientos_inventario (
    id BIGSERIAL NOT NULL,
    empresa_id UUID NOT NULL,
    producto_id UUID NOT NULL,
    usuario_id UUID NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    cantidad_cambio INTEGER NOT NULL,
    razon TEXT NULL,
    fecha TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
    CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id),
    CONSTRAINT movimientos_inventario_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Historial de todos los movimientos de inventario
**🔑 Características:**
- `tipo_movimiento`: 'COMPRA', 'VENTA', 'AJUSTE', 'MERMA', etc.
- `cantidad_cambio`: Positivo para entradas, negativo para salidas
- `razon`: Texto libre para justificar el movimiento
- Trazabilidad completa de stock
- BIGSERIAL para alto volumen de movimientos

---

### 8. **cierres_caja**
```sql
CREATE TABLE public.cierres_caja (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    fecha_cierre DATE NOT NULL DEFAULT CURRENT_DATE,
    total_ingresos NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_transacciones INTEGER NOT NULL DEFAULT 0,
    usuario_cierre_id UUID NULL,
    CONSTRAINT cierres_caja_pkey PRIMARY KEY (id),
    CONSTRAINT cierres_caja_empresa_id_fecha_cierre_key UNIQUE (empresa_id, fecha_cierre),
    CONSTRAINT cierres_caja_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    CONSTRAINT cierres_caja_usuario_cierre_id_fkey FOREIGN KEY (usuario_cierre_id) REFERENCES auth.users (id)
);
```
**📝 Descripción:** Historial de cierres de caja diarios
**🔑 Características:**
- Un cierre por día por empresa (UNIQUE empresa_id, fecha_cierre)
- Resumen financiero del día
- Usuario responsable del cierre
- Timestamps automáticos

---

## 🔗 DIAGRAMA DE RELACIONES

```
auth.users (Supabase)
    ↓
perfiles ← empresas (owner_id)
    ↓       ↓
    ↓   productos
    ↓       ↓
    ↓   movimientos_inventario
    ↓       ↓
    ↓   ventas → detalle_venta
    ↓       ↓
    ↓   estado_caja
    ↓       ↓
    ↓   cierres_caja
```

## 📊 ÍNDICES PARA PERFORMANCE

```sql
-- Índices críticos para consultas frecuentes
CREATE INDEX idx_productos_empresa_id ON productos(empresa_id);
CREATE INDEX idx_productos_empresa_codigo ON productos(empresa_id, codigo_referencia);
CREATE INDEX idx_ventas_empresa_fecha ON ventas(empresa_id, fecha_venta);
CREATE INDEX idx_detalle_venta_venta_id ON detalle_venta(venta_id);
CREATE INDEX idx_detalle_venta_producto_id ON detalle_venta(producto_id);
CREATE INDEX idx_movimientos_producto_fecha ON movimientos_inventario(producto_id, fecha);
CREATE INDEX idx_movimientos_empresa_tipo ON movimientos_inventario(empresa_id, tipo_movimiento);
```

## 🔄 TRIGGERS IMPLEMENTADOS

```sql
-- Actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_perfiles_updated_at
    BEFORE UPDATE ON perfiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 📈 VISTAS ÚTILES

```sql
-- Vista de productos con alertas
CREATE VIEW vista_productos_con_alertas AS
SELECT 
    p.*,
    CASE WHEN p.stock_actual <= p.alerta_stock_min THEN true ELSE false END as necesita_restock,
    (p.precio_venta - p.precio_costo) as margen_unitario,
    CASE 
        WHEN p.precio_costo > 0 THEN 
            ROUND(((p.precio_venta - p.precio_costo) / p.precio_costo * 100), 2)
        ELSE 0 
    END as margen_porcentaje
FROM productos p;

-- Vista de resumen diario
CREATE VIEW vista_resumen_diario AS
SELECT 
    v.empresa_id,
    DATE(v.fecha_venta AT TIME ZONE 'America/Bogota') as fecha,
    COUNT(v.id) as transacciones,
    SUM(v.total_venta) as ingresos_brutos,
    SUM(dv.cantidad * dv.costo_unitario) as costos_totales,
    SUM(v.total_venta) - SUM(dv.cantidad * dv.costo_unitario) as utilidad_neta
FROM ventas v
LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
GROUP BY v.empresa_id, DATE(v.fecha_venta AT TIME ZONE 'America/Bogota');
```

---

**📝 Última actualización:** 2024-12-19
**👤 Mantenido por:** Equipo de Desarrollo GestiON
**🔢 Versión del Schema:** 1.1.0
