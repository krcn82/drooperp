import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {UploadCloud, File, MoreHorizontal} from 'lucide-react';

const recentUploads = [
  {name: 'invoice-2024-07.pdf', type: 'Invoice', size: '245 KB', date: '2024-07-15'},
  {name: 'company-logo.png', type: 'Asset', size: '88 KB', date: '2024-07-14'},
  {name: 'receipt-lunch.jpg', type: 'Expense', size: '1.2 MB', date: '2024-07-12'},
  {name: 'contract-client-x.docx', type: 'Contract', size: '450 KB', date: '2024-07-11'},
];

export default function AssetsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Invoices & Assets</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload invoices, receipts, contracts, or other assets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOCX (MAX. 10MB)</p>
              </div>
              <input id="dropzone-file" type="file" className="hidden" />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUploads.map(upload => (
                <TableRow key={upload.name}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    {upload.name}
                  </TableCell>
                  <TableCell>{upload.type}</TableCell>
                  <TableCell>{upload.size}</TableCell>
                  <TableCell>{upload.date}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
