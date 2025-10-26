import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>Advanced reporting and analytics will be available here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Check back later for sales trends, product performance, and more.</p>
        </CardContent>
      </Card>
    </div>
  );
}
