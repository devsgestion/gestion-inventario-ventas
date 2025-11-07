// src/hooks/useTheme.jsx

import { useState, useEffect, useContext, createContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  // Inicializa el estado leyendo SIEMPRE de localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');

  useEffect(() => {
    // Aplica la clase al BODY para que CSS reaccione
    document.body.className = theme === 'light' ? 'theme-light' : '';
    
    // También agregar data-theme para compatibilidad con otros estilos
    document.documentElement.setAttribute('data-theme', theme);
    
    // Guarda la preferencia en localStorage
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // 💡 Mantener el tema al cerrar sesión y en login/register
  useEffect(() => {
    // Si el usuario cierra sesión o recarga, lee el tema guardado y lo aplica
    const storedTheme = localStorage.getItem('app-theme');
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, []);

  // 💡 Evita que el logout cambie el tema a oscuro por defecto
  // Si tienes lógica de logout en useAuth, asegúrate de NO modificar el tema allí

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  const setAppTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
      localStorage.setItem('app-theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};