// src/hooks/usePermissions.js
// Hook centralizado para manejo de permisos por rol

import { useMemo } from 'react';
import useAuth from './useAuth';

/**
 * Sistema de Roles:
 * - superadmin: Acceso total + Panel de Admin
 * - admin: Acceso total excepto Panel de Admin
 * - vendedor: Inventario, Punto de Venta, Historial de Caja
 * - gestor: Inventario y Gestor de Pedidos
 * - usuario: Solo Punto de Venta (básico)
 */

/**
 * Hook para verificar permisos basados en roles
 * @returns {Object} Objeto con métodos de verificación de permisos
 */
const usePermissions = () => {
    const { perfil } = useAuth();
    const rol = perfil?.rol || 'usuario';
    
    // Normalizar rol para aceptar variantes
    const normalizedRol = rol === 'administrador' ? 'admin' : rol.toLowerCase();

    const permissions = useMemo(() => {
        return {
            // Rol actual del usuario (normalizado)
            rol: normalizedRol,
            rolOriginal: rol, // Rol original de la BD

            // Verificaciones de rol
            isSuperAdmin: normalizedRol === 'superadmin',
            isAdmin: normalizedRol === 'admin',
            isVendedor: normalizedRol === 'vendedor',
            isGestor: normalizedRol === 'gestor',
            isUsuario: normalizedRol === 'usuario',
            
            // Verificaciones de permisos específicos
            
            // GESTIÓN DE USUARIOS (Solo SuperAdmin)
            canManageUsers: normalizedRol === 'superadmin',
            canViewUsers: normalizedRol === 'superadmin',
            canCreateUsers: normalizedRol === 'superadmin',
            canDeleteUsers: normalizedRol === 'superadmin',
            
            // CONFIGURACIÓN DE EMPRESA (SuperAdmin, Admin, Vendedor, Gestor)
            canAccessSettings: ['superadmin', 'admin', 'vendedor', 'gestor'].includes(normalizedRol),
            canEditCompanyInfo: ['superadmin', 'admin'].includes(normalizedRol),
            
            // REPORTES Y HISTORIAL
            canViewAdvancedReports: ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
            canViewCashHistory: ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
            canExportData: ['superadmin', 'admin'].includes(normalizedRol),
            
            // INVENTARIO
            canViewInventory: ['superadmin', 'admin', 'vendedor', 'gestor'].includes(normalizedRol),
            canEditInventory: ['superadmin', 'admin', 'vendedor', 'gestor'].includes(normalizedRol),
            canAddProducts: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            canDeleteProducts: ['superadmin', 'admin'].includes(normalizedRol),
            canAdjustStock: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            canRegisterPurchase: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            
            // VENTAS
            canViewSales: true, // Todos pueden ver ventas
            canMakeSales: true, // Todos pueden hacer ventas
            canCancelSales: ['superadmin', 'admin'].includes(normalizedRol),
            canEditSales: ['superadmin', 'admin'].includes(normalizedRol),
            canOpenCloseCaja: ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
            
            // PEDIDOS
            canViewPedidos: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            canCreatePedidos: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            canEditPedidos: ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
            canDeletePedidos: ['superadmin', 'admin'].includes(normalizedRol),
            
            // CAMBIOS Y DEVOLUCIONES
            canProcessCambios: ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
            canViewCambios: ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
            canCancelCambios: ['superadmin', 'admin'].includes(normalizedRol),
            
            // PERFIL
            canViewOwnProfile: true, // Todos
            canEditOwnProfile: true, // Todos
            
            // Método helper para verificar acceso a rutas
            canAccessRoute: (route) => {
                const routePermissions = {
                    '/admin': normalizedRol === 'superadmin',
                    '/settings': ['superadmin', 'admin', 'vendedor', 'gestor'].includes(normalizedRol),
                    '/historial': ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
                    '/inventario': ['superadmin', 'admin', 'vendedor', 'gestor'].includes(normalizedRol),
                    '/ventas': true, // Todos tienen acceso
                    '/pedidos': ['superadmin', 'admin', 'gestor'].includes(normalizedRol),
                    '/cambios-devoluciones': ['superadmin', 'admin', 'vendedor'].includes(normalizedRol),
                    '/profile': true,
                };
                
                return routePermissions[route] ?? false;
            },
            
            // Método helper para obtener ruta por defecto según rol
            getDefaultRoute: () => {
                if (normalizedRol === 'superadmin') return '/admin';
                if (normalizedRol === 'admin') return '/inventario';
                if (normalizedRol === 'vendedor') return '/ventas';
                if (normalizedRol === 'gestor') return '/pedidos';
                return '/ventas';
            },

            // Método helper para obtener nombre legible del rol
            getRoleName: () => {
                const roleNames = {
                    superadmin: 'Super Administrador',
                    admin: 'Administrador',
                    vendedor: 'Vendedor',
                    gestor: 'Gestor de Pedidos',
                    usuario: 'Usuario'
                };
                return roleNames[normalizedRol] || 'Usuario';
            }
        };
    }, [normalizedRol, rol]);

    return permissions;
};

export default usePermissions;