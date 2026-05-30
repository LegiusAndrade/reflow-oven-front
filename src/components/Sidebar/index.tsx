"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useSession } from "@/hooks/useSession";
import { canAccess, logout } from "@/lib/auth";
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
  const router = useRouter();
  const session = useSession();
  // Regular users only see the routes their role can reach (Início + Programas); logged out → no nav.
  const items = session ? NAV_ITEMS.filter((item) => canAccess(session.role, item.href)) : [];

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className={clsx("sidebar inline-flex h-full min-w-[clamp(11.5rem,15vw,15rem)] flex-col items-stretch gap-2 p-2", className)}>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} priority className='size-[92px] shrink-0 self-center' />

      {/* Nav + account block only once logged in; logged out the sidebar shows just the logo. */}
      {session && (
        <>
          <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />

          {/* Nav — items stay at the top; the current route is highlighted */}
          <nav className='flex flex-col gap-3'>
            {items.map((item) => (
              <LinkButton key={item.href} label={item.label} icon={item.icon} href={item.href} active={pathname === item.href} />
            ))}
          </nav>

          {/* Logout pinned to the bottom (user + theme moved to the TopBar to save sidebar space) */}
          <div className='mt-auto flex flex-col gap-2'>
            <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />
            <button
              type='button'
              onClick={handleLogout}
              className='btn-link flex cursor-pointer items-center justify-start gap-3 px-4 py-3 text-base leading-tight select-none [--icon-size:clamp(1.375rem,1.1rem+0.45vw,1.625rem)]'
            >
              <IconGeneral icon='logout' fill={1} />
              <span>Sair</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
