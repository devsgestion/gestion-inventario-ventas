# 🚨 ERROR 400: Función anular_cambio_devolucion no encontrada

## ❌ El Error que estás viendo:

```
Failed to load resource: the server responded with a status of 400
Error al anular cambio: Object
```

## 🔍 Causa:

La función `anular_cambio_devolucion()` **NO existe en tu base de datos Supabase**.

---

## ✅ SOLUCIÓN RÁPIDA (3 pasos):

### **PASO 1: Abre Supabase SQL Editor**

1. Ve a tu proyecto en Supabase
2. Haz clic en **SQL Editor** (en el menú izquierdo)
3. Crea una nueva query

### **PASO 2: Ejecuta el script completo**

Opción A - **Script Original (Recomendado):**
```
Abre: docs/CREAR_FUNCION_ANULAR_CAMBIO.sql
Copia TODO el contenido
Pega en SQL Editor
Haz clic en "Run" (▶️)
```

Opción B - **Script Paso a Paso (Si la opción A falla):**
```
Abre: docs/INSTALAR_ANULAR_CAMBIO_PASO_A_PASO.sql
Copia la sección "PASO 1: Agregar columnas"
Ejecuta
Luego copia "PASO 2: Crear la función"
Ejecuta
Luego copia "PASO 3: Dar permisos"
Ejecuta
```

### **PASO 3: Verifica que funcionó**

Ejecuta esta query para verificar:

```sql
-- Verificar función
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'anular_cambio_devolucion';

-- Debe devolver 1 fila con:
-- routine_name: anular_cambio_devolucion
-- security_type: DEFINER
```

Si devuelve **1 fila**, la función está creada ✅

Si devuelve **0 filas**, la función NO se creó ❌ (ejecuta el script de nuevo)

---

## 🧪 Prueba después de instalar:

1. Refresca tu aplicación en el navegador (F5)
2. Ve a "Cambios y Devoluciones"
3. Intenta anular un cambio
4. Ahora debería funcionar sin error 400

---

## 🛠️ Si sigue sin funcionar:

### **Error: "permission denied for function"**

Ejecuta esto en SQL Editor:

```sql
GRANT EXECUTE ON FUNCTION anular_cambio_devolucion TO authenticated;
GRANT EXECUTE ON FUNCTION anular_cambio_devolucion TO service_role;
```

### **Error: "column does not exist"**

Ejecuta esto en SQL Editor:

```sql
ALTER TABLE cambios_devoluciones ADD COLUMN IF NOT EXISTS anulado BOOLEAN DEFAULT FALSE;
ALTER TABLE cambios_devoluciones ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ;
ALTER TABLE cambios_devoluciones ADD COLUMN IF NOT EXISTS usuario_anula_id UUID REFERENCES perfiles(id);
ALTER TABLE cambios_devoluciones ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
```

### **Error: "relation productos does not exist"**

Tu base de datos no tiene la estructura correcta. Verifica que existan las tablas:
- `cambios_devoluciones`
- `productos`
- `estado_caja`
- `perfiles`

---

## 📋 Checklist de Verificación:

Marca cada item después de verificarlo:

- [ ] ✅ Función existe: `SELECT * FROM information_schema.routines WHERE routine_name = 'anular_cambio_devolucion'`
- [ ] ✅ Columnas existen: `SELECT column_name FROM information_schema.columns WHERE table_name = 'cambios_devoluciones' AND column_name IN ('anulado', 'fecha_anulacion', 'usuario_anula_id', 'motivo_anulacion')`
- [ ] ✅ Permisos otorgados: `SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name = 'anular_cambio_devolucion'`
- [ ] ✅ Aplicación refrescada en navegador
- [ ] ✅ Botón "Anular" aparece en cambios
- [ ] ✅ Al hacer clic, pide confirmación
- [ ] ✅ No aparece error 400 en consola

---

## 💡 Consejo Pro:

Después de ejecutar el script, **cierra y abre la pestaña** de tu aplicación (no solo refresh). Esto asegura que Supabase reconozca la nueva función.

---

## 📞 Si nada funciona:

1. Revisa la consola del navegador (F12) y busca el error completo
2. Copia el mensaje de error exacto
3. Verifica en Supabase → Database → Functions si aparece `anular_cambio_devolucion`
4. Verifica en Supabase → Database → cambios_devoluciones si aparecen las 4 columnas nuevas

---

**Última actualización:** Después de ejecutar el script, la función debería estar disponible inmediatamente. Si no, verifica los permisos de RLS en la tabla `cambios_devoluciones`.
