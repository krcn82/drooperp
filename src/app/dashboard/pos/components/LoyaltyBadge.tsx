
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface LoyaltyBadgeProps {
  vipTier: 'none' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
}

const tierStyles: Record<typeof vipTier, string> = {
  none: 'bg-gray-200 text-gray-800',
  silver: 'bg-slate-300 text-slate-800',
  gold: 'bg-yellow-400 text-yellow-900',
  platinum: 'bg-purple-300 text-purple-900',
};

export default function LoyaltyBadge({ vipTier, loyaltyPoints }: LoyaltyBadgeProps) {
  if (vipTier === 'none') {
    return <span className="text-xs text-muted-foreground">{loyaltyPoints} points</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={cn('capitalize', tierStyles[vipTier])}>
        <Star className="mr-1 h-3 w-3" />
        {vipTier}
      </Badge>
      <span className="text-xs text-muted-foreground">{loyaltyPoints} points</span>
    </div>
  );
}
