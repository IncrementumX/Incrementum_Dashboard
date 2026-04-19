#!/usr/bin/env node
/**
 * tools/build-atlas-manifest.js
 *
 * Parses the Atlas/ filesystem and produces atlas-manifest.json at the repo
 * root (next to index.html), ready for GitHub Pages to serve.
 *
 * Usage:
 *   node tools/build-atlas-manifest.js
 *
 * Run this after any Atlas wiki, work-queue, or decision update so the
 * dashboard tab reflects the latest state. Add it to a build step or
 * pre-commit hook as needed.
 *
 * Output shape: see bottom of file for the full schema comment.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const ATLAS_ROOT = join(REPO_ROOT, "Atlas");
const OUT_PATH = join(REPO_ROOT, "atlas-manifest.json");

// ─── helpers ────────────────────────────────────────────────────────────────

function readFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function listMarkdownFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

/** Extract the H1 title from a markdown file (first `# ` line). */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Extract the last-updated timestamp from a markdown file.
 *  Looks for patterns like `_Last updated: YYYY-MM-DD` or `- YYYY-MM-DD —` */
function extractLastUpdated(content) {
  const match =
    content.match(/_Last updated:\s*([\d-]+)/i) ||
    content.match(/^-\s*([\d]{4}-[\d]{2}-[\d]{2})\s+—/m);
  return match ? match[1] : null;
}

/** Parse the TL;DR section (first 3 lines under ## TL;DR). */
function extractTldr(content) {
  const match = content.match(/##\s+TL;DR\s*\n([\s\S]*?)(?=\n##|\n---|\n$)/i);
  if (!match) return null;
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^[\d]+\.\s*`?/, "").replace(/`$/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

/** True if the content looks like a seed template (Eduardo hasn't filled it). */
function isTemplate(content) {
  return (
    content.includes("Eduardo writes") ||
    content.includes("PARO 3 pending") ||
    content.includes("_Seed template")
  );
}

/** Parse the last N lines of a file. */
function tailLines(content, n = 20) {
  return content.split("\n").slice(-n).join("\n");
}

/** Parse work_queue entries from a work-queue markdown file. */
function parseWorkQueue(content) {
  const entries = [];
  const blocks = content.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0].trim();
    const statusMatch = block.match(/^Status:\s*(.+)$/im);
    const assignedMatch = block.match(/^Assigned_to:\s*(.+)$/im);
    const requestedAtMatch = block.match(/^Requested_at:\s*(.+)$/im);
    const targetMatch = block.match(/^Target:\s*(.+)$/im);
    entries.push({
      id: header.split("—")[0].trim(),
      label: header,
      status: statusMatch ? statusMatch[1].trim() : "unknown",
      assigned_to: assignedMatch ? assignedMatch[1].trim() : null,
      requested_at: requestedAtMatch ? requestedAtMatch[1].trim() : null,
      target: targetMatch ? targetMatch[1].trim() : null,
    });
  }
  return entries;
}

// ─── positions ──────────────────────────────────────────────────────────────

function buildPositions() {
  const dir = join(ATLAS_ROOT, "wiki", "positions");
  const files = listMarkdownFiles(dir);
  return files
    .filter((f) => !f.endsWith(".gitkeep"))
    .map((f) => {
      const content = readFile(f) || "";
      const filename = f.split("/").pop().replace(".md", "");
      return {
        ticker: filename.toUpperCase(),
        file: `Atlas/wiki/positions/${filename}.md`,
        title: extractTitle(content) || filename.toUpperCase(),
        tldr: extractTldr(content),
        last_updated: extractLastUpdated(content),
        is_template: isTemplate(content),
      };
    });
}

// ─── work queues ────────────────────────────────────────────────────────────

function buildWorkQueues() {
  const queueFiles = {
    briefing: join(ATLAS_ROOT, "work_queues", "briefing.md"),
    analysis: join(ATLAS_ROOT, "work_queues", "analysis.md"),
    monitor: join(ATLAS_ROOT, "work_queues", "monitor.md"),
  };
  const result = {};
  for (const [key, path] of Object.entries(queueFiles)) {
    const content = readFile(path) || "";
    result[key] = {
      file: `Atlas/work_queues/${key}.md`,
      entries: parseWorkQueue(content),
      raw_tail: tailLines(content, 10),
    };
  }
  return result;
}

// ─── wiki log ───────────────────────────────────────────────────────────────

function buildWikiLog() {
  const path = join(ATLAS_ROOT, "wiki", "log.md");
  const content = readFile(path) || "";
  const lines = content
    .split("\n")
    .filter((l) => l.match(/^(INGEST|QUERY|LINT|MONITOR|DECISION|BUILD)\s/))
    .slice(-30);
  return {
    file: "Atlas/wiki/log.md",
    recent_operations: lines,
  };
}

// ─── decisions ──────────────────────────────────────────────────────────────

function buildDecisions() {
  const path = join(ATLAS_ROOT, "agents_context", "decisions.md");
  const content = readFile(path) || "";
  const tail = tailLines(content, 30);
  return {
    file: "Atlas/agents_context/decisions.md",
    recent: tail,
  };
}

// ─── issues ─────────────────────────────────────────────────────────────────

function buildIssues() {
  const path = join(ATLAS_ROOT, "agents_context", "issues.md");
  const content = readFile(path) || "";
  // Parse ## Issue blocks
  const blocks = content.split(/^##\s+/m).slice(1);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const title = lines[0].trim();
    const severityMatch = block.match(/^Severity:\s*(.+)$/im);
    const statusMatch = block.match(/^Status:\s*(.+)$/im);
    const dateMatch = block.match(/^Date:\s*(.+)$/im);
    return {
      title,
      severity: severityMatch ? severityMatch[1].trim() : "unknown",
      status: statusMatch ? statusMatch[1].trim() : "open",
      date: dateMatch ? dateMatch[1].trim() : null,
    };
  });
}

// ─── state ──────────────────────────────────────────────────────────────────

function buildState() {
  const path = join(ATLAS_ROOT, "agents_context", "state.md");
  const content = readFile(path) || "";
  return {
    file: "Atlas/agents_context/state.md",
    raw: content,
  };
}

// ─── skills ─────────────────────────────────────────────────────────────────

function buildSkills() {
  const skillsDir = join(ATLAS_ROOT, "skills");
  try {
    const skillFolders = readdirSync(skillsDir).filter((name) => {
      const p = join(skillsDir, name);
      return statSync(p).isDirectory();
    });
    return skillFolders.map((folder) => {
      const skillPath = join(skillsDir, folder, "SKILL.md");
      const content = readFile(skillPath) || "";
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const typeMatch = content.match(/^type:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*([\s\S]+?)(?=\n\w+:|$)/m);
      return {
        folder,
        file: `Atlas/skills/${folder}/SKILL.md`,
        name: nameMatch ? nameMatch[1].trim() : folder,
        type: typeMatch ? typeMatch[1].trim() : "skill",
        description: descMatch ? descMatch[1].replace(/\n/g, " ").trim().slice(0, 120) : null,
        has_skill_md: existsSync(skillPath),
      };
    });
  } catch {
    return [];
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

const manifest = {
  generated_at: new Date().toISOString(),
  generated_by: "tools/build-atlas-manifest.js",
  atlas_root: "Atlas/",
  positions: buildPositions(),
  work_queues: buildWorkQueues(),
  wiki_log: buildWikiLog(),
  decisions: buildDecisions(),
  issues: buildIssues(),
  state: buildState(),
  skills: buildSkills(),
};

writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), "utf8");
console.log(`atlas-manifest.json written → ${OUT_PATH}`);
console.log(`  ${manifest.positions.length} positions`);
console.log(`  ${manifest.skills.length} skills`);
console.log(`  ${manifest.issues.length} open issues`);

/*
 * OUTPUT SCHEMA
 * ─────────────
 * {
 *   generated_at: ISO timestamp,
 *   generated_by: "tools/build-atlas-manifest.js",
 *   atlas_root: "Atlas/",
 *
 *   positions: [
 *     { ticker, file, title, tldr, last_updated, is_template }
 *   ],
 *
 *   work_queues: {
 *     briefing: { file, entries: [...], raw_tail },
 *     analysis: { file, entries: [...], raw_tail },
 *     monitor:  { file, entries: [...], raw_tail },
 *   },
 *
 *   wiki_log: {
 *     file,
 *     recent_operations: [ "<log line>", ... ]  // last 30 INGEST/QUERY/LINT/etc lines
 *   },
 *
 *   decisions: {
 *     file,
 *     recent: "<tail of decisions.md>"
 *   },
 *
 *   issues: [
 *     { title, severity, status, date }
 *   ],
 *
 *   state: {
 *     file,
 *     raw: "<full content of agents_context/state.md>"
 *   },
 *
 *   skills: [
 *     { folder, file, name, type, description, has_skill_md }
 *   ]
 * }
 */
