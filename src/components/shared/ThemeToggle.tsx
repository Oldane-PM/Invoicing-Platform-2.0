/**
 * Theme Toggle Component
 *
 * Switches between light and dark mode. Shows a crescent moon while in light
 * mode (click to go dark) and a sun while in dark mode (click to go light).
 * Theme state is managed by next-themes and persisted to localStorage.
 */

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid rendering the wrong icon until we know the active theme on the client.
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-lg w-9 h-9 md:w-10 md:h-10 hover:bg-gray-100"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
      ) : (
        <Moon className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
      )}
    </Button>
  );
}
