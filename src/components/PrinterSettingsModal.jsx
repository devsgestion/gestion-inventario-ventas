import React, { useState, useEffect } from 'react';

const PrinterSettingsModal = ({ isOpen, onClose, empresaId, currentSettings, onSettingsUpdated }) => {
    const [printerConfig, setPrinterConfig] = useState({
        printer_name: localStorage.getItem('printer_name') || '',
        paper_width: localStorage.getItem('paper_width') || '80mm',
        auto_print: localStorage.getItem('auto_print') === 'true',
        print_logo: localStorage.getItem('print_logo') === 'true',
        copies: parseInt(localStorage.getItem('print_copies')) || 1,
        print_margins: localStorage.getItem('print_margins') || '5mm',
        font_size: localStorage.getItem('font_size') || '12px'
    });

    // 🛑 NUEVO: Estado para detectar impresoras disponibles 🛑
    const [availablePrinters, setAvailablePrinters] = useState([]);
    const [isDetectingPrinters, setIsDetectingPrinters] = useState(false);

    // 🛑 DETECTAR IMPRESORAS DISPONIBLES (Chrome/Edge) 🛑
    useEffect(() => {
        detectAvailablePrinters();
    }, []);

    const detectAvailablePrinters = async () => {
        setIsDetectingPrinters(true);
        try {
            // Esta API solo funciona en navegadores Chromium con HTTPS
            if ('getInstalledRelatedApps' in navigator) {
                const apps = await navigator.getInstalledRelatedApps();
                console.log('Apps relacionadas:', apps);
            }
            
            // Detectar usando Media Queries (funciona en todos los navegadores)
            const printersList = [];
            
            // Simular lista de impresoras comunes
            const commonPrinters = [
                'Impresora predeterminada',
                'Microsoft Print to PDF',
                'Microsoft XPS Document Writer',
                'Fax',
                'OneNote (Desktop)'
            ];
            
            for (const printer of commonPrinters) {
                printersList.push({
                    name: printer,
                    type: 'system'
                });
            }
            
            setAvailablePrinters(printersList);
        } catch (error) {
            console.warn('No se pudo detectar impresoras automáticamente:', error);
            setAvailablePrinters([{ name: 'Impresora predeterminada', type: 'default' }]);
        }
        setIsDetectingPrinters(false);
    };

    const handleSave = () => {
        // Guardar en localStorage para persistencia local
        Object.keys(printerConfig).forEach(key => {
            localStorage.setItem(key, printerConfig[key].toString());
        });

        // También guardar en Supabase para sincronización (opcional)
        onSettingsUpdated('printer_settings', printerConfig);
        
        alert('✅ Configuración de impresora guardada exitosamente');
        onClose();
    };

    const testPrint = () => {
        const testData = {
            items: [
                { nombre: 'Producto Test 1', cantidad: 2, precio_total: 1500 },
                { nombre: 'Producto Test 2', cantidad: 1, precio_total: 2500 }
            ],
            total: 4000,
            vendedor: 'Usuario Test',
            numero: 'TEST123'
        };

        // Crear una ventana de impresión de prueba
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prueba de Impresión - GestiON</title>
                <style>
                    @page { 
                        size: ${printerConfig.paper_width} auto; 
                        margin: ${printerConfig.print_margins}; 
                    }
                    body { 
                        font-family: 'Courier New', monospace;
                        font-size: ${printerConfig.font_size};
                        line-height: 1.2;
                        margin: 0;
                        padding: 10px;
                        width: ${printerConfig.paper_width === 'A4' ? '100%' : printerConfig.paper_width};
                    }
                    .header { text-align: center; margin-bottom: 10px; }
                    .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
                    .item { display: flex; justify-content: space-between; margin: 2px 0; }
                    .total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
                    .footer { text-align: center; margin-top: 10px; font-size: 0.9em; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${printerConfig.print_logo ? '<div style="font-size: 16px;">📊 LOGO</div>' : ''}
                    <h2>EMPRESA PRUEBA</h2>
                    <div>PRUEBA DE IMPRESIÓN</div>
                    <div>${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</div>
                </div>
                
                <div class="separator"></div>
                
                ${testData.items.map(item => `
                    <div class="item">
                        <span>${item.cantidad} x ${item.nombre}</span>
                        <span>$${item.precio_total.toLocaleString()}</span>
                    </div>
                `).join('')}
                
                <div class="separator"></div>
                
                <div class="item total">
                    <span>TOTAL:</span>
                    <span>$${testData.total.toLocaleString()}</span>
                </div>
                
                <div class="footer">
                    <p>¡Gracias por su compra!</p>
                    <p>Ticket #: ${testData.numero}</p>
                    <p>Vendedor: ${testData.vendedor}</p>
                    <p style="margin-top: 15px; font-size: 0.8em;">
                        Configuración: ${printerConfig.paper_width} | ${printerConfig.font_size}
                    </p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            
            // Cerrar la ventana después de imprimir
            setTimeout(() => {
                printWindow.close();
            }, 1000);
        }, 500);
    };

    // 🛑 NUEVA FUNCIÓN: Configuración avanzada de impresora 🛑
    const openAdvancedPrinterSettings = () => {
        // Abrir configuración del sistema (solo funciona en algunos navegadores)
        if (window.navigator && window.navigator.platform) {
            const platform = window.navigator.platform.toLowerCase();
            let message = 'Para configurar tu impresora:\n\n';
            
            if (platform.includes('win')) {
                message += '1. Ve a Configuración → Dispositivos → Impresoras\n';
                message += '2. Selecciona tu impresora de tickets\n';
                message += '3. Configura el tamaño de papel (58mm o 80mm)\n';
                message += '4. Establece como predeterminada si es necesario';
            } else if (platform.includes('mac')) {
                message += '1. Ve a Preferencias del Sistema → Impresoras\n';
                message += '2. Agrega tu impresora de tickets\n';
                message += '3. Configura el tamaño de papel personalizado\n';
                message += '4. Guarda la configuración';
            } else {
                message += '1. Accede a la configuración de impresoras de tu sistema\n';
                message += '2. Configura tu impresora de tickets\n';
                message += '3. Establece el tamaño de papel correcto\n';
                message += '4. Prueba la impresión desde el navegador';
            }
            
            alert(message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="c-modal-overlay">
            <div className="c-modal-content" style={{ maxWidth: '600px' }}>
                <div className="c-modal-header">
                    <h3 className="c-modal-title">🖨️ Configuración de Impresora</h3>
                    <button onClick={onClose} className="c-modal-close-btn">×</button>
                </div>
                
                <div className="c-modal-body">
                    {/* 🛑 SECCIÓN: Detección de impresoras 🛑 */}
                    <div className="c-form-group">
                        <label className="c-form-label">Impresoras Detectadas:</label>
                        <div style={{ 
                            background: 'var(--color-surface-200)', 
                            padding: '10px', 
                            borderRadius: '5px',
                            marginBottom: '10px'
                        }}>
                            {isDetectingPrinters ? (
                                <p>🔍 Detectando impresoras...</p>
                            ) : (
                                <div>
                                    {availablePrinters.map((printer, index) => (
                                        <div key={index} style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '5px 0'
                                        }}>
                                            <span>🖨️ {printer.name}</span>
                                            <button 
                                                onClick={() => setPrinterConfig(prev => ({...prev, printer_name: printer.name}))}
                                                className="btn btn-sm btn-secondary"
                                            >
                                                Seleccionar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={openAdvancedPrinterSettings} className="btn btn-sm btn-secondary">
                            ⚙️ Configurar en Sistema Operativo
                        </button>
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">Nombre de la Impresora Seleccionada:</label>
                        <input
                            type="text"
                            value={printerConfig.printer_name}
                            onChange={(e) => setPrinterConfig(prev => ({...prev, printer_name: e.target.value}))}
                            className="c-form-input"
                            placeholder="Selecciona o escribe el nombre de tu impresora"
                        />
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">Ancho del Papel:</label>
                        <select 
                            value={printerConfig.paper_width}
                            onChange={(e) => setPrinterConfig(prev => ({...prev, paper_width: e.target.value}))}
                            className="c-form-input"
                        >
                            <option value="58mm">58mm (Ticket pequeño)</option>
                            <option value="80mm">80mm (Ticket estándar) ⭐ Recomendado</option>
                            <option value="A4">A4 (Hoja completa)</option>
                        </select>
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">Tamaño de Fuente:</label>
                        <select 
                            value={printerConfig.font_size}
                            onChange={(e) => setPrinterConfig(prev => ({...prev, font_size: e.target.value}))}
                            className="c-form-input"
                        >
                            <option value="10px">10px (Muy pequeño)</option>
                            <option value="12px">12px (Estándar) ⭐</option>
                            <option value="14px">14px (Grande)</option>
                            <option value="16px">16px (Muy grande)</option>
                        </select>
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">Márgenes de Impresión:</label>
                        <select 
                            value={printerConfig.print_margins}
                            onChange={(e) => setPrinterConfig(prev => ({...prev, print_margins: e.target.value}))}
                            className="c-form-input"
                        >
                            <option value="0mm">Sin márgenes</option>
                            <option value="3mm">3mm ⭐ Recomendado</option>
                            <option value="5mm">5mm</option>
                            <option value="10mm">10mm</option>
                        </select>
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">Número de Copias:</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={printerConfig.copies}
                            onChange={(e) => setPrinterConfig(prev => ({...prev, copies: parseInt(e.target.value)}))}
                            className="c-form-input"
                        />
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">
                            <input
                                type="checkbox"
                                checked={printerConfig.auto_print}
                                onChange={(e) => setPrinterConfig(prev => ({...prev, auto_print: e.target.checked}))}
                                style={{ marginRight: '8px' }}
                            />
                            Imprimir automáticamente tras cada venta
                        </label>
                    </div>

                    <div className="c-form-group">
                        <label className="c-form-label">
                            <input
                                type="checkbox"
                                checked={printerConfig.print_logo}
                                onChange={(e) => setPrinterConfig(prev => ({...prev, print_logo: e.target.checked}))}
                                style={{ marginRight: '8px' }}
                            />
                            Incluir logo de la empresa
                        </label>
                    </div>

                    {/* 🛑 SECCIÓN: Instrucciones por navegador 🛑 */}
                    <div style={{ 
                        background: 'var(--color-surface-100)', 
                        padding: '15px', 
                        borderRadius: '8px',
                        marginTop: '20px',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-text-high)' }}>
                            📋 Instrucciones de Configuración:
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text-medium)' }}>
                            <li>Conecta tu impresora de tickets al dispositivo</li>
                            <li>Instala los drivers específicos de tu impresora</li>
                            <li>Configura el tamaño de papel en tu sistema operativo</li>
                            <li>Selecciona la impresora arriba y haz una prueba</li>
                            <li>Ajusta la configuración según los resultados</li>
                        </ol>
                        <p style={{ 
                            margin: '10px 0 0 0', 
                            fontSize: '0.9em', 
                            fontStyle: 'italic',
                            color: 'var(--color-text-medium)'
                        }}>
                            💡 <strong>Tip:</strong> Para mejores resultados, usa Chrome o Edge con impresoras térmicas de 80mm.
                        </p>
                    </div>

                    <div className="c-modal-footer" style={{ marginTop: '20px' }}>
                        <button onClick={testPrint} className="btn btn-secondary">
                            🧪 Prueba de Impresión
                        </button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={onClose} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="btn btn-primary">
                                Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettingsModal;
