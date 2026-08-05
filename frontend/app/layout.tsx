import type { Metadata } from "next";
import "./globals.css";
import HoneybadgerProvider from './honeybadger-provider';
import '../honeybadger.server.config';
import { NotificationProvider } from '@/components/NotificationContext';
import { Inter } from 'next/font/google';

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "FormBridge - Document Processing Platform",
  description: "Automated document processing with OCR, human-in-the-loop review, and downstream integrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable}`}>
      <body className="font-sans antialiased">
        <NotificationProvider>
          <HoneybadgerProvider>
            {children}
          </HoneybadgerProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
