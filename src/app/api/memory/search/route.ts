/**
 * Memory search API
 * GET /api/memory/search?q=<query>
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/Users/alialzoubi/.openclaw';
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace');
const MEMORY_FILE = path.join(WORKSPACE_DIR, 'MEMORY.md');
const MEMORY_DIR = path.join(WORKSPACE_DIR, 'memory');

function simpleSearch(query: string) {
  const needle = query.toLowerCase();
  const results: Array<{ path: string; snippet: string; score: number }> = [];

  const files = [MEMORY_FILE];
  if (fs.existsSync(MEMORY_DIR)) {
    for (const name of fs.readdirSync(MEMORY_DIR)) {
      if (name.endsWith('.md')) files.push(path.join(MEMORY_DIR, name));
    }
  }

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    const idx = text.toLowerCase().indexOf(needle);
    if (idx >= 0) {
      const start = Math.max(0, idx - 120);
      const end = Math.min(text.length, idx + 240);
      results.push({
        path: file.replace(WORKSPACE_DIR + '/', ''),
        snippet: text.slice(start, end).replace(/\n+/g, ' ').trim(),
        score: 1,
      });
    }
  }

  return results.slice(0, 20);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query) {
    return NextResponse.json({ results: [], total: 0, source: 'empty-query' });
  }

  try {
    try {
      const raw = execSync(`openclaw memory search ${JSON.stringify(query)} --json`, {
        encoding: 'utf-8',
        timeout: 10000,
        cwd: process.cwd(),
      });
      const parsed = JSON.parse(raw);
      const results = parsed.results || [];
      return NextResponse.json({ results, total: results.length, source: 'openclaw-memory' });
    } catch {
      const results = simpleSearch(query);
      return NextResponse.json({ results, total: results.length, source: 'filesystem-fallback' });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search memory', details: String(error) },
      { status: 500 }
    );
  }
}
