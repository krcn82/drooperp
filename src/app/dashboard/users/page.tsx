import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {MoreHorizontal, PlusCircle} from 'lucide-react';
import {Badge} from '@/components/ui/badge';

const users = [
  {name: 'Olivia Martin', email: 'olivia.martin@email.com', role: 'Admin', status: 'Active'},
  {name: 'Jackson Lee', email: 'jackson.lee@email.com', role: 'User', status: 'Active'},
  {name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', role: 'User', status: 'Invited'},
  {name: 'William Kim', email: 'will@email.com', role: 'User', status: 'Active'},
  {name: 'Sofia Davis', email: 'sofia.davis@email.com', role: 'User', status: 'Inactive'},
];

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users, roles, and permissions for your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === 'Active'
                          ? 'default'
                          : user.status === 'Invited'
                          ? 'secondary'
                          : 'destructive'
                      }>
                      {user.status}
                    </Badge>
                  </TableCell>
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
