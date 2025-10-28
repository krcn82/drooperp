
'use client';

import React from 'react';
import Image from 'next/image';
import { type Product } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductGridProps {
  tenantId: string;
  categoryId: string | null;
  addToCart: (product: Product) => void;
  language: 'de' | 'en';
}

export default function ProductGrid({ tenantId, categoryId, addToCart, language }: ProductGridProps) {
  const firestore = useFirestore();
  
  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    
    let q: Query = collection(firestore, `tenants/${tenantId}/products`);

    if (categoryId) {
        q = query(q, where('categoryId', '==', categoryId));
    }
    
    return q;
  }, [firestore, tenantId, categoryId]);

  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  if (isLoading) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-0">
                         <Skeleton className="w-full h-40" />
                         <div className="p-4 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products?.map(p => (
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
              src={p.imageUrl || "https://picsum.photos/seed/product/300/300"}
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
