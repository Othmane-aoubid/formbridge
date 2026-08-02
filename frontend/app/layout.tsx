import type { Metadata } from "next";
import "./globals.css";
import HoneybadgerProvider from './honeybadger-provider';
import '../honeybadger.server.config';
import { NotificationProvider } from '@/components/NotificationContext';

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
    <html lang="en">
      <body>
        <NotificationProvider>
          <HoneybadgerProvider>
            {children}
          </HoneybadgerProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
