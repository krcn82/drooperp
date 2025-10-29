
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

const defaultProducts: Product[] = [
    {
      id: 'pizza-margherita',
      name: { de: 'Pizza Margherita', en: 'Margherita Pizza' },
      price: 9.90,
      unit: 'Stück',
      categoryId: 'pizza',
      imageUrl: 'https://picsum.photos/seed/pizza1/300/300',
      taxRate: 0.1,
      sku: 'PZ-MAR-01',
      isAvailable: true,
    },
    {
      id: 'pasta-carbonara',
      name: { de: 'Pasta Carbonara', en: 'Pasta Carbonara' },
      price: 11.50,
      unit: 'Stück',
      categoryId: 'pasta',
      imageUrl: 'https://picsum.photos/seed/pasta1/300/300',
      taxRate: 0.1,
      sku: 'PA-CAR-01',
      isAvailable: true,
    },
    {
      id: 'cola-033',
      name: { de: 'Cola 0.33L', en: 'Coke 0.33L' },
      price: 2.90,
      unit: 'Stück',
      categoryId: 'drinks',
      imageUrl: 'https://picsum.photos/seed/drink1/300/300',
      taxRate: 0.2,
      sku: 'DR-COL-01',
      isAvailable: true,
    },
];

export default function ProductGrid({ tenantId, categoryId, addToCart, language }: ProductGridProps) {
  const firestore = useFirestore();
  
  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    
    let q: Query = collection(firestore, `tenants/${tenantId}/products`);
    
    return q;
  }, [firestore, tenantId]);

  const { data: productsFromDb, isLoading } = useCollection<Product>(productsQuery);

  const products = !isLoading && productsFromDb && productsFromDb.length > 0 ? productsFromDb : defaultProducts;

  const filteredProducts = categoryId 
    ? products.filter(p => p.categoryId === categoryId)
    : products;

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
      {filteredProducts.map(p => (
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
      {!isLoading && filteredProducts.length === 0 && (
        <div className="col-span-full text-center py-10 text-muted-foreground">
            <p>No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
