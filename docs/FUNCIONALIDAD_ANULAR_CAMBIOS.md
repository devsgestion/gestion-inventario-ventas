# 🔄 FUNCIONALIDAD: ANULAR CAMBIOS/DEVOLUCIONES

## 📋 RESUMEN

Se ha implementado la funcionalidad completa para **anular cambios/devoluciones** que fueron procesados por error. Esta característica permite revertir completamente una operación de cambio, restaurando el inventario y la caja a su estado original.

---

## ✅ QUÉ SE HIZO

### 1. **Base de Datos (SQL)**
- ✅ Archivo: `docs/CREAR_FUNCION_ANULAR_CAMBIO.sql`
- ✅ Función PostgreSQL: `anular_cambio_devolucion()`
- ✅ Nuevas columnas en tabla `cambios_devoluciones`:
  - `anulado` (BOOLEAN) - Marca si está anulado
  - `fecha_anulacion` (TIMESTAMPTZ) - Cuándo se anuló
  - `usuario_anula_id` (UUID) - Quién lo anuló
  - `motivo_anulacion` (TEXT) - Por qué se anuló

### 2. **Hook de React**
- ✅ Archivo: `src/hooks/useCambiosDevoluciones.js`
- ✅ Nueva función: `anularCambio(cambioId, usuarioId, motivo)`
- ✅ Exportada en el return del hook

### 3. **Interfaz de Usuario**
- ✅ **CambiosDevolucionesPage.jsx**: Botón "❌ Anular" en cada cambio
- ✅ **HistorialCajaPage.jsx**: Botón "❌ Anular Cambio" en historial
- ✅ Estilos CSS: `.cd-btn--danger` y `.cd-btn--small`
- ✅ Indicador visual cuando un cambio está anulado
- ✅ Confirmación con prompt para motivo obligatorio

---

## 🔧 CÓMO FUNCIONA

### **Al anular un cambio, se ejecuta automáticamente:**

1. **Revierte Inventario de Productos Devueltos**
   - Los productos que el cliente devolvió vuelven a **restarse** del stock
   - Ejemplo: Si devolvió 2 bermudas → Se restan 2 bermudas del inventario

2. **Revierte Inventario de Productos Nuevos**
   - Los productos nuevos que se le dieron vuelven a **sumarse** al stock
   - Ejemplo: Si recibió 3 camisas → Se suman 3 camisas al inventario

3. **Revierte la Diferencia en Caja**
   - Si la diferencia fue **positiva** (+$10,000): Se **resta** de caja
   - Si la diferencia fue **negativa** (-$5,000): Se **suma** a caja
   - Matemáticamente: `nuevo_monto = monto_actual - diferencia_original`

4. **Marca el Cambio como Anulado**
   - Se registra: fecha, usuario que anuló, y motivo
   - El cambio NO se elimina (queda en base de datos para auditoría)

---

## 🎯 CÓMO USAR

### **Desde Cambios y Devoluciones:**
1. Ve a "🔄 Cambios y Devoluciones"
2. Encuentra el cambio que quieres anular
3. Haz clic en el botón **"❌ Anular"** (botón rojo pequeño)
4. Confirma la acción en el diálogo
5. Ingresa el motivo de anulación (obligatorio)
6. El sistema revierte todo automáticamente

### **Desde Historial de Caja:**
1. Ve a "Historial de Cierres de Caja"
2. Selecciona un día específico
3. En la sección "🔄 Cambios y Devoluciones del Día"
4. Haz clic en **"❌ Anular Cambio"** en el cambio específico
5. Confirma e ingresa motivo
6. Se revierte y se actualiza el historial

---

## 🛡️ VALIDACIONES Y SEGURIDAD

### **Antes de Anular:**
- ✅ Verifica que el cambio NO esté ya anulado
- ✅ Verifica que haya una caja abierta
- ✅ Requiere motivo obligatorio (texto no vacío)
- ✅ Confirmación del usuario (doble verificación)

### **Durante la Anulación:**
- ✅ Todo se ejecuta en una transacción SQL
- ✅ Si algo falla, NO se aplica nada (rollback automático)
- ✅ Se registra quién y cuándo anuló (auditoría completa)

### **Después de Anular:**
- ✅ El cambio queda marcado visualmente con banner rojo
- ✅ El botón "Anular" desaparece (no se puede anular dos veces)
- ✅ Se muestra el motivo de anulación
- ✅ La opacidad del cambio baja (queda "apagado")

---

## 📊 INDICADORES VISUALES

### **Cambio Activo:**
```
┌─────────────────────────────────────────┐
│ Cambio #1234                            │
│ Devolvió: $50,000 | Nuevos: $60,000     │
│ Diferencia: +$10,000                    │
│                          [❌ Anular] ←   │  Botón visible
└─────────────────────────────────────────┘
```

### **Cambio Anulado:**
```
┌─────────────────────────────────────────┐
│ ╔══════════════════════════════════╗    │
│ ║ ❌ CAMBIO ANULADO                ║    │  Banner rojo
│ ║ Motivo: Error en registro        ║    │
│ ╚══════════════════════════════════╝    │
│                                         │
│ Cambio #1234 (opacidad 60%)            │  Más apagado
│ Devolvió: $50,000 | Nuevos: $60,000     │
│ Diferencia: +$10,000                    │
│                                         │  Sin botón
└─────────────────────────────────────────┘
```

---

## 🗄️ INSTALACIÓN EN SUPABASE

**IMPORTANTE:** Debes ejecutar el script SQL antes de usar esta función.

### **Pasos:**

1. Abre Supabase → SQL Editor
2. Copia todo el contenido de: `docs/CREAR_FUNCION_ANULAR_CAMBIO.sql`
3. Pega en el editor y ejecuta
4. Verifica que se creó la función:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'anular_cambio_devolucion';
   ```
5. Verifica que se agregaron las columnas:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'cambios_devoluciones' 
   AND column_name IN ('anulado', 'fecha_anulacion', 'usuario_anula_id', 'motivo_anulacion');
   ```

---

## 🧪 EJEMPLO PRÁCTICO

### **Escenario:**
Un cliente vino con bermudas ($50,000) y las cambió por camisas ($60,000).
Pagó diferencia de **+$10,000**.

**Estado ANTES del cambio:**
- Inventario: 10 bermudas, 5 camisas
- Caja: $100,000

**Estado DESPUÉS del cambio:**
- Inventario: **11 bermudas** (+1), **2 camisas** (-3)
- Caja: **$110,000** (+$10,000)

**Se equivocaron y hay que anular:**

**Estado DESPUÉS de anular:**
- Inventario: **10 bermudas** (-1), **5 camisas** (+3) ← Volvió al original
- Caja: **$100,000** (-$10,000) ← Volvió al original
- Cambio marcado como ANULADO con motivo

---

## ⚠️ NOTAS IMPORTANTES

1. **NO se eliminan registros**: Los cambios anulados quedan en la base de datos para auditoría
2. **Requiere caja abierta**: Si la caja está cerrada, no se puede anular (protección)
3. **El motivo es obligatorio**: No se puede anular sin explicar por qué
4. **No se puede des-anular**: Una vez anulado, es permanente (tendrías que hacer un nuevo cambio)
5. **Afecta estado de caja actual**: La diferencia se revierte en la caja que esté abierta en ese momento

---

## 🔍 VERIFICACIÓN

Para verificar que un cambio se anuló correctamente:

```sql
-- Ver cambios anulados
SELECT 
    id,
    created_at as fecha_cambio,
    anulado,
    fecha_anulacion,
    motivo_anulacion,
    diferencia
FROM cambios_devoluciones
WHERE anulado = TRUE
ORDER BY fecha_anulacion DESC;

-- Ver cambio específico con todos los detalles
SELECT * FROM cambios_devoluciones WHERE id = 'TU_ID_AQUI';
```

---

## 📞 SOPORTE

Si tienes problemas con la anulación:

1. Verifica que ejecutaste el script SQL
2. Verifica que hay una caja abierta
3. Revisa la consola del navegador para ver errores
4. Verifica que el usuario tiene permisos

---

**Implementado:** Noviembre 2025  
**Versión:** 1.0  
**Estado:** ✅ Funcional y probado
