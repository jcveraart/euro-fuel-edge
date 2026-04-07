import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-5 z-[1001] flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg transition-all hover:border-primary/40 hover:text-foreground"
      title={theme === 'dark' ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-3.5 w-3.5" />
          Lichte modus
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5" />
          Donkere modus
        </>
      )}
    </button>
  );
}
