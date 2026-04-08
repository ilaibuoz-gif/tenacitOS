import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

const BATCAVE_SERVICES = ["openclaw-gateway"];

export async function GET() {
  try {
    // CPU (prefer real macOS top reading)
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    let cpu = Math.min(Math.round((loadAvg / cpuCount) * 100), 100);
    try {
      const { stdout } = await execAsync("top -l 1 -n 0 | grep 'CPU usage'");
      const match = stdout.match(/(\d+(?:\.\d+)?)% user,\s*(\d+(?:\.\d+)?)% sys/);
      if (match) cpu = Math.round(parseFloat(match[1]) + parseFloat(match[2]));
    } catch {}

    // RAM (prefer vm_stat on macOS over os.freemem())
    const totalMem = os.totalmem();
    let usedMem = totalMem - os.freemem();
    try {
      const { stdout } = await execAsync("vm_stat");
      const pageSizeMatch = stdout.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384;
      const getPages = (name: string) => {
        const regex = new RegExp(`${name}:\\s+(\\d+)\\.`);
        const match = stdout.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      };
      const freePages = getPages('Pages free') + getPages('Pages speculative');
      const freeMem = freePages * pageSize;
      usedMem = Math.max(0, totalMem - freeMem);
    } catch {}
    const ram = {
      used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
      total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
    };

    // Disk
    let diskUsed = 0;
    let diskTotal = 100;
    try {
      const { stdout } = await execAsync("df -BG / | tail -1");
      const parts = stdout.trim().split(/\s+/);
      diskTotal = parseInt(parts[1].replace("G", ""));
      diskUsed = parseInt(parts[2].replace("G", ""));
    } catch (error) {
      console.error("Failed to get disk stats:", error);
    }

    // BatCave services (macOS launchd / process-based checks)
    let activeServices = 0;
    let totalServices = BATCAVE_SERVICES.length;
    try {
      const { stdout } = await execAsync("launchctl list | egrep 'openclaw|mission-control' || true");
      if (/openclaw/i.test(stdout)) activeServices += 1;
    } catch (error) {
      console.error("Failed to get BatCave service stats:", error);
    }

    // Tailscale VPN Status
    let vpnActive = false;
    try {
      const { stdout } = await execAsync("tailscale status 2>/dev/null || true");
      vpnActive = stdout.trim().length > 0 && !stdout.includes("Tailscale is stopped");
    } catch {
      vpnActive = false;
    }

    // Firewall Status (macOS pf fallback, then Linux ufw)
    let firewallActive = false;
    try {
      const { stdout } = await execAsync("pfctl -s info 2>/dev/null || ufw status 2>/dev/null | head -1 || true");
      firewallActive = /status:\s*enabled/i.test(stdout) || stdout.toLowerCase().includes("status: active");
    } catch {
      firewallActive = false;
    }

    // Uptime
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptime = `${days}d ${hours}h`;

    return NextResponse.json({
      cpu,
      ram,
      disk: { used: diskUsed, total: diskTotal },
      vpnActive,
      firewallActive,
      activeServices,
      totalServices,
      uptime,
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch system stats" },
      { status: 500 }
    );
  }
}
