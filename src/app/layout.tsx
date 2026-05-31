import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "react-simple-keyboard/build/css/index.css";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"], // Specify the character subsets you need
  weight: ["400", "500", "700"], // Specify the font weights you want to use
  variable: "--font-nunito", // Define the CSS variable name
});

export const metadata: Metadata = {
  title: "Reflow Oven",
  description:
    "Aplicação web para controle e monitoramento de um forno de refusão SMD, com configuração de perfis de temperatura e exibição em tempo real de status e sensores.",
};

// Pre-paint theme: read the per-user theme from the cached session and set data-theme BEFORE first
// paint, so a light-theme user doesn't get a dark flash on cold load (AppShell re-applies it after
// hydration as a no-op). The localStorage key mirrors auth.ts's sessionStore and the "system"
// resolution mirrors theme.ts — keep both in sync. <html suppressHydrationWarning> silences the
// expected data-theme diff this introduces; data-theme="dark" stays the SSR default for new sessions.
const THEME_BOOT_SCRIPT =
  "(function(){try{var s=JSON.parse(localStorage.getItem('reflow:session:v1'));var t=s&&s.theme;if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR' data-theme='dark' suppressHydrationWarning className={nunito.variable}>
      <head>
        {/* Apply the saved theme before first paint to avoid a dark<->light flash (see THEME_BOOT_SCRIPT). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
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
