import { clsx } from 'clsx';
import Image from 'next/image';

export function Sidebar() {
  return (
    <aside className={clsx('sidebar', 'flex', 'inline-flex', 'border-8', 'border-cyan-200', 'p-2', 'gap-3', 'rounded-xl', 'items-center')}>
      {/* Logo */}
      <Image src='/Logo.svg' alt='Logo' width={92} height={92} priority />

      {/* Divider */}
      <div className='sidebar-separator h-[4px] w-[calc(100%_-_4px)] mx-[2px] my-4' />

      {/* Buttons */}
      {/* <section className='flex flex-col w-full'>
        <LinkButton label='Página Inicial' icon='home' href='/' />
        <LinkButton label='Programas' icon='article' href='/' />
        <LinkButton label='Relatório' icon='analytics' href='/' />
        <LinkButton label='Configuração' icon='settings' href='/' />
        <LinkButton label='Informação' icon='info' href='/' />
      </section> */}

      {/* Divider */}
      {/* <div className='sidebar-separator h-[2px] w-[160px] blur-[2px]' /> */}

      {/* Button */}
      {/* <LinkButton label='Alterar Tema' icon='dark_mode' href='/' /> */}
    </aside>
  );
}
