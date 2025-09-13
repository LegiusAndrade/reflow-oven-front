// app/layout.tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

// Setup Nunito
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Reflow Oven',
  description:
    'Aplicação web para controle e monitoramento de um forno de refusão SMD, com configuração de perfis de temperatura e exibição em tempo real de status e sensores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR'>
      <body className={`${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
