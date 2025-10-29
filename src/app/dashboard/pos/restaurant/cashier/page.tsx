
'use client';
import PosClient from '../../components/PosClient';
import CartPanel from "../../components/CartPanel";
import ProductGrid from "../../components/ProductGrid";
import CategoryTabs from "../../components/CategoryTabs";
import TableMap from '../../components/TableMap';
import { Button } from '@/components/ui/button';
import { Landmark, ChefHat } from 'lucide-react';
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import { useFirebaseApp, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type CartItem } from '../../types';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';

export default function RestaurantPOSPage() {
    const { toast } = useToast();
    const { firebaseApp, firestore } = useFirebaseApp();
    const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);

    const handleSendToKitchen = async (cart: CartItem[], tenantId: string | null) => {
        if (!tenantId || !firestore || cart.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot send to kitchen.' });
            return;
        }

        setIsSendingToKitchen(true);
        try {
            // This needs a selected table. For now, we'll hardcode one.
            const tableId = 'T1'; 
            
            const orderRef = collection(firestore, `tenants/${tenantId}/tables/${tableId}/orders`);
            const orderData = {
                items: cart.map(item => ({
                    productId: item.id,
                    name: { de: item.name.de, en: item.name.en },
                    qty: item.quantity,
                })),
                status: 'pending',
                createdAt: serverTimestamp(),
                tenantId: tenantId, // Add tenantId for security rules
                tableId: tableId,
            };

            await addDocumentNonBlocking(orderRef, orderData);

            // Update table status
            const tableRef = doc(firestore, `tenants/${tenantId}/tables`, tableId);
            await updateDocumentNonBlocking(tableRef, { status: 'occupied' });

            toast({ title: 'Order Sent', description: 'The order has been sent to the kitchen.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSendingToKitchen(false);
        }
    };
    
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
        <div className="grid grid-cols-12 h-[calc(100vh-60px)] bg-card text-card-foreground">
           <div className="col-span-8 flex flex-col h-full">
            <header className="p-4 border-b flex justify-between items-center gap-4 bg-card shrink-0">
              {tenantId && <CategoryTabs tenantId={tenantId} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} language={language} />}
            </header>
            <main className="flex-1 overflow-y-auto p-4 bg-muted/30">
                <div className="grid grid-cols-12 gap-6 h-full">
                    <div className="col-span-5 h-full overflow-y-auto">
                      {tenantId && <TableMap tenantId={tenantId} />}
                    </div>
                    <div className="col-span-7 h-full overflow-y-auto">
                        {tenantId && <ProductGrid tenantId={tenantId} categoryId={selectedCategory} addToCart={addToCart} language={language} />}
                    </div>
                </div>
            </main>
             <div className="p-4 border-t bg-card flex justify-end">
                <Button 
                    size="lg" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    disabled={isSendingToKitchen || cart.length === 0}
                    onClick={() => handleSendToKitchen(cart, tenantId)}
                >
                   {isSendingToKitchen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   <ChefHat className="mr-2 h-5 w-5" /> Send to Kitchen
                </Button>
            </div>
          </div>
          <div className="col-span-4 bg-card border-l flex flex-col h-full">
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
              mode="restaurant"
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
