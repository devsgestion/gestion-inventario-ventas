// src/hooks/useTheme.jsx

import { useState, useEffect, useContext, createContext } from 'react';

const ThemeContext = createContext();

const initialTheme = localStorage.getItem('app-theme') || 'dark';

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    // 1. Aplicar la clase al BODY para que CSS reaccione
    document.body.className = theme === 'light' ? 'theme-light' : '';
    
    // 2. Guardar la preferencia en localStorage
    localStorage.setItem('app-theme', theme);

  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  const setAppTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};