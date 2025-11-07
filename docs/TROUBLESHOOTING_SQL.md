# 🔍 VERIFICAR Y SOLUCIONAR FUNCIÓN SQL

## Paso 1: Verificar si la función existe

En Supabase SQL Editor, ejecuta esto:

```sql
-- Ver todas las funciones que existen
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%ventas_por_hora%';
```

Deberías ver algo como:
```
routine_name                       | routine_type | routine_schema
----------------------------------|--------------|---------------
get_ventas_por_hora               | FUNCTION     | public
get_ventas_por_hora_con_productos | FUNCTION     | public
```

---

## Paso 2: Si NO aparece la función con productos

Ejecuta este SQL MEJORADO (con mejor manejo de errores):

```sql
-- ELIMINAR función anterior si existe
DROP FUNCTION IF EXISTS get_ventas_por_hora_con_productos(UUID, DATE);

-- CREAR la función
CREATE OR REPLACE FUNCTION get_ventas_por_hora_con_productos(
    p_empresa_id UUID,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    hora TEXT,
    hora_numero INTEGER,
    total_ventas NUMERIC,
    transacciones INTEGER,
    productos JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ventas_hora AS (
        SELECT 
            EXTRACT(HOUR FROM v.fecha_venta AT TIME ZONE 'America/Bogota')::INTEGER as hora_num,
            v.id as venta_id,
            v.total_venta
        FROM ventas v
        WHERE 
            v.empresa_id = p_empresa_id
            AND DATE(v.fecha_venta AT TIME ZONE 'America/Bogota') = p_fecha
    ),
    productos_vendidos AS (
        SELECT 
            vh.hora_num,
            jsonb_agg(
                jsonb_build_object(
                    'nombre', p.nombre,
                    'cantidad', dv.cantidad,
                    'precio_venta', dv.precio_venta,
                    'subtotal', dv.subtotal
                ) ORDER BY dv.cantidad DESC
            ) as productos_list
        FROM ventas_hora vh
        INNER JOIN detalle_ventas dv ON dv.venta_id = vh.venta_id
        INNER JOIN productos p ON p.id = dv.producto_id
        GROUP BY vh.hora_num
    ),
    horas_completas AS (
        SELECT generate_series(0, 23) as hora_num
    )
    SELECT 
        LPAD(hc.hora_num::TEXT, 2, '0') || ':00' as hora,
        hc.hora_num as hora_numero,
        COALESCE(SUM(vh.total_venta), 0) as total_ventas,
        COUNT(DISTINCT vh.venta_id)::INTEGER as transacciones,
        COALESCE(pv.productos_list, '[]'::jsonb) as productos
    FROM horas_completas hc
    LEFT JOIN ventas_hora vh ON vh.hora_num = hc.hora_num
    LEFT JOIN productos_vendidos pv ON pv.hora_num = hc.hora_num
    GROUP BY hc.hora_num, pv.productos_list
    ORDER BY hc.hora_num;
END;
$$;

-- DAR PERMISOS
GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO anon;

-- AGREGAR COMENTARIO
COMMENT ON FUNCTION get_ventas_por_hora_con_productos IS 
'Retorna ventas agrupadas por hora del día con lista de productos vendidos';
```

---

## Paso 3: Verificar permisos RLS en la tabla

La función necesita acceso a las tablas. Verifica que existan políticas RLS:

```sql
-- Ver políticas de la tabla detalle_ventas
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'detalle_ventas';
```

Si NO hay políticas o aparece vacío, ejecuta:

```sql
-- Habilitar RLS si no está habilitado
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;

-- Crear política para lectura
CREATE POLICY "Usuarios pueden ver detalles de ventas de su empresa"
    ON detalle_ventas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ventas
            WHERE ventas.id = detalle_ventas.venta_id
            AND ventas.empresa_id IN (
                SELECT empresa_id FROM perfiles WHERE id = auth.uid()
            )
        )
    );
```

---

## Paso 4: Probar la función directamente

```sql
-- Reemplaza 'TU-EMPRESA-UUID' con tu ID real
SELECT * FROM get_ventas_por_hora_con_productos(
    'TU-EMPRESA-UUID'::uuid, 
    CURRENT_DATE
);
```

Si esto funciona, deberías ver las 24 horas con datos.

---

## Paso 5: Si todo falla - Usar función alternativa

Si nada funciona, ejecuta esta versión más simple sin productos (temporalmente):

```sql
-- Esta es la función que SÍ funciona (sin productos)
-- Ya la tienes, solo verifica que exista
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_ventas_por_hora';
```

La app ya tiene fallback automático, así que seguirá funcionando sin los productos.

---

## 🎯 Solución Rápida

Si quieres que funcione YA sin productos (mientras investigas):

1. La app ya usa fallback automático
2. Verás el gráfico funcionando
3. Solo no aparecerán los productos en el tooltip

Para ver los productos, necesitas que la función `get_ventas_por_hora_con_productos` exista y tenga permisos correctos en Supabase.

---

## 📋 Checklist de Verificación

- [ ] Función existe en `information_schema.routines`
- [ ] Tiene permisos GRANT EXECUTE para `authenticated`
- [ ] Tabla `detalle_ventas` tiene RLS configurado
- [ ] Prueba directa en SQL Editor funciona
- [ ] Recargaste la página del Dashboard

---

**¿Qué resultado obtuviste en el Paso 1 (verificar funciones)?**
