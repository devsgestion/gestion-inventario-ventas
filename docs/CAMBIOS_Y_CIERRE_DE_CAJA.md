# 💰 Cambios/Devoluciones y Cierre de Caja

## 📋 Resumen del Sistema

### ✅ Cómo funciona actualmente:

Cuando procesas un **cambio/devolución**:

1. **Se ajusta el inventario**:
   - Productos devueltos → Se SUMAN al stock
   - Productos nuevos → Se RESTAN del stock

2. **Se actualiza la caja del día**:
   ```sql
   UPDATE estado_caja
   SET monto_inicial = monto_inicial + diferencia
   WHERE estado = 'ABIERTA'
   ```
   - Si `diferencia > 0`: Cliente pagó extra → Ingresa dinero a caja
   - Si `diferencia < 0`: Se devolvió dinero → Sale dinero de caja
   - Si `diferencia = 0`: Cambio exacto → No afecta caja

3. **Se registra en trazabilidad**:
   - Tabla `cambios_devoluciones`: Registro completo con motivo, observaciones, productos
   - Tabla `movimientos_inventario`: Cada producto tiene su movimiento registrado

---

## ⚠️ PROBLEMA IDENTIFICADO

### Al cerrar la caja:

La función `get_ventas_del_dia()` **solo sumaba ventas normales**, NO incluía las diferencias de cambios/devoluciones.

**Escenario ejemplo:**
```
Mañana:
- Abres caja con $0
- Haces 3 ventas: $100,000 + $200,000 + $150,000 = $450,000

Tarde:
- Cliente devuelve producto de $100,000 y lleva uno de $150,000
  → Diferencia: +$50,000
  → estado_caja.monto_inicial = 0 + 50,000 = $50,000 ✅

Cierre de caja (ANTES):
- get_ventas_del_dia() = $450,000 (solo ventas)
- Dinero real en caja = $450,000 + $50,000 = $500,000
- ❌ DISCREPANCIA: El historial muestra $450,000 pero debes tener $500,000
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

Actualizar la función `get_ventas_del_dia()` para incluir cambios:

```sql
CREATE OR REPLACE FUNCTION get_ventas_del_dia(p_empresa_id UUID)
RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones INTEGER
) AS $$
DECLARE
    v_total_ventas NUMERIC;
    v_total_cambios NUMERIC;
    v_total_final NUMERIC;
BEGIN
    -- Total de ventas normales
    SELECT COALESCE(SUM(total_venta), 0)
    INTO v_total_ventas
    FROM ventas
    WHERE empresa_id = p_empresa_id
    AND DATE(fecha_venta) = CURRENT_DATE;

    -- Diferencias de cambios/devoluciones
    SELECT COALESCE(SUM(diferencia), 0)
    INTO v_total_cambios
    FROM cambios_devoluciones
    WHERE empresa_id = p_empresa_id
    AND DATE(created_at) = CURRENT_DATE;

    -- Total final = ventas + diferencias de cambios
    v_total_final := v_total_ventas + v_total_cambios;

    RETURN QUERY SELECT v_total_final, COUNT(*)
    FROM ventas WHERE ...;
END;
$$ LANGUAGE plpgsql;
```

### Ahora el cierre de caja mostrará:

```
Cierre de caja (DESPUÉS):
- Ventas normales: $450,000
- Cambios/Devoluciones (diferencia): +$50,000
- Total en historial_caja: $500,000 ✅
- Dinero real en caja: $500,000 ✅
- ✅ CORRECTO: Coincide perfectamente
```

---

## 📊 Flujo Completo con Ejemplo

### Día de trabajo completo:

```
08:00 - Abrir Caja
  └─ monto_inicial = $0

10:00 - Venta #1
  └─ $100,000 → Total en caja: $100,000

11:30 - Venta #2
  └─ $200,000 → Total en caja: $300,000

14:00 - Cambio/Devolución
  - Cliente devuelve: Bermuda ($80,000)
  - Cliente lleva: Camisa ($120,000)
  - Diferencia: +$40,000
  └─ Total en caja: $340,000

16:00 - Venta #3
  └─ $150,000 → Total en caja: $490,000

18:00 - Cambio/Devolución 2
  - Cliente devuelve: Zapatos ($100,000)
  - Cliente lleva: Sandalias ($90,000)
  - Diferencia: -$10,000 (se devuelve $10,000)
  └─ Total en caja: $480,000

20:00 - Cerrar Caja
  Cálculo:
  - Ventas normales: $450,000 (suma de las 3 ventas)
  - Cambio 1: +$40,000
  - Cambio 2: -$10,000
  - Total esperado: $480,000 ✅
  
  Se guarda en cierres_caja:
  - total_ingresos: $480,000
  - total_transacciones: 3 (solo ventas)
  - fecha_cierre: 2025-11-04
```

---

## 🔧 Cómo aplicar la corrección

### 1. Ejecutar el script SQL:
```bash
# Abre Supabase SQL Editor
# Copia y pega el contenido de:
docs/ACTUALIZAR_GET_VENTAS_DEL_DIA.sql
```

### 2. Verificar que funcione:
```sql
-- Ejecuta esto para ver el total del día:
SELECT * FROM get_ventas_del_dia('tu-empresa-id');

-- Verifica los cambios del día:
SELECT 
    COUNT(*) as total_cambios,
    SUM(diferencia) as total_diferencia
FROM cambios_devoluciones
WHERE empresa_id = 'tu-empresa-id'
AND DATE(created_at) = CURRENT_DATE;
```

### 3. Resultado esperado:
- El total de `get_ventas_del_dia()` debe ser = ventas + suma de diferencias
- Al cerrar caja, el historial reflejará el dinero real

---

## 📝 Registro de Cambios

### Tablas afectadas:
1. **estado_caja**: Se actualiza `monto_inicial` con cada cambio
2. **cambios_devoluciones**: Registra cada cambio con motivo y diferencia
3. **movimientos_inventario**: Registra movimientos de stock
4. **cierres_caja**: Al cerrar, refleja ventas + diferencias de cambios

### Funciones actualizadas:
- ✅ `procesar_cambio_devolucion()`: Ajusta inventario y caja
- ✅ `get_ventas_del_dia()`: Incluye diferencias de cambios en el total

---

## 💡 Beneficios

✅ **Exactitud financiera**: El historial refleja el dinero real en caja  
✅ **Trazabilidad completa**: Cada cambio queda registrado con motivo  
✅ **Reportes precisos**: Los cierres de caja son confiables  
✅ **Auditoría**: Se puede rastrear cada movimiento de dinero  
✅ **Transparencia**: Fácil explicar discrepancias si las hay  

---

## 🎯 Conclusión

Con esta actualización, el sistema de cambios/devoluciones está completamente integrado con el cierre de caja:

- ✅ Inventario se ajusta automáticamente
- ✅ Dinero en caja refleja realidad
- ✅ Historial de caja es preciso
- ✅ Reportes confiables
- ✅ Trazabilidad completa

**No se crean ventas duplicadas**, todo queda ligado a la venta original con registro detallado del cambio.
