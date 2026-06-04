import { describe, expect, it } from "vitest";
import { execFromSummary } from "./reportsClient";

// The pure DTO → display-row mapping behind the Execuções table. Dates/durations are formatted, so we
// only assert they're strings (timezone-safe) and pin the passthrough + the userName null → "—" fallback.
describe("execFromSummary", () => {
  it("maps a summary DTO to a display row, with userName null → '—'", () => {
    const row = execFromSummary({
      id: "e1",
      programName: "QFN 197",
      startedAt: "2026-06-03T17:50:39Z",
      durationSeconds: 440,
      status: "Concluído",
      userName: null,
      peakTemp: 197,
      peakCurrent: 20,
    });

    expect(row.id).toBe("e1");
    expect(row.programName).toBe("QFN 197");
    expect(row.status).toBe("Concluído");
    expect(row.user).toBe("—");
    expect(typeof row.startedAt).toBe("string");
    expect(typeof row.duration).toBe("string");
  });

  it("keeps the operator name when present", () => {
    const row = execFromSummary({
      id: "e2",
      programName: "BGA",
      startedAt: "2026-06-03T17:50:39Z",
      durationSeconds: 60,
      status: "Concluído",
      userName: "lucas.silva",
      peakTemp: 250,
      peakCurrent: 18,
    });
    expect(row.user).toBe("lucas.silva");
  });
});
