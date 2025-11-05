-- ============================================
-- CONFIGURACIÓN DE ROLES Y PERMISOS
-- Sistema de gestión de inventario y ventas
-- ============================================

-- 1. Actualizar el constraint de la tabla perfiles para aceptar los nuevos roles
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('superadmin', 'admin', 'vendedor', 'gestor', 'usuario'));

-- 2. Verificar los roles existentes (Opcional - solo para consulta)
SELECT rol, COUNT(*) as cantidad 
FROM perfiles 
GROUP BY rol;

-- ============================================
-- DESCRIPCIÓN DE ROLES
-- ============================================

/*
ROLES DISPONIBLES:

1. SUPERADMIN (Super Administrador)
   - Acceso total al sistema
   - Panel de Administración de Usuarios
   - Configuración de empresa
   - Todos los módulos
   - Gestión de roles y permisos

2. ADMIN (Administrador)
   - Acceso a todos los módulos excepto Panel de Admin
   - Inventario (crear, editar, eliminar productos)
   - Punto de Venta
   - Gestor de Pedidos
   - Historial de Caja
   - Configuración de empresa

3. VENDEDOR
   - Inventario (ver y editar)
   - Punto de Venta (completo)
   - Historial de Caja (ver)
   - Abrir/Cerrar caja
   - NO puede crear o eliminar productos
   - NO acceso a Pedidos

4. GESTOR (Gestor de Pedidos)
   - Inventario (crear, editar productos, ajustar stock)
   - Gestor de Pedidos (completo)
   - Punto de Venta (básico)
   - NO acceso a Historial de Caja
   - NO acceso a Configuración

5. USUARIO (Básico)
   - Solo Punto de Venta (vender productos)
   - Acceso limitado al inventario (solo lectura)
   - NO puede abrir/cerrar caja
   - NO acceso a otros módulos

*/

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Crear un usuario VENDEDOR
-- (Primero debe registrarse normalmente, luego actualizar el rol)
-- UPDATE perfiles 
-- SET rol = 'vendedor' 
-- WHERE email = 'vendedor@ejemplo.com';

-- Crear un usuario GESTOR
-- UPDATE perfiles 
-- SET rol = 'gestor' 
-- WHERE email = 'gestor@ejemplo.com';

-- Ver todos los perfiles con sus roles
-- SELECT 
--     nombre,
--     email,
--     rol,
--     empresa_id,
--     created_at
-- FROM perfiles
-- ORDER BY created_at DESC;

-- ============================================
-- MATRIZ DE PERMISOS (Referencia)
-- ============================================

/*
MÓDULO/ACCIÓN           | SuperAdmin | Admin | Vendedor | Gestor | Usuario
------------------------|------------|-------|----------|--------|--------
Panel Admin             |     ✅     |  ❌   |    ❌    |   ❌   |   ❌
Configuración           |     ✅     |  ✅   |    ❌    |   ❌   |   ❌
Historial Caja          |     ✅     |  ✅   |    ✅    |   ❌   |   ❌
Abrir/Cerrar Caja       |     ✅     |  ✅   |    ✅    |   ❌   |   ❌
Inventario (Ver)        |     ✅     |  ✅   |    ✅    |   ✅   |   ✅
Inventario (Crear)      |     ✅     |  ✅   |    ❌    |   ✅   |   ❌
Inventario (Eliminar)   |     ✅     |  ✅   |    ❌    |   ❌   |   ❌
Ajustar Stock           |     ✅     |  ✅   |    ❌    |   ✅   |   ❌
Punto de Venta          |     ✅     |  ✅   |    ✅    |   ✅   |   ✅
Cancelar Ventas         |     ✅     |  ✅   |    ❌    |   ❌   |   ❌
Gestor Pedidos          |     ✅     |  ✅   |    ❌    |   ✅   |   ❌
Eliminar Pedidos        |     ✅     |  ✅   |    ❌    |   ❌   |   ❌
*/
