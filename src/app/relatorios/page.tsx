import { Suspense } from "react";
import { RelatoriosScreen } from "@/components/RelatoriosScreen";

/** Suspense boundary is required by useSearchParams (the deep-link `?until=` filter) at prerender. */
export default function RelatoriosPage() {
  return (
    <Suspense fallback={null}>
      <RelatoriosScreen />
    </Suspense>
  );
}
