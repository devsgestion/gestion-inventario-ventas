-- ============================================
-- FIX: Crear perfil automáticamente al registrar usuario
-- ============================================
-- ⚠️ EJECUTAR EN SUPABASE SQL EDITOR

-- 1️⃣ Eliminar trigger antiguo si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2️⃣ Crear función que maneja nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear perfil si no existe
    IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = NEW.id) THEN
        
        -- Verificar que la empresa existe antes de crear el perfil
        IF (NEW.raw_user_meta_data->>'empresa_id') IS NOT NULL 
           AND EXISTS (SELECT 1 FROM public.empresas WHERE id = (NEW.raw_user_meta_data->>'empresa_id')::UUID) THEN
            
            -- Crear perfil con empresa
            INSERT INTO public.perfiles (
                id,
                nombre,
                nombre_completo,
                empresa_id,
                rol,
                activo,
                created_by
            )
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
                COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
                (NEW.raw_user_meta_data->>'empresa_id')::UUID,
                COALESCE((NEW.raw_user_meta_data->>'rol')::user_role, 'usuario'::user_role),
                true,
                (NEW.raw_user_meta_data->>'created_by')::UUID
            );
            
        ELSE
            -- Si no hay empresa, solo logear (no crear perfil)
            -- Esto permite que el perfil se cree manualmente después
            RAISE NOTICE 'Usuario creado sin perfil - empresa_id no válido: %', NEW.raw_user_meta_data->>'empresa_id';
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ Crear trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4️⃣ Verificación
SELECT '✅ Trigger de auto-creación de perfil configurado correctamente' as status;

-- 5️⃣ Probar que funciona
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    'on_auth_user_created configurado' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' 
AND t.tgname = 'on_auth_user_created';
