# 📦 Mejoras Implementadas en el Sistema de Pedidos

## 🎯 Resumen de Cambios

### **Tabla `pedidos` - Mejoras:**

#### ✅ **Cambios de Nombres (Consistencia)**
- `usuario_asignado` → `usuario_id` (consistente con tabla `ventas`)
- `fecha_creacion` → `created_at` (estándar en todo el sistema)

#### ➕ **Nuevas Columnas Agregadas**
- `total_pedido` (NUMERIC): Total calculado automáticamente
- `updated_at` (TIMESTAMPTZ): Para auditoría de cambios
- `estado` mejorado con más opciones

#### 🔒 **Validaciones Agregadas (CHECK Constraints)**
- `estado` solo permite: `pendiente`, `confirmado`, `en_preparacion`, `enviado`, `entregado`, `cancelado`
- `canal` solo permite: `WhatsApp`, `Facebook`, `Instagram`, `Tienda`, `Teléfono`, `Otro`

#### 🔄 **Cascadas Mejoradas**
- `ON DELETE CASCADE` en `empresa_id` (si se elimina empresa, se eliminan pedidos)
- `ON DELETE SET NULL` en `usuario_id` (si se elimina usuario, pedido permanece)

---

### **Tabla `items_pedido` - Mejoras:**

#### ➕ **Nueva Columna**
- `empresa_id` (UUID): Redundancia intencional para optimización de consultas (igual que en `detalle_venta`)

#### 🔒 **Validaciones Agregadas**
- `cantidad` debe ser > 0
- `precio_unitario` debe ser >= 0
- `tipo_venta` solo permite: `detal`, `mayorista`

#### 🔄 **Cascadas Mejoradas**
- `ON DELETE CASCADE` en `pedido_id` (si se elimina pedido, se eliminan items)
- `ON DELETE SET NULL` en `producto_id` (mantiene histórico aunque se elimine producto)
- `ON DELETE CASCADE` en `empresa_id`

---

## 🚀 Funcionalidades Automáticas Agregadas

### 1. **Cálculo Automático de Total**
Se creó una función `calcular_total_pedido()` que suma automáticamente:
```sql
total_pedido = SUM(cantidad × precio_unitario) de todos los items
```

### 2. **Trigger para Actualizar Total**
Cada vez que se:
- Agrega un item
- Modifica un item
- Elimina un item

El `total_pedido` se recalcula automáticamente.

### 3. **Trigger para updated_at**
Actualiza automáticamente la fecha de modificación del pedido.

---

## 📊 Índices para Performance

Se crearon índices para acelerar las consultas más comunes:

```sql
-- Búsquedas por empresa
idx_pedidos_empresa_id
idx_items_pedido_empresa_id

-- Filtros por estado
idx_pedidos_estado
idx_pedidos_empresa_estado

-- Ordenamiento por fecha
idx_pedidos_fecha

-- Joins frecuentes
idx_items_pedido_pedido_id
idx_items_pedido_producto_id
```

---

## 🔐 Seguridad (RLS - Row Level Security)

Se configuraron políticas para que:
- ✅ Los usuarios **solo vean pedidos de su empresa**
- ✅ Los usuarios **solo puedan crear/editar/eliminar pedidos de su empresa**
- ✅ Los items de pedidos también están protegidos por empresa

---

## 📈 Vista Creada

Se creó `vista_pedidos_completos` que muestra:
- Datos del pedido
- Cantidad de items
- Total de unidades
- Nombre del usuario asignado

---

## 🔄 Script de Migración

Si ya tienes datos en las tablas antiguas, ejecuta las siguientes consultas en Supabase:

### **Paso 1: Renombrar columnas**
```sql
ALTER TABLE pedidos RENAME COLUMN usuario_asignado TO usuario_id;
ALTER TABLE pedidos RENAME COLUMN fecha_creacion TO created_at;
```

### **Paso 2: Agregar nuevas columnas**
```sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS total_pedido NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());
ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS empresa_id UUID;
```

### **Paso 3: Llenar empresa_id en items_pedido**
```sql
UPDATE items_pedido 
SET empresa_id = p.empresa_id
FROM pedidos p
WHERE items_pedido.pedido_id = p.id
AND items_pedido.empresa_id IS NULL;
```

### **Paso 4: Calcular totales existentes**
```sql
UPDATE pedidos SET total_pedido = calcular_total_pedido(id);
```

### **Paso 5: Agregar constraint NOT NULL a empresa_id**
```sql
ALTER TABLE items_pedido ALTER COLUMN empresa_id SET NOT NULL;
```

---

## 📝 Cambios en el Código React

### **Archivos Actualizados:**

1. ✅ `usePedidos.js` - Usa `created_at` para ordenar
2. ✅ `PedidosPage.jsx` - Usa `created_at` para mostrar fecha
3. ✅ `PedidoForm.jsx` - Guarda `usuario_id` automáticamente
4. ✅ `PedidoProductosForm.jsx` - Incluye `empresa_id` al insertar items
5. ✅ `PedidoDetalle.jsx` - Usa `created_at` para mostrar fecha

---

## 🎨 Estados de Pedido Disponibles

| Estado | Descripción | Badge Color |
|--------|-------------|-------------|
| `pendiente` | Pedido recibido, sin confirmar | 🟡 Amarillo |
| `confirmado` | Pedido confirmado con cliente | 🔵 Azul |
| `en_preparacion` | En proceso de preparación | 🟣 Púrpura |
| `enviado` | Pedido enviado al cliente | 🟠 Naranja |
| `entregado` | Pedido entregado exitosamente | 🟢 Verde |
| `cancelado` | Pedido cancelado | 🔴 Rojo |

---

## 📋 Para Implementar en Supabase

1. **Abre el SQL Editor en Supabase**
2. **Copia y pega el contenido del archivo** `PEDIDOS_MIGRATION.sql`
3. **Ejecuta el script completo**
4. **Verifica que las tablas se crearon correctamente**

---

## ✅ Beneficios de los Cambios

1. **🎯 Consistencia**: Nombres alineados con el resto del sistema
2. **⚡ Performance**: Índices optimizan consultas frecuentes
3. **🔒 Seguridad**: RLS protege datos por empresa
4. **📊 Automatización**: Totales se calculan automáticamente
5. **✅ Validación**: Constraints previenen datos inválidos
6. **📈 Escalabilidad**: Preparado para crecer sin problemas

---

## 🚨 Importante

- Ejecuta primero el script SQL en Supabase
- Luego recarga tu aplicación React
- Los cambios de código ya están listos y sincronizados

---

**Última actualización:** Noviembre 4, 2025
