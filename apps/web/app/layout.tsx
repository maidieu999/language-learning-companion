import type { Metadata } from 'next';
import { fontClassName } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Language Learning Companion',
  description: 'Add lesson material and ask questions grounded in your content.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontClassName} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
