import { useState } from 'react';
import './HelpButton.css';

/**
 * Botón flotante de ayuda que activa el tour guiado
 * @param {Function} onClick - Callback cuando se hace clic en el botón
 * @param {string} tooltip - Texto del tooltip (opcional)
 */
export default function HelpButton({ onClick, tooltip = 'Iniciar tour guiado' }) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="c-help-button-container">
            <button
                className="c-help-button"
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-label={tooltip}
                title={tooltip}
            >
                <span className="c-help-button__icon">?</span>
            </button>
            
            {showTooltip && (
                <div className="c-help-button__tooltip">
                    {tooltip}
                </div>
            )}
        </div>
    );
}
