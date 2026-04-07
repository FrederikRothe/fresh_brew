import { getBrewStatus, getPredictedNextBrew } from './actions';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [initialStatus, predictedNextBrew] = await Promise.all([
    getBrewStatus(),
    getPredictedNextBrew(),
  ]);

  return (
    <main>
      <Dashboard initialStatus={initialStatus} predictedNextBrew={predictedNextBrew} />
    </main>
  );
}
