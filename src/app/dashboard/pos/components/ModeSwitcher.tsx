'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart, Utensils } from 'lucide-react';

type PosMode = 'retail' | 'restaurant';

interface ModeSwitcherProps {
  mode: PosMode;
  setMode: (mode: PosMode) => void;
}

export default function ModeSwitcher({ mode, setMode }: ModeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      <Button
        variant={mode === 'retail' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('retail')}
        className="gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        Retail
      </Button>
      <Button
        variant={mode === 'restaurant' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('restaurant')}
        className="gap-2"
      >
        <Utensils className="h-4 w-4" />
        Restaurant
      </Button>
    </div>
  );
}
