import { AppShell } from "@/components/AppShell";
import { ProgramasScreen } from "@/components/ProgramasScreen";
import { MOCK_PROGRAMS } from "@/lib/programs";

export default function ProgramasPage() {
  return (
    <AppShell>
      <ProgramasScreen programs={MOCK_PROGRAMS} />
    </AppShell>
  );
}
