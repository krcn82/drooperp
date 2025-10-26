'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, ShoppingCart, QrCode, X, Plus, Minus, Barcode, WifiOff, Camera, Search } from 'lucide-react';
import { useUser } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Quagga from '@ericblade/quagga2';
import QRCode from 'qrcode.react';
import { recordTransaction } from './actions';

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

const sampleProducts: Product[] = [
  { id: '8992761139976', name: 'T-Shirt', price: 20.00, category: 'Apparel' },
  { id: 'prod_2', name: 'Mug', price: 15.00, category: 'Accessories' },
  { id: 'prod_3', name: 'Hoodie', price: 50.00, category: 'Apparel' },
  { id: 'prod_4', name: 'Stickers', price: 5.00, category: 'Accessories' },
];

export default function PosPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsClient(true);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
      }
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prevCart => {
      if (quantity <= 0) {
        return prevCart.filter(item => item.productId !== productId);
      }
      return prevCart.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePayment = async (paymentMethod: 'cash' | 'card') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to make a transaction.' });
      return;
    }
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant ID not found.' });
      return;
    }

    const transactionData = {
      productIds: cart.map(item => item.productId),
      quantities: cart.map(item => item.quantity),
      cashierUserId: user.uid,
      amountTotal: total,
      paymentMethod,
    };

    const result = await recordTransaction(tenantId, transactionData);

    if (result.success && result.transactionId) {
      setLastTransactionId(result.transactionId);
      setPaymentOpen(false);
      setConfirmationOpen(true);
      setCart([]);
    } else {
      toast({ variant: 'destructive', title: 'Transaction Failed', description: result.message });
    }
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setIsScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current!,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          },
        },
        decoder: {
          readers: ["ean_reader", "code_128_reader", "upc_reader"]
        },
      }, (err) => {
        if (err) {
          console.error(err);
          setHasCameraPermission(false);
          toast({ variant: 'destructive', title: 'Scanner Error', description: 'Could not initialize barcode scanner.' });
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected(handleBarcodeDetection);

    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };
  
  const stopScanner = () => {
    Quagga.offDetected(handleBarcodeDetection);
    Quagga.stop();
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const handleBarcodeDetection = (data: any) => {
    const barcode = data.codeResult.code;
    const product = sampleProducts.find(p => p.id === barcode);
    if (product) {
      addToCart(product);
      toast({ title: 'Product Added', description: `${product.name} added to cart.` });
      stopScanner();
    } else {
      toast({ variant: 'destructive', title: 'Product Not Found', description: `No product found for barcode: ${barcode}` });
    }
  };
  
  const filteredProducts = sampleProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isClient) return null;

  return (
    <div className="flex flex-col gap-4">
      {isOffline && (
        <Alert variant="destructive" className="bg-yellow-500 text-white border-yellow-500">
          <WifiOff className="h-4 w-4 !text-white" />
          <AlertTitle>Offline Mode</AlertTitle>
          <AlertDescription>Your data will sync when you're back online.</AlertDescription>
        </Alert>
      )}

      {isScanning ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scan Barcode</span>
              <Button variant="ghost" size="icon" onClick={stopScanner}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>Point your camera at a product barcode.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                <video ref={videoRef} className="w-full h-full" autoPlay muted playsInline />
                <div className="absolute inset-0 border-4 border-red-500/50 m-8 rounded-lg" />
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="mt-4">
                  <Camera className="h-4 w-4"/>
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access in your browser settings to use the barcode scanner.
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Point of Sale</h1>
             <Button onClick={startScanner}>
              <Barcode className="mr-2 h-4 w-4" />
              Scan Barcode
            </Button>
          </div>
          <Tabs defaultValue="shop">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="shop" className="py-2">Shop Mode</TabsTrigger>
              <TabsTrigger value="restaurant" className="py-2">Restaurant Mode</TabsTrigger>
            </TabsList>
            <TabsContent value="shop">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cart and Checkout */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Current Order</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {cart.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.map(item => (
                            <TableRow key={item.productId}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                  <span>{item.quantity}</span>
                                  <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <ShoppingCart className="mx-auto h-12 w-12" />
                        <p>Your cart is empty</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between items-center mt-auto bg-muted/50 p-4 rounded-b-lg">
                    <div className="font-bold text-xl">Total: ${total.toFixed(2)}</div>
                    <Button size="lg" className="bg-accent hover:bg-accent/90" onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay
                    </Button>
                  </CardFooter>
                </Card>

                {/* Product Selection */}
                <Card>
                   <CardHeader>
                    <CardTitle>Products</CardTitle>
                     <div className="relative mt-2">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input
                         placeholder="Search products or categories..."
                         className="pl-8"
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                       />
                     </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredProducts.map(product => (
                        <Button key={product.id} variant="outline" className="h-20 text-center flex-col gap-1" onClick={() => addToCart(product)}>
                          <span className="font-semibold">{product.name}</span>
                          <span className="text-muted-foreground">${product.price.toFixed(2)}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="restaurant">
               <Card>
                <CardHeader>
                  <CardTitle>Restaurant Floor Plan</CardTitle>
                  <CardDescription>Manage tables and orders. Click a table to start an order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.from({length: 12}).map((_, i) => (
                      <Card
                        key={i}
                        className={`text-center cursor-pointer transition-transform hover:scale-105 ${
                          i % 3 === 0
                            ? 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800'
                            : i % 3 === 1
                            ? 'bg-orange-100 dark:bg-orange-900/50 border-orange-200 dark:border-orange-800'
                            : 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800'
                        }`}>
                        <CardHeader className="p-4">
                          <CardTitle>Table {i + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {i % 3 === 0 ? (
                            <p className="text-sm text-green-700 dark:text-green-300">Available</p>
                          ) : (
                            <div className="space-y-1">
                                <p className="font-bold text-lg text-orange-800 dark:text-orange-200">${(Math.random() * 100 + 20).toFixed(2)}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">{i % 3 === 1 ? 'Occupied' : 'Payment Due'}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">This is a visual stub. Functionality for table orders and kitchen display system can be added next.</p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Total Amount: ${total.toFixed(2)}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-4">
            <Button variant="outline" className="py-8 text-lg" onClick={() => handlePayment('cash')}>Cash</Button>
            <Button variant="outline" className="py-8 text-lg" onClick={() => handlePayment('card')}>Card</Button>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setPaymentOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal */}
      <Dialog open={isConfirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent className="sm:max-w-md">
           <DialogHeader>
            <DialogTitle>Transaction Successful</DialogTitle>
            <DialogDescription>
              Transaction ID: {lastTransactionId}
            </DialogDescription>
          </DialogHeader>
           <div className="flex items-center justify-center my-4">
            <QRCode value={`transaction:${lastTransactionId}`} size={200} />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={() => setConfirmationOpen(false)}>
              New Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    