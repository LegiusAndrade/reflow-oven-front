import { Sidebar } from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function Home() {
  return (
    <>
      <TopBar
        status='Aguardando Iniciar Processo...'
        statusNotification={{ amount: 3, status: 'ACTIVE' }}
        connectedServer={true}
        signalWifi={{ signal: 'OFF' }}
      />
      <Sidebar />
    </>
  );
}
