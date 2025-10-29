import PosClient from '../../components/PosClient';
import CartPanel from "../../components/CartPanel";
import ProductGrid from "../../components/ProductGrid";
import CategoryTabs from "../../components/CategoryTabs";
import TableMap from '../../components/TableMap';
import { Button } from '@/components/ui/button';
import { Landmark } from 'lucide-react';
import { useCashDrawer } from '@/hooks/use-cash-drawer';


export default function RestaurantPOSPage() {

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
    <PosClient posMode="restaurant">
      {({ tenantId, language, cart, removeFromCart, clearCart, onPay, setCart, setTransactionId, selectedCustomer, setSelectedCustomer, selectedCategory, addToCart, setSelectedCategory }) => (
        <div className="grid grid-cols-12 h-screen bg-card text-card-foreground">
           <div className="col-span-4 bg-background border-r flex flex-col">
            <div className="p-4 border-b">
              <OpenDrawerButton />
            </div>
            {tenantId && <CartPanel
              cart={cart}
              language={language}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              onPay={onPay}
              setCart={setCart}
              setTransactionId={setTransactionId}
              mode="restaurant"
              tenantId={tenantId}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
            />}
          </div>
          <div className="col-span-8 flex flex-col">
            <header className="p-4 border-b flex justify-between items-center gap-4">
              {tenantId && <CategoryTabs tenantId={tenantId} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} language={language} />}
            </header>
            <main className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-5">{tenantId && <TableMap tenantId={tenantId} />}</div>
                    <div className="col-span-7">
                        {tenantId && <ProductGrid tenantId={tenantId} categoryId={selectedCategory} addToCart={addToCart} language={language} />}
                    </div>
                </div>
            </main>
          </div>
        </div>
      )}
    </PosClient>
  );
}