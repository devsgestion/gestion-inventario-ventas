# 🔢 Implementación de Número de Venta Secuencial

## 📋 Resumen
Se implementa un sistema de numeración secuencial para ventas (Venta #1, #2, #3...) único por empresa, ordenado cronológicamente.

---

## 🚀 PASO 1: Ejecutar Script de Numeración

### Archivo: `docs/AGREGAR_NUMERO_VENTA.sql`

Este script:
1. ✅ Agrega columna `numero_venta` a tabla `ventas`
2. ✅ Numera TODAS las ventas existentes por orden cronológico
3. ✅ Crea tabla `ventas_secuencias` para control de contadores
4. ✅ Crea función `obtener_siguiente_numero_venta()`

### Instrucciones:
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar y pegar contenido de `AGREGAR_NUMERO_VENTA.sql`
3. Click en **Run**
4. Verificar mensajes: "Empresa XXX: N ventas numeradas"

---

## 🚀 PASO 2: Actualizar Función de Ventas

### Archivo: `docs/ACTUALIZAR_REGISTRAR_VENTA.sql`

Este script actualiza la función `registrar_venta()` para que:
- Asigne automáticamente el número de venta
- Retorne el `numero_venta` en la respuesta
- Use el número en los movimientos de inventario

### Instrucciones:
1. En Supabase SQL Editor (mismo que el paso anterior)
2. Copiar y pegar contenido de `ACTUALIZAR_REGISTRAR_VENTA.sql`
3. Click en **Run**

---

## ✅ PASO 3: Verificar Numeración

Ejecuta esta consulta en Supabase para ver tus ventas numeradas:

```sql
SELECT 
    numero_venta,
    fecha_venta,
    total_venta,
    id
FROM ventas 
WHERE empresa_id = 'TU-EMPRESA-ID'
ORDER BY numero_venta DESC
LIMIT 20;
```

Deberías ver:
```
numero_venta | fecha_venta | total_venta | id
-------------|-------------|-------------|----
15           | 2025-11-04  | 150000      | uuid...
14           | 2025-11-04  | 89000       | uuid...
13           | 2025-11-03  | 120000      | uuid...
...
```

---

## 🎨 Cambios en el Frontend

Ya están implementados automáticamente:

### Modal de Cambios/Devoluciones:
- ✅ Muestra "Venta #123" en lugar de UUID
- ✅ Placeholder: "Buscar por número de venta..."
- ✅ Búsqueda por número funcionando

### Hook useCambiosDevoluciones:
- ✅ Busca por `numero_venta` cuando se ingresa un número

---

## 📊 Cómo Funciona

### Para ventas existentes (antes de la migración):
```
Ventas en BD ordenadas por fecha_venta:
1. UUID: a1b2... (1 nov 2025 10:00) → Se asigna numero_venta = 1
2. UUID: c3d4... (2 nov 2025 14:30) → Se asigna numero_venta = 2  
3. UUID: e5f6... (3 nov 2025 09:15) → Se asigna numero_venta = 3
4. UUID: g7h8... (4 nov 2025 11:00) → Se asigna numero_venta = 4
```

### Para ventas nuevas (después de la migración):
```
Cada vez que se registra una venta:
1. Se llama a obtener_siguiente_numero_venta(empresa_id)
2. Se incrementa el contador de la empresa
3. Se asigna el nuevo número a la venta
4. Resultado: Venta #5, #6, #7...
```

---

## 🔍 Ejemplos de Uso

### Buscar una venta en Cambios/Devoluciones:
```
Usuario escribe: 15
Sistema busca: WHERE numero_venta = 15
Resultado: Muestra "Venta #15"
```

### Listado de ventas:
```
Antes: Venta #a1b2c3d4 (confuso)
Ahora: Venta #15 (claro y fácil de recordar)
```

---

## ⚠️ Notas Importantes

1. **Único por empresa**: Cada empresa tiene su propia secuencia independiente
2. **Nunca se repite**: Los números son únicos y siempre incrementan
3. **Ordenado**: Los números se asignan en orden cronológico estricto
4. **Retrocompatible**: Si `numero_venta` es NULL, se muestra el UUID (fallback)

---

## 🐛 Solución de Problemas

### Error: "column numero_venta does not exist"
- Asegúrate de ejecutar primero `AGREGAR_NUMERO_VENTA.sql`

### Ventas nuevas no tienen número
- Ejecuta `ACTUALIZAR_REGISTRAR_VENTA.sql` para actualizar la función

### Números duplicados
- No debería pasar, pero si ocurre:
```sql
-- Reiniciar secuencias
TRUNCATE ventas_secuencias;
-- Luego re-ejecutar paso 5 de AGREGAR_NUMERO_VENTA.sql
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutado `AGREGAR_NUMERO_VENTA.sql` en Supabase
- [ ] Ejecutado `ACTUALIZAR_REGISTRAR_VENTA.sql` en Supabase
- [ ] Verificado que ventas existentes tienen `numero_venta`
- [ ] Probado crear una venta nueva
- [ ] Verificado que nueva venta tiene número secuencial correcto
- [ ] Probado búsqueda por número en Cambios/Devoluciones
- [ ] Confirmado que se muestra "Venta #123" en lugar de UUID

---

## 🎉 ¡Listo!

Ahora tu sistema de ventas tiene numeración profesional y fácil de usar. Los clientes y empleados pueden referirse a "Venta #15" en lugar de recordar UUIDs largos.
