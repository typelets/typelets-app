import { createContext, useContext, useState, type ReactNode } from 'react';

type MonacoTheme = 'light' | 'dark';

interface MonacoThemeContextType {
  theme: MonacoTheme;
  toggleTheme: () => void;
  setTheme: (theme: MonacoTheme) => void;
}

const MonacoThemeContext = createContext<MonacoThemeContextType | undefined>(
  undefined
);

export function MonacoThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<MonacoTheme>('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <MonacoThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </MonacoThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMonacoTheme() {
  const context = useContext(MonacoThemeContext);
  if (context === undefined) {
    throw new Error('useMonacoTheme must be used within a MonacoThemeProvider');
  }
  return context;
}
