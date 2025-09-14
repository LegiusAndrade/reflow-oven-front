import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'], // Specify the character subsets you need
  weight: ['400', '500', '700'], // Specify the font weights you want to use
  variable: '--font-nunito', // Define the CSS variable name
});

export const metadata: Metadata = {
  title: 'Reflow Oven',
  description:
    'Aplicação web para controle e monitoramento de um forno de refusão SMD, com configuração de perfis de temperatura e exibição em tempo real de status e sensores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR' data-theme='dark' className={nunito.variable}>
      <head>
        {/* Google Material Symbols */}
        <link
          href='https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
          rel='stylesheet'
        />
      </head>
      <body className='antialiased bg-app'>{children}</body>
    </html>
  );
}
