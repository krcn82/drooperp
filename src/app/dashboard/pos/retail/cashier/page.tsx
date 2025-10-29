

import PosClient from '../../components/PosClient';
import CartPanel from "../../components/CartPanel";
import ProductGrid from "../../components/ProductGrid";
import CategoryTabs from "../../components/CategoryTabs";
import { Button } from '@/components/ui/button';
import { Landmark } from 'lucide-react';
import { useCashDrawer } from '@/hooks/use-cash-drawer';

export default function RetailPOSPage() {
  
  // The openDrawerDialog needs to be called from a client component hook,
  // but we can't make this whole page a client component because children of PosClient are server components.
  // This is a bit of a workaround. A better solution might involve a global state for the cash drawer dialog.
  const OpenDrawerButton = () => {
    'use client';
    const { openDrawerDialog } = useCashDrawer();
    return (
      <Button onClick={openDrawerDialog} variant="outline" className="w-full">
        <Landmark className="mr-2 h-4 w-4" />
        Cash Drawer
      </Button>
    )
  }

  return (
    <PosClient posMode="retail">
      {({ tenantId, language, cart, removeFromCart, clearCart, onPay, setCart, setTransactionId, selectedCustomer, setSelectedCustomer, selectedCategory, addToCart, setSelectedCategory }) => (
        <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-60px)] bg-card text-card-foreground">
          <div className="md:col-span-2 flex flex-col h-full">
            <header className="p-4 border-b flex justify-between items-center gap-4 bg-card shrink-0">
              {tenantId && <CategoryTabs tenantId={tenantId} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} language={language} />}
            </header>
            <main className="flex-1 overflow-y-auto p-4 bg-muted/30">
              {tenantId && <ProductGrid tenantId={tenantId} categoryId={selectedCategory} addToCart={addToCart} language={language} />}
            </main>
          </div>
          <div className="md:col-span-1 bg-card border-l flex flex-col h-full">
            <div className="p-4 border-b shrink-0">
              <OpenDrawerButton />
            </div>
            {tenantId && <CartPanel
              cart={cart}
              language={language}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              onPay={() => onPay(selectedCustomer)}
              setCart={setCart}
              setTransactionId={setTransactionId}
              mode="retail"
              tenantId={tenantId}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
            />}
          </div>
        </div>
      )}
    </PosClient>
  );
}
