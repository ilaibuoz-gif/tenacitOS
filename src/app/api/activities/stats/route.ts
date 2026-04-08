import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getActivityStats } from '@/lib/activities-db';

function buildStatsFromSessions(sessions: any[]) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const total = sessions.length;
  const today = sessions.filter((s) => (s.updatedAt || s.startedAt || 0) >= dayAgo).length;

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = { session: total };
  const heatmapMap: Record<string, number> = {};
  const trendMap: Record<string, { count: number; success: number; errors: number }> = {};

  for (const session of sessions) {
    const rawStatus = session.status || 'unknown';
    const normalizedStatus = rawStatus === 'running' ? 'success' : rawStatus === 'error' ? 'error' : 'info';
    byStatus[normalizedStatus] = (byStatus[normalizedStatus] || 0) + 1;

    const ts = session.updatedAt || session.startedAt || now;
    const date = new Date(ts).toISOString().slice(0, 10);
    heatmapMap[date] = (heatmapMap[date] || 0) + 1;

    if (!trendMap[date]) trendMap[date] = { count: 0, success: 0, errors: 0 };
    trendMap[date].count += 1;
    if (normalizedStatus === 'success') trendMap[date].success += 1;
    if (normalizedStatus === 'error') trendMap[date].errors += 1;
  }

  const heatmap = Object.entries(heatmapMap)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const trend = Object.entries(trendMap)
    .map(([day, value]) => ({ day, ...value }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    total,
    today,
    byStatus,
    byType,
    heatmap,
    trend,
    source: 'openclaw-sessions',
  };
}

export async function GET() {
  try {
    try {
      const raw = execSync('openclaw sessions --json', {
        encoding: 'utf-8',
        timeout: 8000,
        cwd: process.cwd(),
      });
      const parsed = JSON.parse(raw);
      const sessions = parsed.sessions || [];
      return NextResponse.json(buildStatsFromSessions(sessions));
    } catch {
      const stats = getActivityStats();
      return NextResponse.json({ ...stats, source: 'db-fallback' });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch activity stats', details: String(error) },
      { status: 500 }
    );
  }
}
