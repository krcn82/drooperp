
'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy }from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type Category } from '../types';

interface CategoryTabsProps {
  tenantId: string;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  language: 'de' | 'en';
}

const defaultCategories: Category[] = [
    { id: 'pizza', name: { de: 'Pizza', en: 'Pizza' }, sort: 1, icon: 'pizza' },
    { id: 'pasta', name: { de: 'Pasta', en: 'Pasta' }, sort: 2, icon: 'pasta' },
    { id: 'drinks', name: { de: 'Getränke', en: 'Drinks' }, sort: 3, icon: 'drinks' },
];


export default function CategoryTabs({ tenantId, selectedCategory, setSelectedCategory, language }: CategoryTabsProps) {
  const firestore = useFirestore();
  
  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, `tenants/${tenantId}/categories`), orderBy('sort'));
  }, [firestore, tenantId]);

  const { data: categoriesFromDb, isLoading } = useCollection<Category>(categoriesQuery);

  const categories = !isLoading && categoriesFromDb && categoriesFromDb.length > 0 ? categoriesFromDb : defaultCategories;

  if (isLoading) {
    return (
        <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
        </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
        <Button
             variant={selectedCategory === null ? 'default' : 'outline'}
             onClick={() => setSelectedCategory(null)}
        >
            All
        </Button>
      {categories?.map(category => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          onClick={() => setSelectedCategory(category.id)}
        >
          {category.name[language]}
        </Button>
      ))}
    </div>
  );
}
