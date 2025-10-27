
import type {Metadata} from 'next';
import {Inter, Space_Grotesk} from 'next/font/google';
import './globals.css';
import {cn} from '@/lib/utils';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase';
import { AiStateProvider } from '@/hooks/use-ai-state';
import { CashDrawerProvider } from '@/hooks/use-cash-drawer';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'Droop ERP',
  description: 'A complete scalable ERP system built with Firebase.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-body antialiased', fontBody.variable, fontHeadline.variable)}>
        <FirebaseClientProvider>
          <AiStateProvider>
            <CashDrawerProvider>
              {children}
            </CashDrawerProvider>
            <Toaster />
          </AiStateProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
