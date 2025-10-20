import React from 'react';
import { formatCurrencyCOP } from '../utils/formatters';

// Este componente solo se usa para dar formato al ticket que se va a imprimir
const FacturaTicket = React.forwardRef(({ ventaData, empresaData }, ref) => {
    // 🛑 LEER CONFIGURACIÓN DEL USUARIO 🛑
    const paperWidth = localStorage.getItem('paper_width') || '80mm';
    const printLogo = localStorage.getItem('print_logo') === 'true';
    const fontSize = localStorage.getItem('font_size') || '12px';
    const printMargins = localStorage.getItem('print_margins') || '3mm';
    
    return (
        <div ref={ref} style={{ 
            width: paperWidth === 'A4' ? '100%' : paperWidth, 
            margin: '0 auto', 
            padding: printMargins, 
            fontFamily: 'Courier New, monospace',
            fontSize: fontSize,
            lineHeight: '1.2',
            backgroundColor: 'white',
            color: 'black'
        }}>
            {/* 🛑 ENCABEZADO CON LOGO CONDICIONAL 🛑 */}
            {printLogo && (
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '10px',
                    borderBottom: '1px dashed #000',
                    paddingBottom: '5px'
                }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>📊</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Sistema GestiON</div>
                </div>
            )}
            
            <h2 style={{ 
                textAlign: 'center', 
                fontSize: paperWidth === 'A4' ? '18px' : '16px', 
                margin: '5px 0',
                fontWeight: 'bold',
                textTransform: 'uppercase'
            }}>
                {empresaData.nombre}
            </h2>
            
            <div style={{ 
                textAlign: 'center', 
                fontSize: '10px',
                margin: '5px 0',
                borderBottom: '1px dashed #000',
                paddingBottom: '8px'
            }}>
                <div>📅 {new Date(ventaData.fecha).toLocaleString('es-CO', {
                    timeZone: 'America/Bogota',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
                <div>🎫 Ticket #{ventaData.numero}</div>
                <div>👤 Vendedor: {ventaData.vendedor}</div>
            </div>
            
            {/* 🛑 PRODUCTOS CON FORMATO ADAPTABLE 🛑 */}
            <div style={{ margin: '10px 0' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #000',
                    paddingBottom: '3px',
                    marginBottom: '5px'
                }}>
                    <span>CANT</span>
                    <span>PRODUCTO</span>
                    <span>TOTAL</span>
                </div>
                
                {ventaData.items.map((item, index) => (
                    <div key={index} style={{ 
                        margin: '3px 0',
                        fontSize: paperWidth === 'A4' ? '12px' : '11px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{ 
                                width: '15%', 
                                fontWeight: 'bold'
                            }}>
                                {item.cantidad}x
                            </span>
                            <span style={{ 
                                width: '60%', 
                                textAlign: 'left',
                                wordWrap: 'break-word'
                            }}>
                                {paperWidth === 'A4' ? 
                                    item.nombre : 
                                    (item.nombre.length > 20 ? item.nombre.substring(0, 20) + '...' : item.nombre)
                                }
                            </span>
                            <span style={{ 
                                width: '25%', 
                                textAlign: 'right',
                                fontWeight: 'bold'
                            }}>
                                {formatCurrencyCOP(item.precio_total)}
                            </span>
                        </div>
                        
                        {/* 🛑 MOSTRAR PRECIO UNITARIO SOLO EN A4 🛑 */}
                        {item.precio_unitario && paperWidth === 'A4' && (
                            <div style={{ 
                                fontSize: '9px', 
                                color: '#666',
                                marginLeft: '15%',
                                fontStyle: 'italic'
                            }}>
                                @ {formatCurrencyCOP(item.precio_unitario)} c/u
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* 🛑 TOTALES CON INFORMACIÓN EXTENDIDA 🛑 */}
            <div style={{ 
                borderTop: '2px solid #000',
                paddingTop: '8px',
                marginTop: '15px'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: paperWidth === 'A4' ? '16px' : '14px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                }}>
                    <span>TOTAL A PAGAR:</span>
                    <span>{formatCurrencyCOP(ventaData.total)}</span>
                </div>
                
                {/* 🛑 MOSTRAR UTILIDAD SOLO SI ESTÁ DISPONIBLE 🛑 */}
                {ventaData.utilidad !== undefined && ventaData.utilidad > 0 && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '10px',
                        color: '#666',
                        fontStyle: 'italic'
                    }}>
                        <span>Utilidad neta:</span>
                        <span>{formatCurrencyCOP(ventaData.utilidad)}</span>
                    </div>
                )}
                
                {/* 🛑 INFORMACIÓN ADICIONAL PARA A4 🛑 */}
                {paperWidth === 'A4' && (
                    <div style={{ 
                        marginTop: '10px',
                        fontSize: '10px',
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        <div>Items vendidos: {ventaData.items.reduce((acc, item) => acc + item.cantidad, 0)}</div>
                    </div>
                )}
            </div>
            
            {/* 🛑 PIE DE PÁGINA MEJORADO 🛑 */}
            <div style={{ 
                textAlign: 'center', 
                marginTop: '15px', 
                fontSize: '10px',
                borderTop: '1px dashed #000',
                paddingTop: '8px'
            }}>
                <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                    ¡Gracias por su compra!
                </p>
                <p style={{ margin: '3px 0' }}>
                    Vuelva pronto 😊
                </p>
                <div style={{ 
                    marginTop: '8px', 
                    fontSize: '8px', 
                    color: '#999',
                    fontStyle: 'italic'
                }}>
                    Powered by GestiON System
                </div>
            </div>
        </div>
    );
});

FacturaTicket.displayName = 'FacturaTicket';

export default FacturaTicket;
