"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LinkButton } from "../LinkButton";

const NAV_ITEMS = [
  { label: "Página Inicial", icon: "home", href: "/" },
  { label: "Programas", icon: "article", href: "/programas" },
  { label: "Relatório", icon: "analytics", href: "/relatorios" },
  { label: "Configuração", icon: "settings", href: "/configuracoes" },
  { label: "Informação", icon: "info", href: "/informacao" },
];

// Fills the drawer's height and sizes its width to the content (≈ the Figma 187px),
// growing a little on large screens via min-w. items-stretch equalizes button widths.
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={clsx("sidebar inline-flex h-full min-w-[clamp(11.5rem,15vw,15rem)] flex-col items-stretch gap-2 p-2", className)}>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} priority className='size-[92px] shrink-0 self-center' />

      {/* Divider */}
      <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />

      {/* Nav — items stay at the top; the current route is highlighted */}
      <nav className='flex flex-col gap-3'>
        {NAV_ITEMS.map((item) => (
          <LinkButton key={item.href} label={item.label} icon={item.icon} href={item.href} active={pathname === item.href} />
        ))}
      </nav>

      {/* Divider */}
      <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />

      {/* Theme toggle */}
      <LinkButton label='Alterar Tema' icon='dark_mode' href='/' />
    </aside>
  );
}
