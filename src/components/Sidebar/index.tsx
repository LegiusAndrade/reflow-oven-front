import { clsx } from 'clsx';
import Image from 'next/image';
import { LinkButton } from '../LinkButton';

export function Sidebar() {
  return (
    <aside className={clsx('sidebar', 'inline-flex', 'flex-col', 'p-2', 'gap-3', 'rounded-xl', 'items-center', 'mt-1', 'lg:mt-2')}>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} priority />

      {/* Divider */}
      <div className='sidebar-separator w-full blur-[2px] h-[2px] rounded-full' />

      {/* Buttons */}
      <section className='inline-flex flex-col w-full gap-2'>
        <LinkButton label='Página Inicial' icon='home' href='/' />
        <LinkButton label='Programas' icon='article' href='/' />
        <LinkButton label='Relatório' icon='analytics' href='/' />
        <LinkButton label='Configuração' icon='settings' href='/' />
        <LinkButton label='Informação' icon='info' href='/' />
      </section>

      {/* Divider */}
      <div className='sidebar-separator w-full blur-[2px] h-[2px] rounded-full' />

      {/* Button */}
      <LinkButton label='Alterar Tema' icon='dark_mode' href='/' />
    </aside>
  );
}
