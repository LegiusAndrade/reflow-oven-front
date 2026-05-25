import { AppShell } from "@/components/AppShell";
import { ProgramEditorLoader } from "@/components/ProgramEditorLoader";

export default async function EditarProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <ProgramEditorLoader programId={id} />
    </AppShell>
  );
}
