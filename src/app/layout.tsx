// app/layout.tsx
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

// Setup Roboto
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Reflow Oven',
  description:
    'Aplicação web para controle e monitoramento de um forno de refusão SMD, com configuração de perfis de temperatura e exibição em tempo real de status e sensores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR'>
      <body className={`${roboto.variable} antialiased`}>{children}</body>
    </html>
  );
}
