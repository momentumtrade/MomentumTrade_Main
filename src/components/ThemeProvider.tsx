'use client';

import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from '@teispace/next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
