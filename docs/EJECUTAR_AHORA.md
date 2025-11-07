# 🚨 EJECUTAR AHORA - Ver productos vendidos por hora

## ⚡ Pasos rápidos (2 minutos)

### 1️⃣ Abrir Supabase
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Click en **SQL Editor** (menú izquierdo, ícono de terminal)

### 2️⃣ Copiar y Ejecutar SQL
1. Abre el archivo: `docs/GET_VENTAS_POR_HORA_CON_PRODUCTOS.sql`
2. **Selecciona TODO** el contenido (Ctrl + A)
3. **Copia** (Ctrl + C)
4. En Supabase SQL Editor → **Pega** (Ctrl + V)
5. Click en **RUN** (o presiona F5)

### 3️⃣ Verificar
Deberías ver: ✅ **Success. No rows returned**

Eso es todo! 

### 4️⃣ Ver cambios en la app
1. Vuelve al Dashboard de tu app
2. Recarga la página (F5)
3. Ahora en "Ventas por Hora":
   - **Pasa el mouse** sobre las barras → Verás productos
   - **Haz click** en una hora → Se abre panel lateral con detalles

---

## 🎯 ¿Qué vas a ver?

### Antes (sin SQL):
```
Tooltip:
🕐 14:00
💰 $2.335.900
🧾 5 transacciones
```

### Después (con SQL):
```
Tooltip:
🕐 14:00
💰 $2.335.900
🧾 5 transacciones
━━━━━━━━━━━━━━━━━━━━
📦 Productos vendidos:

Camisa Polo      ×3   $150.000
Jean Slim        ×2   $280.000
Zapatos         ×1   $320.000
...

👆 Click para ver detalles
```

**¡Y al hacer click verás un panel completo con TODOS los productos!**

---

## ❓ Si algo falla

### Error: "relation detalle_ventas does not exist"
- Verifica que tu tabla se llame `detalle_ventas`
- O modifica el SQL con el nombre correcto de tu tabla

### No veo productos en el Dashboard
1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Busca mensajes de error
4. Recarga la página (F5)

### Funciona pero sin productos
- La función SQL existe pero no hay ventas hoy
- Haz una venta de prueba
- Recarga el Dashboard

---

## 📝 Contenido del SQL a ejecutar

El archivo está en: `docs/GET_VENTAS_POR_HORA_CON_PRODUCTOS.sql`

O copia este código directamente:

```sql
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO authenticated;
```

---

**⏱️ Tiempo estimado: 2 minutos**

**✅ Una vez ejecutado, funcionará automáticamente sin reiniciar nada!**
