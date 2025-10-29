# 🧹 Guía de Limpieza y Optimización de Base de Datos

**Fecha:** 28 de Octubre, 2025
**Versión del Sistema:** 2.0.0

---

## 📊 ESTADO ACTUAL DE LA BASE DE DATOS

### ✅ Elementos Activos y en Uso

#### Tablas (9 en total)
1. ✅ **empresas** - Multi-tenant core
2. ✅ **perfiles** - Usuarios con sistema de roles
3. ✅ **productos** - Inventario con CPP
4. ✅ **ventas** - Transacciones de venta
5. ✅ **detalle_venta** - Items de cada venta
6. ✅ **movimientos_inventario** - Auditoría de stock
7. ✅ **estado_caja** - Control diario de caja
8. ✅ **cierres_caja** - Historial de cierres
9. ✅ **configuraciones_empresa** - Settings por empresa

**Todas las tablas están en uso activo. NO ELIMINAR NINGUNA.**

---

#### Funciones Activas (11 en uso)
1. ✅ **create_tenant_and_profile** - RegisterPage.jsx
2. ✅ **registrar_compra** - RegistroCompraForm.jsx
3. ✅ **registrar_venta** - VentasPage.jsx
4. ✅ **get_ventas_del_dia** - InventarioPage.jsx, useInventario.js
5. ✅ **get_utilidad_del_dia** - InventarioPage.jsx
6. ✅ **get_detalle_venta_by_date** - HistorialCajaPage.jsx
7. ✅ **es_superadmin** - Interna (verificación de permisos)
8. ✅ **get_all_users** - AdminUsersPage.jsx
9. ✅ **toggle_user_status** - AdminUsersPage.jsx
10. ✅ **update_user_role** - AdminUsersPage.jsx
11. ✅ **update_last_login** - Trigger automático

---

### ⚠️ Elementos Legacy (Candidatos para eliminación)

#### Funciones NO Usadas (4 funciones)
1. ⚠️ **add_profile_to_tenant** - No hay llamadas en el código
2. ⚠️ **get_ventas_por_fecha** - Similar a get_ventas_del_dia
3. ⚠️ **get_reporte_ventas** - Funcionalidad duplicada
4. ⚠️ **get_current_tenant_id** - Posiblemente usada en RLS (verificar)

#### Columnas Deprecated
1. ⚠️ **perfiles.is_admin** - Reemplazada por `perfiles.rol`
   - **Estado:** Mantener por compatibilidad
   - **Migrar a:** Usar `rol` en lugar de `is_admin`

---

## 🗑️ PLAN DE LIMPIEZA RECOMENDADO

### Paso 1: Verificar políticas RLS

Antes de eliminar cualquier función, verifica que no estén siendo usadas en Row Level Security:

```sql
-- Consultar políticas RLS activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Acción:** Si `get_current_tenant_id()` aparece en alguna política, NO ELIMINAR.

---

### Paso 2: Eliminar funciones legacy seguras

Estas funciones definitivamente NO están en uso:
    
```sql
-- ============================================
-- LIMPIEZA SEGURA - FUNCIONES LEGACY
-- ============================================

-- 1. Función de agregar empleados (no implementada en UI)
DROP FUNCTION IF EXISTS add_profile_to_tenant(UUID, TEXT, VARCHAR, UUID);

-- 2. Función duplicada de reportes por fecha
DROP FUNCTION IF EXISTS get_ventas_por_fecha(UUID, DATE);

-- 3. Función duplicada de reporte general
DROP FUNCTION IF EXISTS get_reporte_ventas(UUID);

-- Verificación
SELECT '✅ Funciones legacy eliminadas correctamente' as status;
```

**Impacto:** NINGUNO - Estas funciones no están siendo llamadas desde el código.

---

### Paso 3: Decisión sobre get_current_tenant_id

**Opción A - Si NO está en políticas RLS:**
```sql
DROP FUNCTION IF EXISTS get_current_tenant_id();
```

**Opción B - Si SÍ está en políticas RLS:**
```sql
-- NO ELIMINAR
-- Agregar comentario para documentar su uso
COMMENT ON FUNCTION get_current_tenant_id() IS 'Función usada en Row Level Security policies - NO ELIMINAR';
```

---

### Paso 4: Migrar código de is_admin a rol

Buscar y reemplazar en el código:

**Búsqueda:**
```javascript
perfil?.is_admin
```

**Reemplazo:**
```javascript
perfil?.rol === 'admin' || perfil?.rol === 'superadmin'
```

**Archivos a revisar:**
- Cualquier componente que use `is_admin`
- Lógica de permisos en el frontend

**Después de migrar todo el código:**
```sql
-- Eliminar columna deprecated (SOLO después de migrar código)
ALTER TABLE perfiles DROP COLUMN IF EXISTS is_admin;
```

---

## 📋 SCRIPT COMPLETO DE LIMPIEZA

```sql
-- ============================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1️⃣ Verificar políticas RLS primero
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (qual LIKE '%get_current_tenant_id%' OR with_check LIKE '%get_current_tenant_id%');
    
    RAISE NOTICE 'Políticas RLS que usan get_current_tenant_id: %', rls_count;
END $$;

-- 2️⃣ Eliminar funciones legacy seguras
DROP FUNCTION IF EXISTS add_profile_to_tenant(UUID, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS get_ventas_por_fecha(UUID, DATE);
DROP FUNCTION IF EXISTS get_reporte_ventas(UUID);

-- 3️⃣ Comentar get_current_tenant_id si está en uso
COMMENT ON FUNCTION get_current_tenant_id() IS 
'Helper para Row Level Security - Verificar uso antes de eliminar';

-- 4️⃣ Documentar columna deprecated
COMMENT ON COLUMN perfiles.is_admin IS 
'⚠️ DEPRECATED - Usar columna "rol" en su lugar - Mantener por compatibilidad';

-- 5️⃣ Crear índices faltantes si no existen
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_empresa 
ON ventas(fecha_venta, empresa_id);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_empresa_producto 
ON detalle_venta(empresa_id, producto_id);

-- ✅ Limpieza completada
SELECT '✅ Limpieza de base de datos completada' as status;
```

---

## 📈 OPTIMIZACIONES RECOMENDADAS

### 1. Índices adicionales para performance

```sql
-- Índice para búsquedas de productos activos
CREATE INDEX IF NOT EXISTS idx_productos_activo_empresa 
ON productos(empresa_id, activo) 
WHERE activo = true;

-- Índice para búsquedas de ventas recientes
CREATE INDEX IF NOT EXISTS idx_ventas_recientes 
ON ventas(empresa_id, fecha_venta DESC);

-- Índice para movimientos recientes
CREATE INDEX IF NOT EXISTS idx_movimientos_recientes 
ON movimientos_inventario(empresa_id, fecha DESC);
```

---

### 2. Vacuum y análisis de tablas

```sql
-- Optimizar tablas principales
VACUUM ANALYZE productos;
VACUUM ANALYZE ventas;
VACUUM ANALYZE detalle_venta;
VACUUM ANALYZE movimientos_inventario;
```

---

### 3. Estadísticas de uso actual

```sql
-- Ver tamaño de tablas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Ver número de registros por tabla
SELECT 
    'empresas' as tabla, COUNT(*) as registros FROM empresas
UNION ALL
SELECT 'perfiles', COUNT(*) FROM perfiles
UNION ALL
SELECT 'productos', COUNT(*) FROM productos
UNION ALL
SELECT 'ventas', COUNT(*) FROM ventas
UNION ALL
SELECT 'detalle_venta', COUNT(*) FROM detalle_venta
UNION ALL
SELECT 'movimientos_inventario', COUNT(*) FROM movimientos_inventario
UNION ALL
SELECT 'cierres_caja', COUNT(*) FROM cierres_caja
UNION ALL
SELECT 'configuraciones_empresa', COUNT(*) FROM configuraciones_empresa;
```

---

## 🔒 POLÍTICAS DE SEGURIDAD

### Verificar políticas RLS activas

```sql
-- Listar todas las políticas de seguridad
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Con filtro WHERE'
        ELSE 'Sin filtro'
    END as tipo_filtro
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Acción requerida:** Si no hay políticas RLS definidas, considerar implementarlas para mayor seguridad.

---

## ✅ CHECKLIST DE LIMPIEZA

Marca cada paso al completarlo:

### Pre-limpieza
- [ ] Hacer backup completo de la base de datos
- [ ] Verificar políticas RLS con script de verificación
- [ ] Revisar logs de uso de funciones legacy
- [ ] Documentar estado actual en `DATABASE_TABLES.md` ✅
- [ ] Documentar funciones en `DATABASE_FUNCTIONS.md` ✅

### Ejecución
- [ ] Ejecutar script de verificación RLS
- [ ] Eliminar funciones legacy (add_profile_to_tenant, get_ventas_por_fecha, get_reporte_ventas)
- [ ] Decidir sobre get_current_tenant_id según uso en RLS
- [ ] Agregar comentarios a columnas deprecated
- [ ] Crear índices de optimización

### Post-limpieza
- [ ] Ejecutar VACUUM ANALYZE en tablas principales
- [ ] Verificar que la aplicación funciona correctamente
- [ ] Actualizar documentación
- [ ] Commit de cambios en git
- [ ] Notificar al equipo de cambios

### Migración futura (opcional)
- [ ] Migrar código de is_admin a rol
- [ ] Probar en ambiente de desarrollo
- [ ] Eliminar columna is_admin después de migrar todo

---

## 🎯 BENEFICIOS ESPERADOS

Después de ejecutar esta limpieza:

1. **Performance mejorado:**
   - Menos funciones = menos confusión en query planner
   - Índices optimizados = consultas más rápidas
   - VACUUM = mejor uso del espacio

2. **Mantenibilidad:**
   - Código más limpio sin funciones duplicadas
   - Documentación actualizada
   - Migración clara a sistema de roles

3. **Seguridad:**
   - Sistema de roles más robusto (superadmin/admin/usuario)
   - Auditoría clara con last_login
   - Control de estado de usuarios (activo/inactivo)

---

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **NUNCA ejecutar scripts de limpieza directamente en producción sin backup**
2. **Verificar políticas RLS ANTES de eliminar get_current_tenant_id()**
3. **Migrar código de is_admin ANTES de eliminar la columna**
4. **Probar en ambiente de desarrollo primero**

---

## 📞 SOPORTE

Si tienes dudas sobre qué eliminar o necesitas ayuda:

1. Revisar documentación completa en:
   - `DATABASE_TABLES.md` - Estructura de tablas
   - `DATABASE_FUNCTIONS.md` - Funciones RPC

2. Ejecutar scripts de verificación incluidos en esta guía

3. Consultar con el equipo de desarrollo antes de cambios mayores

---

**📝 Documento creado:** 28 de Octubre, 2025
**👤 Responsable:** Equipo de Desarrollo GestiON
**🔄 Próxima revisión:** Después de ejecutar limpieza
