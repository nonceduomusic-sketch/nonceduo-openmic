import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn("h-9 w-9 rounded-xl", className)}
        disabled
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className={cn(
        "h-9 w-9 rounded-xl transition-all duration-300",
        "hover:bg-muted/80 active:scale-95",
        className
      )}
      title={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-warning transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-primary transition-transform duration-300" />
      )}
    </Button>
  );
};
