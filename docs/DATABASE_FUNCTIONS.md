# ⚙️ Funciones RPC - GestiON Database

## 🎯 Arquitectura de Funciones

**Lenguaje:** PL/pgSQL
**Patrón:** Remote Procedure Calls (RPC)
**Seguridad:** Row Level Security + SECURITY DEFINER
**Zona Horaria:** America/Bogota para consistency temporal

---

## 🏗️ FUNCIONES DE SETUP Y USUARIOS

### 1. **create_tenant_and_profile** ⭐ CORE SETUP
```sql
CREATE OR REPLACE FUNCTION public.create_tenant_and_profile(
    user_id_input UUID, 
    email_input TEXT, 
    nombre_usuario_input VARCHAR, 
    nombre_empresa_input VARCHAR
) RETURNS VOID AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- 1. Crear la nueva EMPRESA (TENANT)
    INSERT INTO public.empresas (nombre, owner_id)
    VALUES (nombre_empresa_input, user_id_input)
    RETURNING id INTO new_tenant_id;

    -- 2. Crear el PERFIL del usuario (como ADMINISTRADOR)
    INSERT INTO public.perfiles (id, nombre, rol, empresa_id)
    VALUES (user_id_input, nombre_usuario_input, 'administrador', new_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
**🎯 Propósito:** Registro de nuevas empresas y creación del primer administrador
**📥 Parámetros:**
- `user_id_input`: UUID del usuario de Supabase Auth
- `email_input`: Email del administrador  
- `nombre_usuario_input`: Nombre del administrador
- `nombre_empresa_input`: Nombre del negocio

**🔄 Flujo:**
1. Crea empresa con el usuario como owner
2. Crea perfil de administrador vinculado a la empresa
3. Establece permisos administrativos

---

### 2. **add_profile_to_tenant** 👥 GESTIÓN DE EMPLEADOS
```sql
CREATE OR REPLACE FUNCTION public.add_profile_to_tenant(
    user_id_input UUID, 
    email_input TEXT, 
    nombre_usuario_input VARCHAR, 
    empresa_id_input UUID
) RETURNS VOID AS $$
BEGIN
    -- Crear el PERFIL del nuevo usuario (rol por defecto: 'vendedor')
    INSERT INTO public.perfiles (id, nombre, rol, empresa_id)
    VALUES (user_id_input, nombre_usuario_input, 'vendedor', empresa_id_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
**🎯 Propósito:** Agregar empleados/vendedores a una empresa existente
**📥 Parámetros:**
- `user_id_input`: UUID del nuevo empleado
- `empresa_id_input`: UUID de la empresa existente

---

## 📦 FUNCIONES DE INVENTARIO

### 3. **registrar_compra** 🛒 GESTIÓN DE STOCK
```sql
CREATE OR REPLACE FUNCTION public.registrar_compra(
    p_empresa_id UUID,
    p_producto_id UUID,
    p_cantidad_ingreso INTEGER,
    p_costo_compra NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_stock_antiguo INTEGER;
    v_cpp_antiguo NUMERIC;
    v_nuevo_cpp NUMERIC;
BEGIN
    -- 1. Obtener Stock y CPP actual (Bloqueado para concurrencia)
    SELECT stock_actual, precio_costo
    INTO v_stock_antiguo, v_cpp_antiguo
    FROM public.productos
    WHERE id = p_producto_id
    FOR UPDATE;

    -- 2. Calcular el NUEVO Costo Promedio Ponderado (CPP)
    v_nuevo_cpp := 
        ROUND(
            ( (v_stock_antiguo * v_cpp_antiguo) + (p_cantidad_ingreso * p_costo_compra) ) / 
            ( v_stock_antiguo + p_cantidad_ingreso ), 2
        );

    -- 3. Actualizar el producto: Stock y nuevo CPP
    UPDATE public.productos
    SET 
        stock_actual = v_stock_antiguo + p_cantidad_ingreso,
        precio_costo = v_nuevo_cpp
    WHERE id = p_producto_id;
    
    -- 4. Registrar Movimiento de Inventario
    INSERT INTO public.movimientos_inventario (empresa_id, producto_id, tipo_movimiento, cantidad_cambio, razon)
    VALUES (p_empresa_id, p_producto_id, 'COMPRA', p_cantidad_ingreso, 'Ingreso por nueva compra (CPP calculado)');

    RETURN jsonb_build_object('message', 'Compra registrada y CPP ajustado', 'nuevo_cpp', v_nuevo_cpp);
END;
$$ LANGUAGE plpgsql;
```
**🎯 Propósito:** Registro de compras con cálculo automático de CPP
**📥 Parámetros:**
- `p_empresa_id`: UUID de la empresa
- `p_producto_id`: UUID del producto  
- `p_cantidad_ingreso`: Cantidad comprada
- `p_costo_compra`: Costo unitario de esta compra

**🔑 Características Técnicas:**
- **FOR UPDATE**: Bloqueo de fila para evitar condiciones de carrera
- **Cálculo CPP**: Costo Promedio Ponderado automático
- **Trazabilidad**: Registro automático en movimientos_inventario
- **Control de concurrencia**: Thread-safe para múltiples usuarios

**📤 Retorna:** JSON con mensaje de éxito y nuevo CPP calculado

---

## 🛒 FUNCIONES DE VENTAS

### 4. **registrar_venta** 💰 PROCESAMIENTO DE VENTAS
```sql
CREATE OR REPLACE FUNCTION public.registrar_venta(
    p_empresa_id UUID,
    p_usuario_id UUID,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_venta_id UUID;
    v_total_venta NUMERIC(10, 2) := 0.00;
    v_fecha_local TIMESTAMPTZ := now() AT TIME ZONE 'America/Bogota';
    v_item RECORD;
BEGIN
    -- 1. Calcular el total de la venta
    SELECT COALESCE(
        SUM(ROUND( (item->>'cantidad')::NUMERIC * (item->>'precio_unitario')::NUMERIC, 2)), 0
    ) INTO v_total_venta
    FROM jsonb_array_elements(p_items) AS item(item);

    -- 2. Registrar la Venta
    INSERT INTO public.ventas (empresa_id, usuario_id, total_venta, fecha_venta)
    VALUES (p_empresa_id, p_usuario_id, v_total_venta, v_fecha_local)
    RETURNING id INTO v_venta_id;

    -- 3. Iterar sobre el detalle, actualizar stock y registrar movimientos
    FOR v_item IN SELECT item FROM jsonb_array_elements(p_items) AS item(item)
    LOOP
        -- 3a. Registrar el Detalle
        INSERT INTO public.detalle_venta (venta_id, producto_id, empresa_id, cantidad, precio_unitario, costo_unitario)
        VALUES (
            v_venta_id, 
            (v_item.item->>'producto_id')::UUID, 
            p_empresa_id, 
            (v_item.item->>'cantidad')::INTEGER, 
            (v_item.item->>'precio_unitario')::NUMERIC, 
            (v_item.item->>'costo_unitario')::NUMERIC
        );

        -- 3b. Restar del Inventario 
        UPDATE public.productos
        SET stock_actual = stock_actual - (v_item.item->>'cantidad')::INTEGER
        WHERE id = (v_item.item->>'producto_id')::UUID; 

        -- 3c. Registrar Movimiento
        INSERT INTO public.movimientos_inventario (empresa_id, producto_id, usuario_id, tipo_movimiento, cantidad_cambio, razon, fecha)
        VALUES (
            p_empresa_id, (v_item.item->>'producto_id')::UUID, p_usuario_id, 'VENTA', 
            -(v_item.item->>'cantidad')::INTEGER, 'Venta Registrada: ' || v_venta_id, v_fecha_local
        );
    END LOOP;

    RETURN jsonb_build_object('venta_id', v_venta_id, 'total', v_total_venta);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fallo la transacción de venta: %', SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```
**🎯 Propósito:** Procesamiento completo de ventas desde el POS
**📥 Parámetros:**
- `p_empresa_id`: UUID de la empresa
- `p_usuario_id`: UUID del vendedor
- `p_items`: JSON array con productos vendidos

**🔄 Flujo Transaccional:**
1. Calcula total de la venta
2. Crea registro en tabla `ventas`
3. Para cada producto:
   - Inserta detalle con CPP histórico
   - Actualiza stock (resta cantidad)
   - Registra movimiento de inventario
4. Retorna ID de venta y total

**🛡️ Manejo de Errores:** Transacción completa con rollback automático

---

## 📊 FUNCIONES DE REPORTES

### 5. **get_ventas_del_dia** 📈 DASHBOARD DIARIO
```sql
CREATE OR REPLACE FUNCTION public.get_ventas_del_dia(
    p_empresa_id UUID
) RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones BIGINT,
    total_items_vendidos BIGINT
) AS $$
    SELECT
        COALESCE(SUM(v.total_venta), 0) AS total_ventas,
        COUNT(v.id) AS cantidad_transacciones, 
        
        (
            SELECT COALESCE(SUM(dv.cantidad), 0) 
            FROM public.detalle_venta dv
            JOIN public.ventas sv ON dv.venta_id = sv.id
            WHERE sv.empresa_id = p_empresa_id 
            AND sv.fecha_venta::date = (now() AT TIME ZONE 'America/Bogota')::date
        ) AS total_items_vendidos
        
    FROM public.ventas v
    WHERE 
        v.empresa_id = p_empresa_id 
        AND v.fecha_venta::date = (now() AT TIME ZONE 'America/Bogota')::date
    GROUP BY v.empresa_id;
$$ LANGUAGE sql;
```
**🎯 Propósito:** Resumen de ventas del día actual
**📤 Retorna:**
- `total_ventas`: Suma de ingresos del día
- `cantidad_transacciones`: Número de ventas
- `total_items_vendidos`: Cantidad total de productos vendidos

---

### 6. **get_utilidad_del_dia** 💰 ANÁLISIS DE RENTABILIDAD
```sql
CREATE OR REPLACE FUNCTION public.get_utilidad_del_dia(
    p_empresa_id UUID
) RETURNS TABLE(
    total_ventas NUMERIC,
    total_costos NUMERIC,
    utilidad_neta NUMERIC
) AS $$
    SELECT
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0) AS total_ventas,
        COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0) AS total_costos,
        COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) AS utilidad_neta
    FROM public.detalle_venta dv
    JOIN public.ventas v ON v.id = dv.venta_id
    WHERE 
        dv.empresa_id = p_empresa_id 
        AND date_trunc('day', v.fecha_venta AT TIME ZONE 'America/Bogota') = date_trunc('day', now() AT TIME ZONE 'America/Bogota');
$$ LANGUAGE sql;
```
**🎯 Propósito:** Cálculo de utilidad neta basado en CPP real
**📤 Retorna:**
- `total_ventas`: Ingresos brutos del día
- `total_costos`: Costos totales (basado en CPP histórico)
- `utilidad_neta`: Ganancia real del día

---

### 7. **get_ventas_por_fecha** 📅 CONSULTAS HISTÓRICAS
```sql
CREATE OR REPLACE FUNCTION public.get_ventas_por_fecha(
    p_empresa_id UUID,
    p_fecha DATE DEFAULT ((now() AT TIME ZONE 'America/Bogota')::date)
) RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones INTEGER
) AS $$
    SELECT
        COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS total_ventas,
        COUNT(DISTINCT v.id) AS cantidad_transacciones
    FROM ventas v
    JOIN detalle_venta dv ON dv.venta_id = v.id
    WHERE v.empresa_id = p_empresa_id
      AND v.fecha_venta::date = p_fecha;
$$ LANGUAGE sql;
```
**🎯 Propósito:** Consulta de ventas por fecha específica
**📥 Parámetros:**
- `p_fecha`: Fecha a consultar (opcional, por defecto hoy)

---

### 8. **get_detalle_venta_by_date** 📋 ANÁLISIS POR PRODUCTO
```sql
CREATE OR REPLACE FUNCTION public.get_detalle_venta_by_date(
    p_empresa_id UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin TIMESTAMPTZ
) RETURNS TABLE(
    producto_id UUID,
    nombre_producto VARCHAR,
    referencia VARCHAR,
    cantidad_vendida BIGINT,
    precio_unitario NUMERIC,
    total_linea NUMERIC
) AS $$
    SELECT
        dv.producto_id,
        p.nombre AS nombre_producto,
        p.codigo_referencia AS referencia,
        SUM(dv.cantidad) AS cantidad_vendida,
        dv.precio_unitario,
        SUM(dv.cantidad * dv.precio_unitario) AS total_linea
    FROM public.detalle_venta dv
    JOIN public.productos p ON dv.producto_id = p.id
    JOIN public.ventas v ON dv.venta_id = v.id
    WHERE 
        dv.empresa_id = p_empresa_id 
        AND v.fecha_venta >= p_fecha_inicio
        AND v.fecha_venta < p_fecha_fin
    GROUP BY 
        dv.producto_id, p.nombre, p.codigo_referencia, dv.precio_unitario
    ORDER BY 
        cantidad_vendida DESC;
$$ LANGUAGE sql;
```
**🎯 Propósito:** Análisis detallado de productos más vendidos por período
**📥 Parámetros:**
- `p_fecha_inicio`: Fecha de inicio del rango
- `p_fecha_fin`: Fecha de fin del rango

---

### 9. **get_reporte_ventas** 📈 VISTA GENERAL
```sql
CREATE OR REPLACE FUNCTION public.get_reporte_ventas(
    p_empresa_id UUID
) RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones BIGINT,
    total_items_vendidos BIGINT
) AS $$
    SELECT
        COALESCE(SUM(v.total_venta), 0) AS total_ventas,
        COUNT(v.id) AS cantidad_transacciones,
        COALESCE(SUM(dv.cantidad), 0) AS total_items_vendidos
    FROM public.ventas v
    LEFT JOIN public.detalle_venta dv ON v.id = dv.venta_id
    WHERE v.empresa_id = p_empresa_id;
$$ LANGUAGE sql;
```
**🎯 Propósito:** Reporte general de todas las ventas (histórico completo)

---

## 🔧 FUNCIONES UTILITARIAS

### 10. **get_current_tenant_id** 🏢 HELPER DE SEGURIDAD
```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT empresa_id
  FROM public.perfiles
  WHERE id = auth.uid();
$$ LANGUAGE sql;
```
**🎯 Propósito:** Obtener la empresa del usuario autenticado
**🔒 Uso:** Helper para Row Level Security (RLS)

---

## 🏷️ FUNCIONES POR CATEGORÍA

### 🏗️ **Setup y Gestión de Usuarios**
- `create_tenant_and_profile()` - Crear nueva empresa
- `add_profile_to_tenant()` - Agregar empleados
- `get_current_tenant_id()` - Identificar empresa actual

### 📦 **Gestión de Inventario**
- `registrar_compra()` - Ingresos de stock con CPP automático

### 🛒 **Procesamiento de Ventas**
- `registrar_venta()` - Ventas completas con actualización de stock

### 📊 **Reportes y Analytics**
- `get_ventas_del_dia()` - Dashboard diario
- `get_utilidad_del_dia()` - Análisis de rentabilidad
- `get_ventas_por_fecha()` - Consultas históricas
- `get_detalle_venta_by_date()` - Análisis por producto
- `get_reporte_ventas()` - Vista general

---

## 🎯 CARACTERÍSTICAS TÉCNICAS DESTACADAS

### 🔒 **Concurrencia y Atomicidad**
- `FOR UPDATE` en operaciones críticas
- Transacciones ACID completas
- Manejo robusto de excepciones

### 🌍 **Consistencia Temporal**
- Zona horaria unificada: `America/Bogota`
- Timestamps automáticos con UTC
- Cálculos basados en hora local del negocio

### 💰 **Precisión Financiera**
- CPP (Costo Promedio Ponderado) automático
- Utilidad basada en costos reales históricos
- Redondeo consistente con `ROUND()`

### 🚀 **Optimización y Performance**
- Funciones SQL para consultas rápidas
- Uso eficiente de `COALESCE()` y `GROUP BY`
- Índices optimizados para cada función

---

**📝 Última actualización:** 2024-12-19
**👤 Mantenido por:** Equipo de Desarrollo GestiON
**🔢 Versión de Funciones:** 1.1.0
