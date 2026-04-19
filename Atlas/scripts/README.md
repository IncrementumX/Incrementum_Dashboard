# Atlas/scripts/

Automation scripts for the Atlas research system. All scripts are designed to
run from the repo root.

---

## atlas-briefing.py

Daily briefing runner. Reads `work_queues/briefing.md` for the target list,
pulls news via Perplexity (when wired) or Claude web search (fallback), and
writes a dated briefing to `wiki/summaries/`.

**Requirements:**
```
pip install anthropic          # for Claude fallback branch
pip install openai             # for Perplexity branch (sprint 2)
# Python 3.9+ (uses zoneinfo)
```

**Usage:**
```bash
# Dry run (no API calls, no file writes)
python Atlas/scripts/atlas-briefing.py --dry-run

# Live run (requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=sk-ant-...
python Atlas/scripts/atlas-briefing.py

# Override date
python Atlas/scripts/atlas-briefing.py --date 2026-04-20
```

### Scheduling on Mac — crontab

Edit the cron table:
```bash
crontab -e
```

Add this line to run at 07:00 America/Sao_Paulo (= 10:00 UTC in summer, 11:00 UTC in winter).
Adjust the UTC offset for your DST situation.

```cron
# Atlas briefing — 07:00 America/Sao_Paulo (UTC-3 standard / UTC-2 DST)
# Adjust the hour when Brazil DST changes (November–March: UTC-2, April–October: UTC-3).
0 10 * * 1-5 cd /Users/incrementum/Documents/Claude/Projects/Incrementum && \
  ANTHROPIC_API_KEY="sk-ant-..." \
  python Atlas/scripts/atlas-briefing.py >> /tmp/atlas-briefing.log 2>&1
```

### Scheduling on Mac — launchd (preferred for reliability)

Create `~/Library/LaunchAgents/com.incrementum.atlas-briefing.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.incrementum.atlas-briefing</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/incrementum/Documents/Claude/Projects/Incrementum/Atlas/scripts/atlas-briefing.py</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/incrementum/Documents/Claude/Projects/Incrementum</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key>
        <string>sk-ant-REPLACE_ME</string>
    </dict>

    <!-- 07:00 America/Sao_Paulo = 10:00 UTC (standard time) -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>10</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/tmp/atlas-briefing-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/atlas-briefing-stderr.log</string>

    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.incrementum.atlas-briefing.plist
```

Unload:
```bash
launchctl unload ~/Library/LaunchAgents/com.incrementum.atlas-briefing.plist
```

### OpenClaw deployment (when Eduardo migrates)

When the system moves to OpenClaw, replace the launchd config with:
```bash
# In OpenClaw agent config
cron: "0 10 * * 1-5"
command: "python Atlas/scripts/atlas-briefing.py"
working_directory: "/path/to/Incrementum"
env:
  ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
  PERPLEXITY_API_KEY: "${PERPLEXITY_API_KEY}"  # once sprint 2 lands
```

---

## atlas-selftest.py

Filesystem invariant validator. Checks that all skill folders have SKILL.md,
all wiki pages linked from `wiki/index.md` exist, all position pages have the
8 required sections, and no position page contains unsourced numbers.

**Usage:**
```bash
python Atlas/scripts/atlas-selftest.py
```

Expected output: `All checks passed.` or a list of issues to fix before
Eduardo's morning review.

Run this before every commit that touches `Atlas/wiki/` or `Atlas/skills/`.

---

## requirements.txt (Atlas scripts)

```
anthropic>=0.40.0
openai>=1.0.0      # Perplexity uses OpenAI-compatible API (sprint 2)
```

Install:
```bash
pip install anthropic openai
```
