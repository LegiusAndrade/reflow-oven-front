import Link from "next/link";
import { IconGeneral } from "@/components/Icon/IconGeneral";

/** Placeholder for screens not built yet — keeps the shell + a close-to-home action. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className='card flex h-full flex-col gap-4 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3'>
        <h1 className='text-2xl font-semibold'>{title}</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      <div className='grid flex-1 place-items-center'>
        <div className='flex flex-col items-center gap-2 opacity-60'>
          <IconGeneral icon='construction' fill={0} className='[--icon-size:3rem]' />
          <p className='text-lg'>Em construção</p>
        </div>
      </div>
    </section>
  );
}
