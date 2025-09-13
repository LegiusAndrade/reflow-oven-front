import { LinkButton } from '@/components/LinkButton';
import { Sidebar } from '@/components/Sidebar';

export default function Home() {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <Sidebar />
      <LinkButton label='Click Me' icon='home' href='/next-page' />
    </div>
  );
}
