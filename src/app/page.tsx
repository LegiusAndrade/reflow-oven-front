import { Sidebar } from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function Home() {
  return (
    <>
      <TopBar status='Aguardando Iniciar Processo...' amountNotifications={1} connectedServer={true} signalWifi={{ signal: 'OFF' }} />
      <Sidebar />
    </>
  );
}
