import InitialScreen from "@/components/InitialScreen";
import { MOCK_PROGRAMS } from "@/lib/programs";
import { MOCK_READINGS } from "@/lib/sensors";

export default function Home() {
  return <InitialScreen programs={MOCK_PROGRAMS} readings={MOCK_READINGS} />;
}
