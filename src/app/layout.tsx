import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remove Background - Free Online Tool',
  description: 'Remove image backgrounds instantly in your browser. 100% free, no uploads, complete privacy. Uses AI-powered segmentation running entirely on your device.',
  keywords: ['remove background', 'background removal', 'transparent png', 'image editing', 'ai', 'free'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
