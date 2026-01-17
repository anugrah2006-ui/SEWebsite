import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sharp Economy',
  description: 'Mirrored Sharp Economy site served through Next.js',
  metadataBase: new URL('https://sharpeconomy.org'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
