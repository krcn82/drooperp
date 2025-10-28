'use client';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import Link from 'next/link';
import {Database, Loader2} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useRouter} from 'next/navigation';
import {initiateEmailSignIn, useAuth, useFirestore, setDocumentNonBlocking} from '@/firebase';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {useToast} from '@/hooks/use-toast';
import {useEffect} from 'react';
import {FirebaseError} from 'firebase/app';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const formSchema = z.object({
  tenantId: z.string().trim().min(1, 'Tenant ID is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof formSchema>;

const sanitizeTenantId = (name: string) => {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const {toast} = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantId: '',
      email: '',
      password: '',
    },
  });

  const {
    formState: {isSubmitting},
  } = form;
  
  useEffect(() => {
    if (!auth || !firestore) return;
  
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId) {
          const tenantId = storedTenantId.trim();
          localStorage.setItem('tenantId', tenantId); // Ensure it's clean for the next load
          router.push(`/dashboard`);
        } else {
          router.push('/dashboard');
        }
      }
    });
  
    return () => unsubscribe();
  }, [auth, firestore, router]);

  const onSubmit = async (values: LoginFormValues) => {
    const sanitizedId = sanitizeTenantId(values.tenantId);
    // Store sanitized tenantId in localStorage to make it available across the app
    localStorage.setItem('tenantId', sanitizedId);

    try {
      await initiateEmailSignIn(auth, values.email, values.password);
    } catch (error: any) {
      let title = 'An unexpected error occurred.';
      let description = 'Please try again later.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            title = 'Invalid Credentials';
            description = 'Please check your email and password and try again.';
            break;
          case 'auth/invalid-email':
            title = 'Invalid Email';
            description = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            title = 'Too Many Attempts';
            description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
            break;
        }
      }

      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
      localStorage.removeItem('tenantId'); // Clear tenantId on failure
      form.reset(values); 
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Droop ERP</h1>
          </div>
          <CardDescription>Enter your credentials to access your tenant</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Tenant ID</FormLabel>
                    <FormControl>
                      <Input placeholder="your-company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link href="/register" className="underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
