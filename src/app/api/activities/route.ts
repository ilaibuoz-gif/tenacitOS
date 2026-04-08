import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getActivities } from '@/lib/activities-db';

function sessionToActivity(session: any) {
  const updatedAt = session.updatedAt || session.startedAt || Date.now();
  const status = session.status || 'unknown';
  const display = session.displayName || session.key || 'Session';
  return {
    id: `session-${session.sessionId || session.key}`,
    type: 'session',
    title: `${display}`,
    description: `${status} · ${session.model || 'unknown model'}`,
    status: status === 'running' ? 'success' : status === 'error' ? 'error' : 'info',
    agentId: session.key || 'agent:main:main',
    agentName: display,
    timestamp: updatedAt,
    metadata: {
      sessionKey: session.key,
      model: session.model,
      totalTokens: session.totalTokens,
      channel: session.channel,
      status,
    },
  };
}

function getLiveSessionActivities() {
  try {
    const raw = execSync('openclaw sessions --json', {
      encoding: 'utf-8',
      timeout: 8000,
      cwd: process.cwd(),
    });
    const parsed = JSON.parse(raw);
    const sessions = parsed.sessions || [];
    return sessions
      .map(sessionToActivity)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const source = searchParams.get('source') || 'live';

  try {
    if (source === 'db') {
      const dbResult = getActivities({ limit });
      return NextResponse.json({ activities: dbResult.activities, total: dbResult.total, source: 'db' });
    }

    const liveActivities = getLiveSessionActivities();
    if (liveActivities.length > 0) {
      return NextResponse.json({
        activities: liveActivities.slice(0, limit),
        total: liveActivities.length,
        source: 'openclaw-sessions',
      });
    }

    const fallback = getActivities({ limit });
    return NextResponse.json({ activities: fallback.activities, total: fallback.total, source: 'db-fallback' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: String(error) },
      { status: 500 }
    );
  }
}
