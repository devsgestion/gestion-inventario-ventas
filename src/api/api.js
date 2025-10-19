// src/api/api.js
// Centraliza las llamadas complejas a la base de datos

import { supabase } from './supabaseClient'; // Asegúrate de que esta ruta sea correcta

/**
 * Registra un nuevo usuario en Supabase Auth y crea su empresa (tenant) y perfil de administrador.
 * @param {object} formData - Datos del formulario (emailAdmin, passwordAdmin, nombreEmpresa).
 * @returns {object} Objeto de datos del usuario.
 */
export async function registerNewCompany(formData) {
    const { emailAdmin, passwordAdmin, nombreEmpresa } = formData;
    
    // 1. Crear el usuario en Auth (Supabase)
    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: emailAdmin,
        password: passwordAdmin
    });

    if (authError) {
        throw new Error(`Error de autenticación: ${authError.message}`);
    }

    if (user) {
        // 2. Llamar a la RPC para crear el TENANT y el PERFIL
        const { error: dbError } = await supabase.rpc('create_tenant_and_profile', {
            user_id_input: user.id,
            email_input: user.email,
            // Usamos el nombre de la empresa como nombre del primer administrador del cliente
            nombre_usuario_input: `Admin - ${nombreEmpresa}`, 
            nombre_empresa_input: nombreEmpresa
        });

        if (dbError) {
            // Si la BD falla, revertimos la creación del usuario en Auth
            await supabase.auth.admin.deleteUser(user.id); 
            throw new Error(`Error de BD al crear empresa: ${dbError.message}. Usuario eliminado.`);
        }
        
        return user; // Retorna el usuario creado
    }
    
    // Debería ser inalcanzable, pero como fallback
    throw new Error("No se pudo crear el usuario.");
}