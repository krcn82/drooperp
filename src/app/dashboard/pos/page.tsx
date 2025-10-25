import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {CreditCard, Utensils, Beer} from 'lucide-react';

export default function PosPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Point of Sale</h1>
      <Tabs defaultValue="shop">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="shop" className="py-2">
            Shop Mode
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="py-2">
            Restaurant Mode
          </TabsTrigger>
        </TabsList>
        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop</CardTitle>
              <CardDescription>Process sales for retail items.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Cart</h3>
                  <Card>
                    <CardContent className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>T-Shirt</TableCell>
                            <TableCell>2</TableCell>
                            <TableCell className="text-right">$40.00</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Mug</TableCell>
                            <TableCell>1</TableCell>
                            <TableCell className="text-right">$15.00</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Products</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline">T-Shirt</Button>
                    <Button variant="outline">Hoodie</Button>
                    <Button variant="outline">Mug</Button>
                    <Button variant="outline">Stickers</Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="font-bold text-xl">Total: $55.00</div>
              <Button size="lg" className="bg-accent hover:bg-accent/90">
                <CreditCard className="mr-2 h-4 w-4" />
                Pay
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="restaurant">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant</CardTitle>
              <CardDescription>Manage tables and orders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({length: 12}).map((_, i) => (
                  <Card
                    key={i}
                    className={`text-center ${i % 3 === 0 ? 'bg-green-100 dark:bg-green-900' : i % 3 === 1 ? 'bg-orange-100 dark:bg-orange-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <CardHeader className="p-4">
                      <CardTitle>Table {i + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {i % 3 === 0 ? (
                        <p className="text-sm">Available</p>
                      ) : (
                        <p className="font-bold text-lg">${(Math.random() * 100 + 20).toFixed(2)}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">Click a table to view or create an order.</p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
