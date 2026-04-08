import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { scanAllSkills } from '@/lib/skill-parser';

function mapOpenClawSkill(skill: any) {
  return {
    id: skill.name,
    name: skill.name,
    description: skill.description || 'No description available.',
    emoji: skill.emoji || '🧩',
    category: skill.source || (skill.bundled ? 'openclaw-bundled' : 'workspace'),
    status: skill.disabled ? 'disabled' : skill.eligible ? 'active' : 'available',
    source: skill.source || 'unknown',
    bundled: !!skill.bundled,
    homepage: skill.homepage || null,
    missing: skill.missing || null,
  };
}

export async function GET() {
  try {
    try {
      const raw = execSync('openclaw skills list --json', {
        encoding: 'utf-8',
        timeout: 10000,
        cwd: process.cwd(),
      });
      const parsed = JSON.parse(raw);
      const installed = (parsed.skills || []).map(mapOpenClawSkill);
      return NextResponse.json({
        skills: installed,
        total: installed.length,
        source: 'openclaw-skills',
      });
    } catch {
      const skills = scanAllSkills().map((skill: any) => ({
        id: skill.id || skill.name,
        name: skill.name,
        description: skill.description || 'No description available.',
        emoji: skill.emoji || '🧩',
        category: skill.category || 'workspace',
        status: 'active',
        source: 'filesystem-fallback',
        bundled: false,
        homepage: null,
        missing: null,
      }));
      return NextResponse.json({
        skills,
        total: skills.length,
        source: 'filesystem-fallback',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch skills', details: String(error) },
      { status: 500 }
    );
  }
}
