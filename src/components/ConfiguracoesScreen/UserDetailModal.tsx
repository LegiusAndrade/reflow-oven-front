"use client";

import { Modal } from "@/components/Modal";
import type { User } from "@/lib/users";
import { UserStatusBadge } from "./userBadges";

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className='mb-2 text-sm font-semibold tracking-wide text-(--brand) uppercase'>{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-wrap items-center gap-x-2'>
      <dt className='opacity-60'>{label}:</dt>
      <dd className='font-medium'>{children}</dd>
    </div>
  );
}

/** Read-only user detail (Figma "Page User - Detail"): info + counted activity. `user` is kept
 *  while closing so the content stays put during the modal fade-out. */
export function UserDetailModal({ user, open, onClose }: { user: User | null; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title={user ? `Usuário — ${user.name}` : ""} onClose={onClose} panelClassName='max-h-[85vh] w-[90vw] max-w-2xl'>
      {user && (
        <div className='flex flex-col gap-5'>
          <section>
            <Heading>Detalhes do Usuário</Heading>
            <dl className='grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2'>
              <Field label='Usuário'>{user.name}</Field>
              <Field label='E-mail'>{user.email}</Field>
              <Field label='Status'>
                <UserStatusBadge status={user.status} />
              </Field>
              <Field label='Tipo'>{user.type}</Field>
              <Field label='Criado em'>{user.createdAt}</Field>
              <Field label='Último Login'>{user.lastLogin}</Field>
            </dl>
          </section>

          <section>
            <Heading>Eventos</Heading>
            <ul className='flex flex-col gap-1.5'>
              {user.events.map((e) => (
                <li key={e.label}>
                  <span className='font-semibold tabular-nums'>{e.count}</span> {e.label}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}
