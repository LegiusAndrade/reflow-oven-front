import { AppShell } from "@/components/AppShell";
import { RelatoriosScreen } from "@/components/RelatoriosScreen";
import { MOCK_EXECUTIONS } from "@/lib/reports";

export default function RelatoriosPage() {
  return (
    <AppShell>
      <RelatoriosScreen executions={MOCK_EXECUTIONS} />
    </AppShell>
  );
}
