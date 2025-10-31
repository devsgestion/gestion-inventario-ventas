// src/hooks/usePermissions.js
// Hook centralizado para manejo de permisos por rol

import { useMemo } from 'react';
import useAuth from './useAuth';

/**
 * Hook para verificar permisos basados en roles
 * @returns {Object} Objeto con métodos de verificación de permisos
 */
const usePermissions = () => {
    const { perfil } = useAuth();
    const rol = perfil?.rol || 'usuario';
    
    // Normalizar rol para aceptar variantes
    const normalizedRol = rol === 'administrador' ? 'admin' : rol;

    const permissions = useMemo(() => {
        return {
            // Rol actual del usuario (normalizado)
            rol: normalizedRol,
            rolOriginal: rol, // Rol original de la BD

            // Verificaciones de rol
            isSuperAdmin: normalizedRol === 'superadmin',
            isAdmin: normalizedRol === 'admin',
            isUsuario: normalizedRol === 'usuario',
            
            // Verificaciones de permisos específicos
            
            // GESTIÓN DE USUARIOS
            canManageUsers: normalizedRol === 'superadmin',
            canViewUsers: normalizedRol === 'superadmin',
            canCreateUsers: normalizedRol === 'superadmin',
            canDeleteUsers: normalizedRol === 'superadmin',
            
            // CONFIGURACIÓN DE EMPRESA
            canAccessSettings: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canEditCompanyInfo: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            
            // REPORTES Y HISTORIAL
            canViewAdvancedReports: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canViewCashHistory: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canExportData: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            
            // INVENTARIO
            canViewInventory: true, // Todos
            canEditInventory: true, // Todos
            canAddProducts: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canDeleteProducts: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canAdjustStock: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canRegisterPurchase: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            
            // VENTAS
            canViewSales: true, // Todos
            canMakeSales: true, // Todos
            canCancelSales: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            canEditSales: normalizedRol === 'superadmin' || normalizedRol === 'admin',
            
            // PERFIL
            canViewOwnProfile: true, // Todos
            canEditOwnProfile: true, // Todos
            
            // Método helper para verificar acceso a rutas
            canAccessRoute: (route) => {
                const routePermissions = {
                    '/admin': normalizedRol === 'superadmin',
                    '/settings': normalizedRol === 'superadmin' || normalizedRol === 'admin',
                    '/historial': normalizedRol === 'superadmin' || normalizedRol === 'admin',
                    '/inventario': true,
                    '/ventas': true,
                    '/profile': true,
                };
                
                return routePermissions[route] ?? false;
            },
            
            // Método helper para obtener ruta por defecto según rol
            getDefaultRoute: () => {
                if (normalizedRol === 'superadmin') return '/admin';
                if (normalizedRol === 'admin') return '/inventario';
                return '/ventas';
            }
        };
    }, [normalizedRol, rol]);

    return permissions;
};

export default usePermissions;
