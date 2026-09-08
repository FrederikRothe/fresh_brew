import { getBrewAnalytics, type BrewAnalytics } from "@/app/actions";
import { AnalyzeDashboard } from "@/components/AnalyzeDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyzePage() {
  let analytics: BrewAnalytics | null = null;
  let error: string | null = null;

  try {
    analytics = await getBrewAnalytics();
  } catch {
    error = "Could not load analytics from storage. Check Redis and try again.";
  }

  return <AnalyzeDashboard initialAnalytics={analytics} initialError={error} />;
}
