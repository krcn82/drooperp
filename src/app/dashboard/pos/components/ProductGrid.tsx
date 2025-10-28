
'use client';

import React from 'react';
import Image from 'next/image';
import { type Product } from '../page';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  addToCart: (product: Product) => void;
  language: 'de' | 'en';
}

export default function ProductGrid({ products, addToCart, language }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map(p => (
        <Card
          key={p.id}
          onClick={() => p.isAvailable && addToCart(p)}
          className={cn(
            "overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
            !p.isAvailable && "opacity-50 cursor-not-allowed"
          )}
        >
          <CardContent className="p-0">
            <Image
              src={p.image}
              alt={p.name[language]}
              width={300}
              height={300}
              className="object-cover w-full h-40"
              data-ai-hint="office product"
            />
            {!p.isAvailable && (
              <Badge variant="destructive" className="absolute top-2 left-2">Out of Stock</Badge>
            )}
            <div className="p-4">
              <p className="font-semibold truncate">{p.name[language]}</p>
              <p className="text-muted-foreground text-sm">€ {p.price.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
