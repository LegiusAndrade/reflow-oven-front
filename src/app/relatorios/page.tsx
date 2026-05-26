import { AppShell } from "@/components/AppShell";
import { RelatoriosScreen } from "@/components/RelatoriosScreen";
import { MOCK_CHANGES, MOCK_ERRORS, MOCK_EXECUTIONS } from "@/lib/reports";

export default function RelatoriosPage() {
  return (
    <AppShell>
      <RelatoriosScreen executions={MOCK_EXECUTIONS} changes={MOCK_CHANGES} errors={MOCK_ERRORS} />
    </AppShell>
  );
}
