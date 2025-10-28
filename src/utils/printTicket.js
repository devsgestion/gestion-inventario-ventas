// src/utils/printTicket.js
// Utilidad para generar e imprimir tickets de venta

import { formatCurrencyCOP } from './formatters';

/**
 * Genera e imprime un ticket de venta
 * @param {Object} ventaData - Datos de la venta
 * @param {string} ventaData.numeroVenta - Número de la venta
 * @param {Array} ventaData.items - Items vendidos
 * @param {number} ventaData.total - Total de la venta
 * @param {string} ventaData.fecha - Fecha de la venta
 * @param {Object} ventaData.empresa - Datos de la empresa
 */
export const printTicket = (ventaData) => {
    const { numeroVenta, items, total, fecha, empresa } = ventaData;

    // Crear el contenido HTML del ticket
    const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ticket de Venta #${numeroVenta}</title>
            <style>
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    padding: 10px;
                    width: 80mm;
                    background: white;
                    color: black;
                }
                
                .ticket {
                    width: 100%;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                }
                
                .empresa-nombre {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .ticket-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 8px;
                }
                
                .info-line {
                    margin: 3px 0;
                    font-size: 11px;
                }
                
                .items-section {
                    margin: 15px 0;
                }
                
                .item {
                    margin-bottom: 8px;
                    border-bottom: 1px dotted #999;
                    padding-bottom: 5px;
                }
                
                .item-name {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .item-details {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                }
                
                .totals {
                    margin-top: 15px;
                    border-top: 2px solid #000;
                    padding-top: 10px;
                }
                
                .total-line {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                    font-size: 13px;
                }
                
                .total-final {
                    font-weight: bold;
                    font-size: 16px;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 2px double #000;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 2px dashed #000;
                    font-size: 10px;
                }
                
                .disclaimer {
                    margin-top: 10px;
                    font-size: 9px;
                    font-style: italic;
                    color: #555;
                }
                
                @media print {
                    body {
                        padding: 5px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <!-- HEADER -->
                <div class="header">
                    <div class="empresa-nombre">${empresa.nombre || 'MI NEGOCIO'}</div>
                    <div class="ticket-title">COMPROBANTE DE VENTA</div>
                </div>
                
                <!-- INFO -->
                <div class="info-section">
                    <div class="info-line">N° Venta: <strong>${numeroVenta}</strong></div>
                    <div class="info-line">Fecha: ${new Date(fecha).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                    })}</div>
                </div>
                
                <!-- ITEMS -->
                <div class="items-section">
                    ${items.map(item => `
                        <div class="item">
                            <div class="item-name">${item.nombre}</div>
                            <div class="item-details">
                                <span>${item.cantidad} x ${formatCurrencyCOP(item.precio_unitario)}</span>
                                <span><strong>${formatCurrencyCOP(item.cantidad * item.precio_unitario)}</strong></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- TOTALS -->
                <div class="totals">
                    <div class="total-line">
                        <span>CANTIDAD DE ITEMS:</span>
                        <strong>${items.reduce((sum, item) => sum + item.cantidad, 0)}</strong>
                    </div>
                    <div class="total-line total-final">
                        <span>TOTAL A PAGAR:</span>
                        <span>${formatCurrencyCOP(total)}</span>
                    </div>
                </div>
                
                <!-- FOOTER -->
                <div class="footer">
                    <div>¡Gracias por su compra!</div>
                    <div class="disclaimer">
                        * Este documento NO es factura *<br>
                        No válido como soporte contable
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (printWindow) {
        printWindow.document.write(ticketHTML);
        printWindow.document.close();
        
        // Esperar a que cargue y luego imprimir
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // No cerrar automáticamente para permitir reimprimir si es necesario
            // printWindow.close();
        };
    } else {
        alert('Por favor, permite las ventanas emergentes para imprimir el ticket');
    }
};

/**
 * Genera un ticket en formato de texto plano para copiar/compartir
 * Útil para WhatsApp o mensajes
 */
export const generateTextTicket = (ventaData) => {
    const { numeroVenta, items, total, fecha, empresa } = ventaData;
    
    let ticket = `
╔════════════════════════════════════╗
║    ${(empresa.nombre || 'MI NEGOCIO').toUpperCase().padEnd(30)}    ║
║      COMPROBANTE DE VENTA          ║
╠════════════════════════════════════╣
║ N° Venta: ${numeroVenta.padEnd(24)}║
║ Fecha: ${new Date(fecha).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).padEnd(27)}║
╠════════════════════════════════════╣
`;

    items.forEach(item => {
        ticket += `║ ${item.nombre.padEnd(32)}║\n`;
        ticket += `║ ${item.cantidad} x ${formatCurrencyCOP(item.precio_unitario).padEnd(24)}║\n`;
        ticket += `║ ${formatCurrencyCOP(item.cantidad * item.precio_unitario).padStart(34)}║\n`;
        ticket += `╟────────────────────────────────────╢\n`;
    });

    ticket += `║ TOTAL: ${formatCurrencyCOP(total).padStart(28)}║
╠════════════════════════════════════╣
║      ¡Gracias por su compra!       ║
║                                    ║
║  * Este documento NO es factura *  ║
║   No válido como soporte contable  ║
╚════════════════════════════════════╝
    `;

    return ticket.trim();
};
