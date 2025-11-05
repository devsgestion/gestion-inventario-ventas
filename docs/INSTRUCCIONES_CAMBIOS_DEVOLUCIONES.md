# 🔄 Módulo Cambios y Devoluciones - Instrucciones de Instalación

## 📋 Resumen
Este módulo permite gestionar cambios y devoluciones de productos con cálculo automático de diferencias de precio, ajuste de inventario y movimientos de caja.

---

## 🚀 Paso 1: Ejecutar Script SQL en Supabase

### Ubicación del archivo
```
docs/CAMBIOS_DEVOLUCIONES_SETUP.sql
```

### Instrucciones
1. Abrir el proyecto en Supabase Dashboard
2. Ir a **SQL Editor** (menú lateral izquierdo)
3. Crear un nuevo query
4. Copiar y pegar el contenido completo de `CAMBIOS_DEVOLUCIONES_SETUP.sql`
5. Hacer click en **Run** (o presionar Ctrl+Enter)

### ✅ Verificar que se creó correctamente
Ejecutar en SQL Editor:
```sql
-- Verificar tabla
SELECT * FROM cambios_devoluciones LIMIT 1;

-- Verificar función
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'procesar_cambio_devolucion';
```

Si ambas queries se ejecutan sin error, la instalación fue exitosa.

---

## 🧪 Paso 2: Probar el Módulo

### Acceso al módulo
- **Roles permitidos**: `superadmin`, `admin`, `vendedor`
- **URL**: `/cambios-devoluciones`
- **Menú**: 🔄 Cambios y Devoluciones (aparece entre Punto de Venta y Gestor de Pedidos)

### Flujo de prueba completo

#### 1. Crear una venta de prueba
```
a) Ir a Punto de Venta
b) Agregar 2 productos (ej: 2 bermudas a $50,000 c/u)
c) Completar venta
d) Anotar el ID de la venta (primeros 8 caracteres del UUID)
```

#### 2. Procesar un cambio
```
a) Ir a Cambios y Devoluciones
b) Click en "Procesar Cambio/Devolución"

PASO 1: Seleccionar Venta Original
   - Buscar la venta recién creada
   - Click en la venta

PASO 2: Productos a Devolver
   - Seleccionar las 2 bermudas (cantidad: 2)
   - Verificar que muestre: "Total a devolver: $100,000"

PASO 3: Productos Nuevos a Entregar
   - Seleccionar 2 pantalones (ej: precio $70,000 c/u)
   - Verificar que muestre: "Total de productos nuevos: $140,000"

PASO 4: Confirmar Cambio
   - Revisar el resumen:
     * Valor Devolución: $100,000
     * Valor Nuevos: $140,000
     * Diferencia: +$40,000 (cliente debe pagar)
   - Ingresar motivo: "Cambio de talla"
   - Click en "✅ Confirmar Cambio"
```

#### 3. Verificar cambios en el sistema

**Inventario:**
```
- Stock de bermudas: +2 unidades (regresaron)
- Stock de pantalones: -2 unidades (se entregaron)
```

**Caja:**
```
- Debe registrar ingreso de $40,000 (diferencia)
- Tipo: "cambio_devolucion"
```

**Movimientos de Inventario:**
```
- 2 movimientos de ajuste_stock (entrada bermudas)
- 2 movimientos de ajuste_stock (salida pantalones)
- Motivo: "Cambio/Devolución - [motivo ingresado]"
```

**Listado de Cambios:**
```
- Aparece el cambio procesado
- Muestra productos devueltos vs productos nuevos
- Badge con diferencia (+$40,000 en verde)
```

---

## 🔍 Verificación en Base de Datos

```sql
-- Ver cambios registrados
SELECT 
    id,
    created_at,
    valor_devolucion,
    valor_nuevos,
    diferencia,
    motivo,
    estado
FROM cambios_devoluciones
ORDER BY created_at DESC
LIMIT 5;

-- Ver detalle de un cambio específico
SELECT 
    productos_devueltos,
    productos_nuevos
FROM cambios_devoluciones
WHERE id = 'UUID_DEL_CAMBIO';

-- Ver movimientos de inventario generados
SELECT 
    p.nombre AS producto,
    mi.cantidad,
    mi.tipo_movimiento,
    mi.motivo
FROM movimientos_inventario mi
JOIN productos p ON mi.producto_id = p.id
WHERE mi.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY mi.created_at DESC;

-- Ver movimientos de caja generados
SELECT 
    tipo,
    monto,
    descripcion,
    created_at
FROM movimientos_caja
WHERE tipo = 'cambio_devolucion'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📊 Casos de Uso

### Caso 1: Cliente paga diferencia
```
Devuelve: 2 bermudas ($50,000 c/u) = $100,000
Recibe: 2 pantalones ($70,000 c/u) = $140,000
Diferencia: +$40,000 (cliente paga)
```

### Caso 2: Se devuelve dinero al cliente
```
Devuelve: 1 chaqueta ($150,000)
Recibe: 2 camisas ($60,000 c/u) = $120,000
Diferencia: -$30,000 (se devuelve al cliente)
```

### Caso 3: Cambio sin diferencia
```
Devuelve: 1 producto ($80,000)
Recibe: 1 producto ($80,000)
Diferencia: $0 (cambio directo)
```

---

## 🔐 Permisos por Rol

| Rol | Acceso al Módulo | Crear Cambios | Cancelar Cambios |
|-----|------------------|---------------|------------------|
| SuperAdmin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Vendedor | ✅ | ✅ | ❌ |
| Gestor | ❌ | ❌ | ❌ |
| Usuario | ❌ | ❌ | ❌ |

---

## 🎨 Componentes Creados

### Frontend
```
src/
├── components/
│   └── cambios/
│       └── ProcesarCambioModal.jsx    (Modal wizard de 4 pasos)
├── hooks/
│   └── useCambiosDevoluciones.js      (Lógica de negocio)
├── pages/
│   └── CambiosDevolucionesPage.jsx    (Página principal)
└── styles/
    └── CambiosDevoluciones.css        (Estilos con prefijo cd-)
```

### Backend (Supabase)
```
- Tabla: cambios_devoluciones
- Función: procesar_cambio_devolucion()
- Políticas RLS: 4 políticas de seguridad
- Índices: 4 índices de rendimiento
```

---

## 🐛 Solución de Problemas

### Error: "No se pudo procesar el cambio"
- Verificar que la venta original exista
- Verificar que los productos tengan stock suficiente
- Revisar que la caja esté abierta

### Los productos no aparecen en el selector
- Verificar que tengan `stock_actual > 0`
- Verificar que pertenezcan a la empresa correcta

### La diferencia no se calcula correctamente
- Revisar que los precios unitarios sean correctos
- Verificar que las cantidades sean números enteros válidos

### No aparece el menú "Cambios y Devoluciones"
- Verificar el rol del usuario (debe ser admin o vendedor)
- Refrescar la página (Ctrl+F5)

---

## 📝 Notas Importantes

1. **Atomicidad**: Todas las operaciones se ejecutan dentro de una transacción SQL. Si algo falla, todo se revierte.

2. **Auditoría Completa**: Cada cambio queda registrado con:
   - Productos devueltos y nuevos
   - Valores y diferencia
   - Usuario que procesó el cambio
   - Fecha y hora
   - Motivo y observaciones

3. **Inventario Automático**: No requiere ajustes manuales. El sistema:
   - Incrementa stock de productos devueltos
   - Decrementa stock de productos nuevos
   - Registra movimientos en historial

4. **Caja Automática**: El sistema registra automáticamente:
   - Ingreso si el cliente paga diferencia
   - Salida si se devuelve dinero al cliente
   - No registra movimiento si diferencia = $0

---

## ✅ Checklist de Instalación

- [ ] Script SQL ejecutado en Supabase
- [ ] Tabla `cambios_devoluciones` creada
- [ ] Función `procesar_cambio_devolucion()` creada
- [ ] Políticas RLS activas
- [ ] Menú "Cambios y Devoluciones" visible para admin/vendedor
- [ ] Ruta `/cambios-devoluciones` funcionando
- [ ] Modal de procesamiento se abre correctamente
- [ ] Venta de prueba creada y procesada exitosamente
- [ ] Inventario actualizado correctamente
- [ ] Caja registra diferencia correctamente
- [ ] Movimientos de inventario generados

---

## 🎉 ¡Listo!

El módulo de Cambios y Devoluciones está completamente funcional. Cualquier duda o error, revisar los logs de la consola del navegador o los logs de Supabase.
