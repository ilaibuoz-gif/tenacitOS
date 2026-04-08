import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface Agent {
  id: string;
  name?: string;
  emoji: string;
  color: string;
  model: string;
  workspace: string;
  dmPolicy?: string;
  allowAgents?: string[];
  allowAgentsDetails?: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>;
  botToken?: string;
  status: "online" | "offline";
  lastActivity?: string;
  activeSessions: number;
}

// Fallback config used when an agent doesn't define its own ui config in openclaw.json.
// The main agent reads name/emoji from env vars; all others fall back to generic defaults.
// Override via each agent's openclaw.json → ui.emoji / ui.color / name fields.
const DEFAULT_AGENT_CONFIG: Record<string, { emoji: string; color: string; name?: string }> = {
  main: {
    emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || "🦇",
    color: "#f59e0b",
    name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alfred",
  },
};

/**
 * Get agent display info (emoji, color, name) from openclaw.json or defaults
 */
function getAgentDisplayInfo(agentId: string, agentConfig: any): { emoji: string; color: string; name: string } {
  // First try to get from agent's own config in openclaw.json
  const configEmoji = agentConfig?.ui?.emoji;
  const configColor = agentConfig?.ui?.color;
  const configName = agentConfig?.name;

  // Then try defaults
  const defaults = DEFAULT_AGENT_CONFIG[agentId];

  return {
    emoji: configEmoji || defaults?.emoji || "🤖",
    color: configColor || defaults?.color || "#666666",
    name: configName || defaults?.name || agentId,
  };
}

export async function GET() {
  try {
    // Read openclaw config
    const configPath = (process.env.OPENCLAW_DIR || "/root/.openclaw") + "/openclaw.json";
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    const configuredAgents = Array.isArray(config.agents?.list) ? config.agents.list : [];

    // Ensure the main Alfred agent exists even when the config has no explicit agents.list entry
    const mainExists = configuredAgents.some((agent: any) => agent.id === 'main');
    const normalizedAgents = mainExists
      ? configuredAgents
      : [
          {
            id: 'main',
            name: process.env.NEXT_PUBLIC_AGENT_NAME || 'Alfred',
            workspace: join(process.env.OPENCLAW_DIR || '/Users/alialzoubi/.openclaw', 'workspace'),
            model: config.agents?.defaults?.model,
            subagents: { allowAgents: [] },
            ui: {
              emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || '🦇',
              color: '#f59e0b',
            },
          },
          ...configuredAgents,
        ];

    let sessions: any[] = [];
    try {
      const rawSessions = execSync('openclaw sessions --json', {
        encoding: 'utf-8',
        timeout: 8000,
      });
      sessions = JSON.parse(rawSessions).sessions || [];
    } catch {
      sessions = [];
    }

    // Get agents from config
    const agents: Agent[] = normalizedAgents.map((agent: any) => {
      const agentInfo = getAgentDisplayInfo(agent.id, agent);

      // Get telegram account info
      const telegramAccount =
        config.channels?.telegram?.accounts?.[agent.id];
      const botToken = telegramAccount?.botToken;

      // Check real session activity for this agent
      const agentSessions = sessions.filter((session: any) => {
        const key = session.key || '';
        return key.startsWith(`agent:${agent.id}:`);
      });

      const mostRecentSession = agentSessions
        .slice()
        .sort((a: any, b: any) => (b.updatedAt || b.startedAt || 0) - (a.updatedAt || a.startedAt || 0))[0];

      let lastActivity = undefined;
      let status: "online" | "offline" = "offline";

      if (mostRecentSession) {
        const ts = mostRecentSession.updatedAt || mostRecentSession.startedAt;
        if (ts) {
          lastActivity = new Date(ts).toISOString();
          status = Date.now() - ts < 15 * 60 * 1000 ? "online" : "offline";
        }
      }

      if (agent.id === 'main' && agentSessions.length > 0) {
        status = 'online';
      }

      // Get details of allowed subagents
      const allowAgents = agent.subagents?.allowAgents || [];
      const allowAgentsDetails = allowAgents.map((subagentId: string) => {
        // Find subagent in config
        const subagentConfig = config.agents.list.find(
          (a: any) => a.id === subagentId
        );
        if (subagentConfig) {
          const subagentInfo = getAgentDisplayInfo(subagentId, subagentConfig);
          return {
            id: subagentId,
            name: subagentConfig.name || subagentInfo.name,
            emoji: subagentInfo.emoji,
            color: subagentInfo.color,
          };
        }
        // Fallback if subagent not found in config
        const fallbackInfo = getAgentDisplayInfo(subagentId, null);
        return {
          id: subagentId,
          name: fallbackInfo.name,
          emoji: fallbackInfo.emoji,
          color: fallbackInfo.color,
        };
      });

      return {
        id: agent.id,
        name: agent.name || agentInfo.name,
        emoji: agentInfo.emoji,
        color: agentInfo.color,
        model:
          agent.model?.primary || config.agents.defaults.model.primary,
        workspace: agent.workspace,
        dmPolicy:
          telegramAccount?.dmPolicy ||
          config.channels?.telegram?.dmPolicy ||
          "pairing",
        allowAgents,
        allowAgentsDetails,
        botToken: botToken ? "configured" : undefined,
        status,
        lastActivity,
        activeSessions: agentSessions.length,
      };
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error reading agents:", error);
    return NextResponse.json(
      { error: "Failed to load agents" },
      { status: 500 }
    );
  }
}
