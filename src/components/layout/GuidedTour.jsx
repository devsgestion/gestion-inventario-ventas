import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import './GuidedTour.css';

/**
 * Componente reutilizable para tours guiados
 * @param {Array} steps - Array de pasos del tour
 * @param {boolean} run - Si el tour debe ejecutarse
 * @param {Function} onFinish - Callback cuando el tour termina
 * @param {Function} onStepChange - Callback cuando cambia de paso (opcional)
 * @param {string} tourKey - Clave única para persistir si el usuario ya vio el tour
 * 
 * NOTA: El tour se muestra automáticamente la primera vez que visitas una página.
 * Una vez completado o cerrado, NO volverá a aparecer automáticamente, incluso 
 * después de cerrar sesión. Puedes reiniciarlo haciendo clic en el botón de ayuda (?).
 */
export default function GuidedTour({ steps, run, onFinish, onStepChange, tourKey }) {
    const [runTour, setRunTour] = useState(false);

    useEffect(() => {
        if (run) {
            setRunTour(true);
        }
    }, [run]);

    const handleJoyrideCallback = (data) => {
        const { action, index, status, type, step } = data;

        // Llamar al callback personalizado si existe
        if (onStepChange) {
            onStepChange(data);
        }

        // El usuario completó el tour o lo cerró
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
            
            // Marcar como visto en localStorage
            if (tourKey) {
                localStorage.setItem(`tour_${tourKey}_completed`, 'true');
            }
            
            if (onFinish) {
                onFinish();
            }
        }

        // Log para debugging
        // (log eliminado para mayor fluidez)
    };

    // Personalización del texto de progreso y botón Next
    const customLocale = {
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar tour',
        progress: (current, total) => `paso ${current} de ${total}`,
    };

    return (
        <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            disableOverlayClose
            spotlightClicks={false}
            disableScrolling={false}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: 'var(--color-surface-200)',
                    backgroundColor: 'var(--color-surface-200)',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    primaryColor: 'var(--color-primary)',
                    textColor: 'var(--color-text-primary)',
                    width: 450,
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '12px',
                    padding: '20px',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltipTitle: {
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '10px',
                    color: 'var(--color-text-primary)',
                },
                tooltipContent: {
                    fontSize: '0.95rem',
                    padding: '10px 0',
                    lineHeight: '1.6',
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'pre-line',
                },
                buttonNext: {
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    padding: '10px 20px',
                    fontWeight: '500',
                },
                buttonBack: {
                    color: 'var(--color-text-secondary)',
                    marginRight: '10px',
                    fontSize: '0.9rem',
                },
                buttonSkip: {
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.9rem',
                },
            }}
            locale={customLocale}
        />
    );
}
