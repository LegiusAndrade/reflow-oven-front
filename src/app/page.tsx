import { AppShell } from "@/components/AppShell";
import { ProgramGallery } from "@/components/ProgramGallery";
import { MOCK_PROGRAMS } from "@/lib/programs";

export default function Home() {
  return (
    <AppShell>
      <ProgramGallery programs={MOCK_PROGRAMS} />
    </AppShell>
  );
}
