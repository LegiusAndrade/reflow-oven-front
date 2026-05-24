import Image from "next/image";
import { LinkButton } from "../LinkButton";

// Fills the drawer's height and sizes its width to the content (≈ the Figma 187px),
// so it adapts to the screen/scale instead of using a fixed width. items-stretch makes
// every button as wide as the widest one. Spacing mirrors the Figma SideBar.
export function Sidebar() {
  return (
    <aside className='sidebar inline-flex h-full flex-col items-stretch gap-2 rounded-xl px-2 pb-px pt-4'>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} priority className='shrink-0 self-center' />

      {/* Divider */}
      <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />

      {/* Nav */}
      <nav className='flex flex-1 flex-col justify-center gap-3'>
        <LinkButton label='Página Inicial' icon='home' href='/' />
        <LinkButton label='Programas' icon='article' href='/' />
        <LinkButton label='Relatório' icon='analytics' href='/' />
        <LinkButton label='Configuração' icon='settings' href='/' />
        <LinkButton label='Informação' icon='info' href='/' />
      </nav>

      {/* Divider */}
      <div className='sidebar-separator h-0.5 rounded-full blur-[2px]' />

      {/* Theme toggle */}
      <LinkButton label='Alterar Tema' icon='dark_mode' href='/' />
    </aside>
  );
}
