import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { buildTheme } from './tokens';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // 'light' | 'dark' | 'system'
  const [scheme, setScheme] = useState('system');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => sub.remove();
  }, []);

  const resolved = scheme === 'system' ? systemScheme : scheme;
  const dark = resolved === 'dark';
  const theme = useMemo(() => buildTheme(dark), [dark]);

  const value = useMemo(() => ({ theme, scheme, setScheme, resolved }), [theme, scheme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
