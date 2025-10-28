// src/utils/printInventory.js
// Utilidad para imprimir reportes de inventario

import { formatCurrencyCOP } from './formatters';

/**
 * Imprime la lista completa de inventario
 */
export const printInventoryList = (productos, empresaNombre) => {
    const fecha = new Date().toLocaleDateString('es-CO', {
        dateStyle: 'full'
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Inventario - ${empresaNombre}</title>
            <style>
                @page {
                    size: A4;
                    margin: 20mm;
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #3498db;
                }
                
                .empresa {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }
                
                .titulo {
                    font-size: 18px;
                    color: #34495e;
                    margin-bottom: 5px;
                }
                
                .fecha {
                    font-size: 11px;
                    color: #7f8c8d;
                }
                
                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #ecf0f1;
                    border-radius: 5px;
                }
                
                .stat-item {
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 10px;
                    color: #7f8c8d;
                    text-transform: uppercase;
                }
                
                .stat-value {
                    font-size: 20px;
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                
                thead {
                    background-color: #34495e;
                    color: white;
                }
                
                th {
                    padding: 10px 8px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                td {
                    padding: 8px;
                    border-bottom: 1px solid #ecf0f1;
                    font-size: 11px;
                }
                
                tbody tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                
                tbody tr:hover {
                    background-color: #e3f2fd;
                }
                
                .low-stock {
                    background-color: #fff3cd !important;
                }
                
                .low-stock td {
                    color: #856404;
                    font-weight: 600;
                }
                
                .status-active {
                    color: #27ae60;
                    font-weight: bold;
                }
                
                .status-inactive {
                    color: #95a5a6;
                    font-style: italic;
                }
                
                .footer {
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px solid #bdc3c7;
                    text-align: center;
                    font-size: 10px;
                    color: #7f8c8d;
                }
                
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="empresa">${empresaNombre}</div>
                <div class="titulo">LISTADO DE INVENTARIO</div>
                <div class="fecha">${fecha}</div>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-label">Total Productos</div>
                    <div class="stat-value">${productos.length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Activos</div>
                    <div class="stat-value">${productos.filter(p => p.activo !== false).length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Stock Bajo</div>
                    <div class="stat-value">${productos.filter(p => p.stock_actual <= p.alerta_stock_min).length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Valor Total Inventario</div>
                    <div class="stat-value">${formatCurrencyCOP(
                        productos.reduce((sum, p) => sum + (p.stock_actual * p.precio_venta), 0)
                    )}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Ref.</th>
                        <th>Nombre del Producto</th>
                        <th style="text-align: center;">Stock</th>
                        <th style="text-align: right;">Precio Venta</th>
                        <th style="text-align: right;">Costo</th>
                        <th style="text-align: center;">Alerta Mín.</th>
                        <th style="text-align: center;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(p => `
                        <tr class="${p.stock_actual <= p.alerta_stock_min ? 'low-stock' : ''}">
                            <td>${p.codigo_referencia || '-'}</td>
                            <td>${p.nombre}</td>
                            <td style="text-align: center;">
                                ${p.stock_actual}
                                ${p.stock_actual <= p.alerta_stock_min ? ' ⚠️' : ''}
                            </td>
                            <td style="text-align: right;">${formatCurrencyCOP(p.precio_venta)}</td>
                            <td style="text-align: right;">${formatCurrencyCOP(p.precio_costo || 0)}</td>
                            <td style="text-align: center;">${p.alerta_stock_min}</td>
                            <td style="text-align: center;">
                                <span class="${p.activo !== false ? 'status-active' : 'status-inactive'}">
                                    ${p.activo !== false ? '✓ Activo' : 'Inactivo'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Documento generado automáticamente - ${new Date().toLocaleString('es-CO')}</p>
                <p style="margin-top: 5px;">Total de registros: ${productos.length}</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    } else {
        alert('Por favor, permite las ventanas emergentes para imprimir');
    }
};

/**
 * Imprime solo productos con stock bajo
 */
export const printLowStockReport = (productos, empresaNombre) => {
    const productosConStockBajo = productos.filter(p => 
        p.stock_actual <= p.alerta_stock_min && p.activo !== false
    );

    if (productosConStockBajo.length === 0) {
        alert('No hay productos con stock bajo para imprimir');
        return;
    }

    printInventoryList(productosConStockBajo, empresaNombre);
};
