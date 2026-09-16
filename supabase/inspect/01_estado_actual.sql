-- ============================================================================
-- INVENTARIO DEL ESTADO ACTUAL DE LA BASE DE DATOS  (SOLO LECTURA)
-- ============================================================================
-- No modifica nada. Devuelve una sola tabla con 3 columnas:
--   seccion | objeto | definicion
--
-- Cómo usarlo:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Pegar TODO este archivo y ejecutar (Run)
--   3. En el panel de resultados, botón "Export" / "Download CSV"
--   4. Guardar el archivo como:  supabase/inspect/resultado_estado_actual.csv
-- ============================================================================

WITH
-- 1. Tablas y columnas del esquema public
tablas AS (
  SELECT
    '01_tablas' AS seccion,
    c.table_name AS objeto,
    string_agg(
      format('%s %s%s%s',
        c.column_name,
        c.data_type,
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END
      ),
      E'\n' ORDER BY c.ordinal_position
    ) AS definicion
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  GROUP BY c.table_name
),

-- 2. Estado de RLS por tabla
rls AS (
  SELECT
    '02_rls' AS seccion,
    relname AS objeto,
    format('rls_enabled=%s, rls_forced=%s', relrowsecurity, relforcerowsecurity) AS definicion
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
),

-- 3. Políticas RLS
politicas AS (
  SELECT
    '03_politicas' AS seccion,
    tablename || ' :: ' || policyname AS objeto,
    format(
      E'cmd=%s\npermissive=%s\nroles=%s\nUSING: %s\nWITH CHECK: %s',
      cmd, permissive, array_to_string(roles, ','),
      COALESCE(qual, '-'), COALESCE(with_check, '-')
    ) AS definicion
  FROM pg_policies
  WHERE schemaname = 'public'
),

-- 4. Funciones (definición completa)
funciones AS (
  SELECT
    '04_funciones' AS seccion,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS objeto,
    pg_get_functiondef(p.oid) AS definicion
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
),

-- 5. Permisos de ejecución sobre funciones (quién puede llamarlas)
grants_funciones AS (
  SELECT
    '05_grants_funciones' AS seccion,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS objeto,
    format(
      'security_definer=%s | anon=%s | authenticated=%s | owner=%s',
      p.prosecdef,
      has_function_privilege('anon', p.oid, 'EXECUTE'),
      has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      p.proowner::regrole
    ) AS definicion
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
),

-- 6. Permisos sobre tablas para anon / authenticated
grants_tablas AS (
  SELECT
    '06_grants_tablas' AS seccion,
    table_name AS objeto,
    string_agg(grantee || ': ' || privs, E'\n' ORDER BY grantee) AS definicion
  FROM (
    SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    GROUP BY table_name, grantee
  ) g
  GROUP BY table_name
),

-- 7. Triggers
triggers AS (
  SELECT
    '07_triggers' AS seccion,
    c.relname || ' :: ' || t.tgname AS objeto,
    pg_get_triggerdef(t.oid) AS definicion
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
),

-- 8. Tipos ENUM
enums AS (
  SELECT
    '08_enums' AS seccion,
    t.typname AS objeto,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS definicion
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typnamespace = 'public'::regnamespace
  GROUP BY t.typname
),

-- 9. Constraints (PK, FK, UNIQUE, CHECK)
constraints AS (
  SELECT
    '09_constraints' AS seccion,
    c.conrelid::regclass::text || ' :: ' || c.conname AS objeto,
    pg_get_constraintdef(c.oid) AS definicion
  FROM pg_constraint c
  WHERE c.connamespace = 'public'::regnamespace
),

-- 10. Índices
indices AS (
  SELECT
    '10_indices' AS seccion,
    tablename || ' :: ' || indexname AS objeto,
    indexdef AS definicion
  FROM pg_indexes
  WHERE schemaname = 'public'
),

-- 11. Vistas
vistas AS (
  SELECT
    '11_vistas' AS seccion,
    table_name AS objeto,
    view_definition AS definicion
  FROM information_schema.views
  WHERE table_schema = 'public'
),

-- 12. Buckets de Storage y sus políticas
storage AS (
  SELECT
    '12_storage_buckets' AS seccion,
    id AS objeto,
    format('public=%s', public) AS definicion
  FROM storage.buckets
  UNION ALL
  SELECT
    '12_storage_politicas',
    policyname,
    format(E'cmd=%s\nroles=%s\nUSING: %s\nWITH CHECK: %s',
      cmd, array_to_string(roles, ','), COALESCE(qual, '-'), COALESCE(with_check, '-'))
  FROM pg_policies
  WHERE schemaname = 'storage'
),

-- 13. Conteo de filas por tabla (orientativo, para dimensionar)
conteos AS (
  SELECT
    '13_conteo_filas' AS seccion,
    relname AS objeto,
    format('~%s filas (estimado)', n_live_tup) AS definicion
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
),

-- 14. Versión y extensiones
meta AS (
  SELECT '00_meta' AS seccion, 'postgres_version' AS objeto, version() AS definicion
  UNION ALL
  SELECT '00_meta', 'extensiones',
         string_agg(extname || ' ' || extversion, ', ' ORDER BY extname)
  FROM pg_extension
)

SELECT seccion, objeto, definicion FROM meta
UNION ALL SELECT * FROM tablas
UNION ALL SELECT * FROM rls
UNION ALL SELECT * FROM politicas
UNION ALL SELECT * FROM funciones
UNION ALL SELECT * FROM grants_funciones
UNION ALL SELECT * FROM grants_tablas
UNION ALL SELECT * FROM triggers
UNION ALL SELECT * FROM enums
UNION ALL SELECT * FROM constraints
UNION ALL SELECT * FROM indices
UNION ALL SELECT * FROM vistas
UNION ALL SELECT * FROM storage
UNION ALL SELECT * FROM conteos
ORDER BY seccion, objeto;
