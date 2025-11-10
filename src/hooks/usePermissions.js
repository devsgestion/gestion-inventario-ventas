// src/hooks/usePermissions.js
// Hook centralizado para manejo de permisos por rol

import { useMemo } from 'react';
import useAuth from './useAuth';

/**
 * NUEVA ESTRUCTURA DE ROLES (6 roles):
 * 
 * 1. gestor: Solo Inventario + Pedidos
 * 2. vendedor: Inventario + POS + Cambios/Devoluciones
 * 3. admin_vendedor: Todo lo de vendedor + Dashboard Avanzado
 * 4. admin_gestor: Todo lo de gestor + Dashboard Avanzado
 * 5. admin: Todos los módulos MENOS Panel de Admin (usuarios)
 * 6. superadmin: Acceso total a todo
 */

/**
 * Hook para verificar permisos basados en roles
 * @returns {Object} Objeto con métodos de verificación de permisos
 */
const usePermissions = () => {
    const { perfil } = useAuth();
    const rol = perfil?.rol || 'vendedor';
    
    // Normalizar rol para aceptar variantes antiguas
    const normalizedRol = rol === 'administrador' ? 'admin' : rol.toLowerCase();

    const permissions = useMemo(() => {
        // ============================================================
        // DEFINICIÓN DE PERMISOS POR ROL
        // ============================================================
        
        const rolePermissions = {
            // --------------------------------------------------------
            // GESTOR - Solo Inventario + Pedidos
            // --------------------------------------------------------
            gestor: {
                // Panel de Administración
                canAccessAdminPanel: false,
                canManageUsers: false,
                canViewUsers: false,
                canCreateUsers: false,
                canDeleteUsers: false,
                
                // Ventas / POS
                canViewSales: false,
                canMakeSales: false,
                canCancelSales: false,
                canEditSales: false,
                canOpenCloseCaja: false,
                
                // Inventario
                canViewInventory: true,
                canEditInventory: true,
                canAddProducts: true,
                canDeleteProducts: false,
                canAdjustStock: true,
                canRegisterPurchase: true,
                canImportProducts: true,
                canExportInventory: true,
                
                // Pedidos
                canViewPedidos: true,
                canCreatePedidos: true,
                canEditPedidos: true,
                canDeletePedidos: false,
                
                // Cambios y Devoluciones
                canProcessCambios: false,
                canViewCambios: false,
                canCancelCambios: false,
                
                // Dashboard - SIN ACCESO
                canViewDashboard: false,
                canViewBasicMetrics: false,
                canViewFinancialMetrics: false,
                canViewInventoryValue: false,
                canViewAdvancedAnalytics: false,
                canExportDashboard: false,
                
                // Configuración y Reportes
                canAccessSettings: true,
                canEditCompanyInfo: false,
                canViewAdvancedReports: false,
                canViewCashHistory: false,
                canExportData: false,
                
                // Gastos
                canViewExpenses: false,
                canRegisterExpenses: false,
                canCancelExpenses: false,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },

            // --------------------------------------------------------
            // VENDEDOR - Inventario + POS + Cambios/Devoluciones
            // --------------------------------------------------------
            vendedor: {
                // Panel de Administración
                canAccessAdminPanel: false,
                canManageUsers: false,
                canViewUsers: false,
                canCreateUsers: false,
                canDeleteUsers: false,
                
                // Ventas / POS
                canViewSales: true,
                canMakeSales: true,
                canCancelSales: false,
                canEditSales: false,
                canOpenCloseCaja: true,      // ✅ NUEVO: Puede abrir/cerrar caja
                
                // Inventario
                canViewInventory: true,
                canEditInventory: true,       // ✅ NUEVO: Puede editar productos
                canAddProducts: false,
                canDeleteProducts: false,
                canAdjustStock: false,
                canRegisterPurchase: false,
                canImportProducts: false,
                canExportInventory: false,
                
                // Pedidos
                canViewPedidos: false,
                canCreatePedidos: false,
                canEditPedidos: false,
                canDeletePedidos: false,
                
                // Cambios y Devoluciones
                canProcessCambios: true,
                canViewCambios: true,
                canCancelCambios: false,
                
                // Dashboard - SIN ACCESO
                canViewDashboard: false,
                canViewBasicMetrics: false,
                canViewFinancialMetrics: false,
                canViewInventoryValue: false,
                canViewAdvancedAnalytics: false,
                canExportDashboard: false,
                
                // Configuración y Reportes
                canAccessSettings: true,      // ✅ NUEVO: Acceso a configuración
                canEditCompanyInfo: false,
                canViewAdvancedReports: false,
                canViewCashHistory: false,
                canExportData: false,
                
                // Gastos
                canViewExpenses: false,
                canRegisterExpenses: false,
                canCancelExpenses: false,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },

            // --------------------------------------------------------
            // ADMIN_VENDEDOR - Todo lo de vendedor + Dashboard Avanzado
            // --------------------------------------------------------
            admin_vendedor: {
                // Panel de Administración
                canAccessAdminPanel: false,
                canManageUsers: false,
                canViewUsers: false,
                canCreateUsers: false,
                canDeleteUsers: false,
                
                // Ventas / POS
                canViewSales: true,
                canMakeSales: true,
                canCancelSales: false,
                canEditSales: true,
                canOpenCloseCaja: true,
                
                // Inventario (solo consulta)
                canViewInventory: true,
                canEditInventory: false,
                canAddProducts: false,
                canDeleteProducts: false,
                canAdjustStock: false,
                canRegisterPurchase: false,
                canImportProducts: false,
                canExportInventory: true,
                
                // Pedidos
                canViewPedidos: false,
                canCreatePedidos: false,
                canEditPedidos: false,
                canDeletePedidos: false,
                
                // Cambios y Devoluciones
                canProcessCambios: true,
                canViewCambios: true,
                canCancelCambios: true,
                
                // Dashboard (AVANZADO) 🔥
                canViewDashboard: true,
                canViewBasicMetrics: true,
                canViewFinancialMetrics: true,
                canViewInventoryValue: true,
                canViewAdvancedAnalytics: true,
                canExportDashboard: true,
                
                // Configuración y Reportes
                canAccessSettings: true,      // ✅ Acceso a configuración
                canEditCompanyInfo: false,
                canViewAdvancedReports: true,
                canViewCashHistory: true,
                canExportData: true,
                
                // Gastos
                canViewExpenses: true,
                canRegisterExpenses: true,
                canCancelExpenses: true,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },

            // --------------------------------------------------------
            // ADMIN_GESTOR - Todo lo de gestor + Dashboard Avanzado
            // --------------------------------------------------------
            admin_gestor: {
                // Panel de Administración
                canAccessAdminPanel: false,
                canManageUsers: false,
                canViewUsers: false,
                canCreateUsers: false,
                canDeleteUsers: false,
                
                // Ventas / POS
                canViewSales: false,
                canMakeSales: false,
                canCancelSales: false,
                canEditSales: false,
                canOpenCloseCaja: false,
                
                // Inventario
                canViewInventory: true,
                canEditInventory: true,
                canAddProducts: true,
                canDeleteProducts: true,
                canAdjustStock: true,
                canRegisterPurchase: true,
                canImportProducts: true,
                canExportInventory: true,
                
                // Pedidos
                canViewPedidos: true,
                canCreatePedidos: true,
                canEditPedidos: true,
                canDeletePedidos: true,
                
                // Cambios y Devoluciones
                canProcessCambios: false,
                canViewCambios: false,
                canCancelCambios: false,
                
                // Dashboard (AVANZADO) 🔥
                canViewDashboard: true,
                canViewBasicMetrics: true,
                canViewFinancialMetrics: true,
                canViewInventoryValue: true,
                canViewAdvancedAnalytics: true,
                canExportDashboard: true,
                
                // Configuración y Reportes
                canAccessSettings: true,      // ✅ Acceso a configuración
                canEditCompanyInfo: false,
                canViewAdvancedReports: true,
                canViewCashHistory: true,
                canExportData: true,
                
                // Gastos
                canViewExpenses: true,
                canRegisterExpenses: true,
                canCancelExpenses: true,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },

            // --------------------------------------------------------
            // ADMIN - Todos los módulos MENOS Panel de Admin
            // --------------------------------------------------------
            admin: {
                // Panel de Administración
                canAccessAdminPanel: false, // 🚫 NO accede al panel de usuarios
                canManageUsers: false,
                canViewUsers: false,
                canCreateUsers: false,
                canDeleteUsers: false,
                
                // Ventas / POS
                canViewSales: true,
                canMakeSales: true,
                canCancelSales: true,
                canEditSales: true,
                canOpenCloseCaja: true,
                
                // Inventario
                canViewInventory: true,
                canEditInventory: true,
                canAddProducts: true,
                canDeleteProducts: true,
                canAdjustStock: true,
                canRegisterPurchase: true,
                canImportProducts: true,
                canExportInventory: true,
                
                // Pedidos
                canViewPedidos: true,
                canCreatePedidos: true,
                canEditPedidos: true,
                canDeletePedidos: true,
                
                // Cambios y Devoluciones
                canProcessCambios: true,
                canViewCambios: true,
                canCancelCambios: true,
                
                // Dashboard (COMPLETO)
                canViewDashboard: true,
                canViewBasicMetrics: true,
                canViewFinancialMetrics: true,
                canViewInventoryValue: true,
                canViewAdvancedAnalytics: true,
                canExportDashboard: true,
                
                // Configuración y Reportes
                canAccessSettings: true,
                canEditCompanyInfo: true,
                canViewAdvancedReports: true,
                canViewCashHistory: true,
                canExportData: true,
                
                // Gastos
                canViewExpenses: true,
                canRegisterExpenses: true,
                canCancelExpenses: true,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },

            // --------------------------------------------------------
            // SUPERADMIN - Acceso total a TODO
            // --------------------------------------------------------
            superadmin: {
                // Panel de Administración
                canAccessAdminPanel: true, // ✅ Acceso completo
                canManageUsers: true,
                canViewUsers: true,
                canCreateUsers: true,
                canDeleteUsers: true,
                
                // Ventas / POS
                canViewSales: true,
                canMakeSales: true,
                canCancelSales: true,
                canEditSales: true,
                canOpenCloseCaja: true,
                
                // Inventario
                canViewInventory: true,
                canEditInventory: true,
                canAddProducts: true,
                canDeleteProducts: true,
                canAdjustStock: true,
                canRegisterPurchase: true,
                canImportProducts: true,
                canExportInventory: true,
                
                // Pedidos
                canViewPedidos: true,
                canCreatePedidos: true,
                canEditPedidos: true,
                canDeletePedidos: true,
                
                // Cambios y Devoluciones
                canProcessCambios: true,
                canViewCambios: true,
                canCancelCambios: true,
                
                // Dashboard (COMPLETO)
                canViewDashboard: true,
                canViewBasicMetrics: true,
                canViewFinancialMetrics: true,
                canViewInventoryValue: true,
                canViewAdvancedAnalytics: true,
                canExportDashboard: true,
                
                // Configuración y Reportes
                canAccessSettings: true,
                canEditCompanyInfo: true,
                canViewAdvancedReports: true,
                canViewCashHistory: true,
                canExportData: true,
                
                // Gastos
                canViewExpenses: true,
                canRegisterExpenses: true,
                canCancelExpenses: true,
                
                // Perfil
                canViewOwnProfile: true,
                canEditOwnProfile: true,
            },
        };

        // Obtener permisos del rol actual (fallback a vendedor)
        const currentPermissions = rolePermissions[normalizedRol] || rolePermissions.vendedor;

        return {
            // Rol actual del usuario
            rol: normalizedRol,
            rolOriginal: rol,

            // Verificaciones de rol
            isSuperAdmin: normalizedRol === 'superadmin',
            isAdmin: normalizedRol === 'admin',
            isAdminVendedor: normalizedRol === 'admin_vendedor',
            isAdminGestor: normalizedRol === 'admin_gestor',
            isVendedor: normalizedRol === 'vendedor',
            isGestor: normalizedRol === 'gestor',
            
            // Todos los permisos del rol
            ...currentPermissions,
            
            // Método helper para verificar acceso a rutas
            canAccessRoute: (route) => {
                const routePermissions = {
                    '/admin': currentPermissions.canAccessAdminPanel,
                    '/admin/users': currentPermissions.canAccessAdminPanel,
                    '/dashboard': currentPermissions.canViewDashboard,
                    '/ventas': currentPermissions.canViewSales,
                    '/inventario': currentPermissions.canViewInventory,
                    '/pedidos': currentPermissions.canViewPedidos,
                    '/cambios-devoluciones': currentPermissions.canViewCambios,
                    '/historial': currentPermissions.canViewCashHistory,
                    '/historial-caja': currentPermissions.canViewCashHistory,
                    '/gastos': currentPermissions.canViewExpenses,
                    '/settings': currentPermissions.canAccessSettings,
                    '/configuracion': currentPermissions.canAccessSettings,
                    '/profile': true,
                    '/perfil': true,
                };
                
                return routePermissions[route] ?? false;
            },
            
            // Método helper para obtener ruta por defecto según rol
            getDefaultRoute: () => {
                if (normalizedRol === 'superadmin') return '/admin/users';
                if (normalizedRol === 'admin') return '/dashboard';
                if (normalizedRol === 'admin_vendedor') return '/ventas';
                if (normalizedRol === 'admin_gestor') return '/inventario';
                if (normalizedRol === 'vendedor') return '/ventas';
                if (normalizedRol === 'gestor') return '/inventario';
                return '/ventas';
            },

            // Método helper para obtener nombre legible del rol
            getRoleName: () => {
                const roleNames = {
                    superadmin: 'Super Administrador',
                    admin: 'Administrador',
                    admin_vendedor: 'Admin Vendedor',
                    admin_gestor: 'Admin Gestor',
                    vendedor: 'Vendedor',
                    gestor: 'Gestor',
                };
                return roleNames[normalizedRol] || 'Vendedor';
            }
        };
    }, [normalizedRol, rol]);

    return permissions;
};

export default usePermissions;