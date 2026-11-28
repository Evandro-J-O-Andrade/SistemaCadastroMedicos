// src/core/theme/useIsDark.ts
// Ponte entre o ThemeProvider (classe .dark, chave 'theme') e os componentes
// que ainda recebem a prop `isDark` (base.tsx / designTokens).
// Fonte ÚNICA de verdade do tema: evita estados locais divergentes (ex.: 'gma-theme').
import { useTheme } from './ThemeProvider';

export function useIsDark(): boolean {
  const { theme } = useTheme();
  return theme === 'dark';
}