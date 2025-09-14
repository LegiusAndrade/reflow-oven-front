import Image from 'next/image';
import { LinkButton } from '../LinkButton';

export function Sidebar() {
  return (
    <aside className='sidebar inline-flex flex-col p-2 gap-3 rounded-xl items-center'>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} />

      {/* Divider */}
      <div className='sidebar-separator h-[2px] w-[160px] blur-[2px]' />

      {/* Buttons */}
      <LinkButton label='Página Inicial' icon='home' href='/' />
      <LinkButton label='Programas' icon='article' href='/' />
      <LinkButton label='Relatório' icon='analytics' href='/' />
      <LinkButton label='Configuração' icon='settings' href='/' />
      <LinkButton label='Informação' icon='info' href='/' />

      {/* Divider */}
      <div className='sidebar-separator h-[2px] w-[160px] blur-[2px]' />

      {/* Button */}
      <LinkButton label='Alterar Tema' icon='dark_mode' href='/' />
    </aside>
  );
}
