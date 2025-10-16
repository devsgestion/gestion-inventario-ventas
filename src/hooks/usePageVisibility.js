import { useState, useEffect, useRef } from 'react';

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [wasHidden, setWasHidden] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  
  const lastChangeRef = useRef(Date.now());
  const recoveryExecutedRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const timeSinceLastChange = now - lastChangeRef.current;
      
      // Evitar cambios muy rápidos
      if (timeSinceLastChange < 300) return;
      
      lastChangeRef.current = now;
      const currentlyVisible = !document.hidden;

      if (!currentlyVisible && isVisible) {
        // Página se oculta
        console.log('📱 Página se ocultó');
        setWasHidden(true);
        setIsVisible(false);
        recoveryExecutedRef.current = false;
      } else if (currentlyVisible && !isVisible && wasHidden && !recoveryExecutedRef.current) {
        // Página vuelve a ser visible - SOLO UNA VEZ
        console.log('🔄 Página volvió - ejecutando recovery');
        setIsVisible(true);
        setNeedsRecovery(true);
        recoveryExecutedRef.current = true;
        
        // Reset inmediato para evitar loops
        setTimeout(() => {
          setNeedsRecovery(false);
          setWasHidden(false);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible, wasHidden]);

  return { isVisible, wasHidden, needsRecovery };
};

export default usePageVisibility;
