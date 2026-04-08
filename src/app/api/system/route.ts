import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { OPENCLAW_WORKSPACE, WORKSPACE_IDENTITY } from '@/lib/paths';

const WORKSPACE_PATH = OPENCLAW_WORKSPACE;
const IDENTITY_PATH = WORKSPACE_IDENTITY;
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

function parseIdentityMd(): { name: string; creature: string; emoji: string } {
  try {
    const content = fs.readFileSync(IDENTITY_PATH, 'utf-8');
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const creatureMatch = content.match(/\*\*Creature:\*\*\s*(.+)/);
    const emojiMatch = content.match(/\*\*Emoji:\*\*\s*(.+)/);
    
    return {
      name: nameMatch?.[1]?.trim() || 'Unknown',
      creature: creatureMatch?.[1]?.trim() || 'AI Agent',
      emoji: emojiMatch?.[1]?.match(/./u)?.[0] || '🤖',
    };
  } catch {
    return { name: 'OpenClaw Agent', creature: 'AI Agent', emoji: '🤖' };
  }
}

function getOpenClawSnapshot() {
  const openclawConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf-8'));
  } catch {}

  let sessionsCount = 0;
  let activeSessions = 0;
  try {
    const sessionsPath = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions', 'sessions.json');
    const sessionsStore = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    const values = Object.values(sessionsStore || {}) as any[];
    sessionsCount = values.length;
    activeSessions = values.filter((s) => s && (Date.now() - (s.updatedAt || 0) < 15 * 60 * 1000)).length;
  } catch {}

  const telegramEnabled = !!config?.channels?.telegram?.enabled;
  const gatewayPort = config?.gateway?.port || 18789;
  const gatewayMode = config?.gateway?.mode || 'local';
  const authMode = config?.gateway?.auth?.mode || 'token';
  const model = config?.agents?.defaults?.model?.primary || 'openai-codex/gpt-5.4';

  return {
    integrations: [
      {
        id: 'telegram',
        name: 'Telegram',
        status: telegramEnabled ? 'connected' : 'disconnected',
        icon: 'MessageCircle',
        lastActivity: telegramEnabled ? new Date().toISOString() : null,
        detail: telegramEnabled ? 'Enabled in OpenClaw' : 'Disabled',
      },
    ],
    gateway: {
      mode: gatewayMode,
      port: gatewayPort,
      authMode,
    },
    agent: {
      mainAgentName: process.env.NEXT_PUBLIC_AGENT_NAME || 'Alfred',
      sessionsCount,
      activeSessions,
      model,
    },
  };
}

export async function GET() {
  const identity = parseIdentityMd();
  const uptime = process.uptime();
  const nodeVersion = process.version;
  const snapshot = getOpenClawSnapshot();
  const model = snapshot.agent.model;
  
  const systemInfo = {
    agent: {
      name: identity.name,
      creature: identity.creature,
      emoji: identity.emoji,
    },
    system: {
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      nodeVersion,
      model,
      workspacePath: WORKSPACE_PATH,
      platform: os.platform(),
      hostname: "Ali's Mac mini",
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
    },
    integrations: snapshot.integrations,
    gateway: snapshot.gateway,
    batcave: {
      mainAgentName: snapshot.agent.mainAgentName,
      sessionsCount: snapshot.agent.sessionsCount,
      activeSessions: snapshot.agent.activeSessions,
    },
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json(systemInfo);
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();
    
    if (action === 'change_password') {
      const { currentPassword, newPassword } = data;
      
      // Read current .env.local
      let envContent = '';
      try {
        envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
      } catch {
        return NextResponse.json({ error: 'Could not read configuration' }, { status: 500 });
      }
      
      // Verify current password
      const currentPassMatch = envContent.match(/AUTH_PASSWORD=(.+)/);
      const storedPassword = currentPassMatch?.[1]?.trim();
      
      if (storedPassword !== currentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      
      // Update password
      const newEnvContent = envContent.replace(
        /AUTH_PASSWORD=.*/,
        `AUTH_PASSWORD=${newPassword}`
      );
      
      fs.writeFileSync(ENV_LOCAL_PATH, newEnvContent);
      
      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }
    
    if (action === 'clear_activity_log') {
      const activitiesPath = path.join(process.cwd(), 'data', 'activities.json');
      fs.writeFileSync(activitiesPath, '[]');
      return NextResponse.json({ success: true, message: 'Activity log cleared' });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(seconds)}s`);
  
  return parts.join(' ');
}
