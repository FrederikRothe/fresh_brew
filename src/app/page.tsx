import { getBrewStatus } from './actions';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialStatus = await getBrewStatus();

  return (
    <main>
      <Dashboard initialStatus={initialStatus} />
    </main>
  );
}
