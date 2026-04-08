"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Network, Server, ArrowDown, ArrowUp, RotateCw, Square, FileText, Bot, MessageSquare } from "lucide-react";

interface TailscaleDevice {
  ip: string;
  hostname: string;
  os: string;
  online: boolean;
}

interface FirewallRule {
  port: string;
  action: string;
  from: string;
  comment?: string;
}

interface Service {
  name: string;
  status: string;
  description?: string;
  backend?: "systemd" | "pm2";
}

interface Integration {
  id: string;
  name: string;
  status: string;
  icon: string;
  lastActivity: string | null;
  detail: string | null;
}

interface SystemData {
  hostname: string;
  uptime: number;
  cpu: { usage: number; cores: number[]; loadAvg: number[] };
  ram: { used: number; total: number };
  disk: { used: number; total: number; percent: number };
  network: { rx: number; tx: number };
  systemd: Service[];
  pm2: Service[];
  tailscale: { active: boolean; ip: string | null; devices: TailscaleDevice[] };
  firewall: { active: boolean; rules: FirewallRule[]; ruleCount: number };
  integrations?: Integration[];
  gateway?: { mode: string; port: number; authMode: string };
  batcave?: { mainAgentName: string; sessionsCount: number; activeSessions: number };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB/s`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SystemPage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsModal, setLogsModal] = useState<{ name: string; backend: "systemd" | "pm2"; content: string } | null>(null);

  const fetchSystemData = async () => {
    try {
      const [monitorRes, systemRes] = await Promise.all([
        fetch("/api/system/monitor"),
        fetch("/api/system"),
      ]);
      const monitorData = await monitorRes.json();
      const systemInfo = await systemRes.json();
      setSystemData({
        ...monitorData,
        integrations: systemInfo.integrations || [],
        gateway: systemInfo.gateway,
        batcave: systemInfo.batcave,
      });
    } catch (error) {
      console.error("Failed to fetch system data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const runServiceAction = async (name: string, backend: "systemd" | "pm2", action: "restart" | "stop") => {
    try {
      await fetch("/api/system/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, backend, action }),
      });
      fetchSystemData();
    } catch (error) {
      console.error(error);
    }
  };

  const viewLogs = async (svc: Service) => {
    try {
      const res = await fetch("/api/system/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: svc.name, backend: svc.backend || "pm2", action: "logs" }),
      });
      const data = await res.json();
      setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: data.output || "No logs" });
    } catch (e) {
      setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: String(e) });
    }
  };

  if (loading || !systemData) {
    return <div className="p-6" style={{ color: "var(--text-secondary)" }}>Loading system data...</div>;
  }

  const activeServices = systemData.systemd.filter((s) => s.status === "active").length;
  const relevantServices = systemData.systemd.filter((svc) => ["openclaw-gateway", "mission-control"].includes(svc.name));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            System Monitor
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Live telemetry for Master Ali's Mac mini, Alfred, and the BatCave stack</p>
        </div>
        <button
          onClick={fetchSystemData}
          className="p-2 rounded-lg"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <RotateCw className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
              <Server className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{systemData.hostname}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Primary BatCave machine</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Uptime: {formatUptime(systemData.uptime)}</p>
        </div>

        {systemData.gateway && systemData.batcave && (
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <Bot className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>OpenClaw Gateway</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.gateway.mode} mode</p>
              </div>
            </div>
            <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <div>Port: <span style={{ color: 'var(--text-primary)' }}>{systemData.gateway.port}</span></div>
              <div>Auth: <span style={{ color: 'var(--text-primary)' }}>{systemData.gateway.authMode}</span></div>
              <div>Main agent: <span style={{ color: 'var(--text-primary)' }}>{systemData.batcave.mainAgentName}</span></div>
              <div>Sessions: <span style={{ color: 'var(--text-primary)' }}>{systemData.batcave.sessionsCount}</span></div>
              <div>Active sessions: <span style={{ color: 'var(--text-primary)' }}>{systemData.batcave.activeSessions}</span></div>
            </div>
          </div>
        )}

        {systemData.integrations && systemData.integrations.length > 0 && (
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <MessageSquare className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Channels</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Current BatCave communication surfaces</p>
              </div>
            </div>
            <div className="space-y-2">
              {systemData.integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-primary)' }}>{integration.name}</span>
                  <span style={{ color: integration.status === 'connected' ? '#4ade80' : 'var(--text-secondary)' }}>
                    {integration.status === 'connected' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>CPU Usage</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{systemData.cpu.usage}%</p>
            </div>
            <Cpu className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.cpu.cores.length} core view</p>
        </div>

        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>RAM</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{systemData.ram.used.toFixed(1)} / {systemData.ram.total.toFixed(1)} GB</p>
            </div>
            <MemoryStick className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{Math.round((systemData.ram.used / systemData.ram.total) * 100)}% used</p>
        </div>

        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Disk</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{systemData.disk.used.toFixed(1)} / {systemData.disk.total.toFixed(1)} GB</p>
            </div>
            <HardDrive className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.disk.percent}% used</p>
        </div>

        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Network</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{formatBytes(systemData.network.rx + systemData.network.tx)}</p>
            </div>
            <Network className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Mac mini network throughput</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            BatCave Services ({activeServices}/{relevantServices.length} active)
          </h3>
          <div className="space-y-3">
            {relevantServices.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{svc.name}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{svc.description || 'BatCave service'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: svc.status === 'active' ? '#4ade80' : 'var(--text-secondary)' }}>{svc.status}</span>
                  <button onClick={() => viewLogs(svc)} className="p-1"><FileText className="w-4 h-4" /></button>
                  <button onClick={() => runServiceAction(svc.name, svc.backend || 'systemd', 'restart')} className="p-1"><RotateCw className="w-4 h-4" /></button>
                  <button onClick={() => runServiceAction(svc.name, svc.backend || 'systemd', 'stop')} className="p-1"><Square className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Security & Connectivity</h3>
          <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <div>Tailscale: <span style={{ color: systemData.tailscale.active ? '#4ade80' : 'var(--text-primary)' }}>{systemData.tailscale.active ? 'Enabled' : 'Off'}</span></div>
            <div>Firewall: <span style={{ color: systemData.firewall.active ? '#4ade80' : 'var(--text-primary)' }}>{systemData.firewall.active ? 'Enabled' : 'Off'}</span></div>
            <div>Known firewall rules: <span style={{ color: 'var(--text-primary)' }}>{systemData.firewall.ruleCount}</span></div>
            <div>Detected Tailscale devices: <span style={{ color: 'var(--text-primary)' }}>{systemData.tailscale.devices.length}</span></div>
          </div>
        </div>
      </div>

      {logsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-4xl rounded-xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Logs: {logsModal.name}</h3>
              <button onClick={() => setLogsModal(null)} style={{ color: "var(--text-secondary)" }}>Close</button>
            </div>
            <pre className="text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {logsModal.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
