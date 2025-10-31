import { useState, useEffect, useRef } from 'react';

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const lastChangeRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const timeSinceLastChange = now - lastChangeRef.current;
      
      // Evitar cambios muy rápidos (menos de 500ms)
      if (timeSinceLastChange < 500) {
        console.log('🚫 Cambio de visibilidad ignorado - demasiado rápido');
        return;
      }
      
      lastChangeRef.current = now;
      const currentlyVisible = !document.hidden;

      if (currentlyVisible !== isVisible) {
        console.log(currentlyVisible ? '👁️ Página visible' : '� Página oculta');
        setIsVisible(currentlyVisible);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible]);

  // Retornar solo isVisible - eliminar wasHidden y needsRecovery que causaban loops
  return { isVisible, wasHidden: false, needsRecovery: false };
};

export default usePageVisibility;
