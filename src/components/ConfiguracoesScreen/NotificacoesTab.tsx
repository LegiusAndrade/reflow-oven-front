"use client";

import { TableScrollBox } from "@/components/TableScrollBox";
import { showToast } from "@/lib/toast";
import type { BuzzerSound, NotificationKind, NotificationProcess } from "@/lib/settings";
import { FormFooter, Segmented, Toggle, useSettingsDraft } from "./fields";
import { KindSelect } from "./KindSelect";

const PROCESS_OPTIONS: { value: NotificationProcess; label: string; icon: string }[] = [
  { value: "Parar Processo", label: "Parar", icon: "stop_circle" },
  { value: "Continuar Processo", label: "Continuar", icon: "play_circle" },
];

const SOUND_OPTIONS: { value: BuzzerSound; label: string; icon: string }[] = [
  { value: "Contínuo", label: "Contínuo", icon: "graphic_eq" },
  { value: "Pulsante", label: "Pulsante", icon: "vibration" },
];

/** Notificações tab: per-alert process, buzzer + sound, and editable severity. */
export function NotificacoesTab() {
  const { draft, setDraft, dirty, save, cancel } = useSettingsDraft();

  const patch = (id: string, change: Partial<{ process: NotificationProcess; buzzer: boolean; sound: BuzzerSound; kind: NotificationKind }>) =>
    setDraft({ ...draft, notifications: draft.notifications.map((n) => (n.id === id ? { ...n, ...change } : n)) });

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='min-h-0 flex-1'>
        <TableScrollBox>
          <table className='w-full border-collapse text-left'>
            <thead className='sticky top-0 z-10 text-sm'>
              <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
                <th className='w-12'>#</th>
                <th>Alerta</th>
                <th>Processo</th>
                <th>Buzzer</th>
                <th>Som do Buzzer</th>
                <th>Tipo de Notificação</th>
              </tr>
            </thead>
            <tbody>
              {draft.notifications.map((n, i) => (
                <tr key={n.id} className='border-t border-white/10 [&>td]:px-4 [&>td]:py-3'>
                  <td className='tabular-nums opacity-70'>{i + 1}</td>
                  <td className='font-medium'>{n.alert}</td>
                  <td>
                    <Segmented
                      options={PROCESS_OPTIONS}
                      value={n.process}
                      onChange={(process) => patch(n.id, { process })}
                      label={`Processo — ${n.alert}`}
                    />
                  </td>
                  <td>
                    <Toggle checked={n.buzzer} onChange={(buzzer) => patch(n.id, { buzzer })} label={`Buzzer — ${n.alert}`} />
                  </td>
                  <td>
                    <Segmented
                      options={SOUND_OPTIONS}
                      value={n.sound}
                      onChange={(sound) => patch(n.id, { sound })}
                      label={`Som — ${n.alert}`}
                      disabled={!n.buzzer}
                    />
                  </td>
                  <td>
                    <KindSelect value={n.kind} onChange={(kind) => patch(n.id, { kind })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScrollBox>
      </div>

      <FormFooter
        dirty={dirty}
        onCancel={cancel}
        onSave={() => {
          save();
          // TODO(backend): show this on the API success response.
          showToast("Configurações salvas");
        }}
      />
    </div>
  );
}
