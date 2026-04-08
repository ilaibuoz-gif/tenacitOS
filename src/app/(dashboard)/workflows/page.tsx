"use client";

interface Workflow {
  id: string;
  emoji: string;
  name: string;
  description: string;
  schedule: string;
  steps: string[];
  status: "active" | "inactive";
  trigger: "cron" | "demand";
}

const WORKFLOWS: Workflow[] = [
  {
    id: "daily-briefing",
    emoji: "🗞️",
    name: "Daily Briefing",
    description: "Morning digest of what matters across Alfred's world: inbox, sessions, tasks, and anything that needs Ali's attention.",
    schedule: "08:00 every day",
    trigger: "cron",
    status: "active",
    steps: [
      "Check recent OpenClaw sessions and unresolved tasks",
      "Scan key updates from messages, alerts, and work in progress",
      "Summarize the most important changes since yesterday",
      "Highlight anything blocked, urgent, or worth reviewing",
      "Deliver a concise briefing to Ali",
    ],
  },
  {
    id: "agent-watch",
    emoji: "🧠",
    name: "Agent Watch",
    description: "Keep an eye on Alfred, spawned specialists, and background work so nothing quietly stalls.",
    schedule: "Every 30 minutes",
    trigger: "cron",
    status: "active",
    steps: [
      "Inspect active sessions and long-running work",
      "Spot stuck or unusually expensive runs",
      "Check for subagents that need steering or cleanup",
      "Surface anything that needs human attention",
      "Send a short operational summary when something matters",
    ],
  },
  {
    id: "memory-curation",
    emoji: "📝",
    name: "Memory Curation",
    description: "Turn raw daily context into useful long-term memory so Alfred stays sharp instead of noisy.",
    schedule: "21:30 every day",
    trigger: "cron",
    status: "active",
    steps: [
      "Review recent daily memory files",
      "Extract lasting decisions, preferences, and lessons",
      "Update long-term memory with the important bits",
      "Avoid clutter and duplicated notes",
      "Leave tomorrow's Alfred with cleaner context",
    ],
  },
  {
    id: "repo-guardian",
    emoji: "🔧",
    name: "Repo Guardian",
    description: "Watch the BatCave codebase and Alfred's tooling so changes stay healthy and recoverable.",
    schedule: "Every 4 hours",
    trigger: "cron",
    status: "active",
    steps: [
      "Check git status in key workspaces",
      "Flag risky uncommitted changes or broken builds",
      "Suggest or create safe checkpoints when appropriate",
      "Track BatCave-specific work in progress",
      "Report anything that looks fragile",
    ],
  },
  {
    id: "advisors-on-demand",
    emoji: "🦇",
    name: "Alfred On Demand",
    description: "A direct command workflow for when Ali wants Alfred to investigate, build, or coordinate something immediately.",
    schedule: "On demand",
    trigger: "demand",
    status: "active",
    steps: [
      "Receive Ali's instruction",
      "Choose the right tools or specialist sessions",
      "Do the work or orchestrate it",
      "Report clearly with decisions and next steps",
      "Write down anything worth remembering",
    ],
  },
];

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: status === "active" ? "var(--positive)" : "var(--text-muted)",
      }} />
      <span style={{
        fontFamily: "var(--font-body)",
        fontSize: "10px",
        fontWeight: 600,
        color: status === "active" ? "var(--positive)" : "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {status === "active" ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function TriggerBadge({ trigger }: { trigger: "cron" | "demand" }) {
  return (
    <div style={{
      padding: "2px 7px",
      backgroundColor: trigger === "cron"
        ? "rgba(59, 130, 246, 0.12)"
        : "rgba(168, 85, 247, 0.12)",
      border: `1px solid ${trigger === "cron" ? "rgba(59, 130, 246, 0.25)" : "rgba(168, 85, 247, 0.25)"}`,
      borderRadius: "5px",
      fontFamily: "var(--font-body)",
      fontSize: "10px",
      fontWeight: 600,
      color: trigger === "cron" ? "#60a5fa" : "var(--accent)",
      letterSpacing: "0.4px",
      textTransform: "uppercase" as const,
    }}>
      {trigger === "cron" ? "⏱ Scheduled" : "⚡ On demand"}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "-1px",
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}>
          Workflows
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
          {WORKFLOWS.filter(w => w.status === "active").length} active workflows · {WORKFLOWS.filter(w => w.trigger === "cron").length} scheduled · {WORKFLOWS.filter(w => w.trigger === "demand").length} on demand
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        {[
          { label: "Total workflows", value: WORKFLOWS.length, color: "var(--text-primary)" },
          { label: "Scheduled", value: WORKFLOWS.filter(w => w.trigger === "cron" && w.status === "active").length, color: "#60a5fa" },
          { label: "On demand", value: WORKFLOWS.filter(w => w.trigger === "demand").length, color: "var(--accent)" },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: "16px 20px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            minWidth: "140px",
          }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "28px",
              fontWeight: 700,
              color: stat.color,
              marginBottom: "4px",
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {WORKFLOWS.map((workflow) => (
          <div
            key={workflow.id}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "22px" }}>{workflow.emoji}</span>
                  <h2 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}>
                    {workflow.name}
                  </h2>
                </div>
                <p style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  margin: 0,
                  maxWidth: "780px",
                }}>
                  {workflow.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <TriggerBadge trigger={workflow.trigger} />
                <StatusBadge status={workflow.status} />
              </div>
            </div>

            <div style={{ marginBottom: "12px", fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--text-secondary)" }}>Schedule:</strong> {workflow.schedule}
            </div>

            <ol style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "8px" }}>
              {workflow.steps.map((step, idx) => (
                <li
                  key={idx}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
