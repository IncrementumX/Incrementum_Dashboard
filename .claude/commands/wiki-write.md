# wiki-write — direct wiki page write

Write or update a specific wiki page with content generated in the current conversation.

## Steps

1. **Determine target and content**

   If `$ARGUMENTS` is provided, parse it as the target wiki path (e.g., `assets/gold.md` or `IncrementumOS/wiki/assets/gold.md`).
   If no arguments, ask:
   - Which wiki page to write (path relative to `IncrementumOS/wiki/`)
   - What content to write (or confirm it was just discussed in the conversation)

   Normalize the path to always be `IncrementumOS/wiki/<subfolder>/<slug>.md`.

2. **Check if the file exists**

   a. If the file **does not exist**: proceed directly to step 4 (new page).

   b. If the file **exists with ≤ 10 lines** (stub): proceed directly to step 4 (safe to overwrite).

   c. If the file **exists with > 10 lines**: show a clear diff of what will change and wait for explicit confirmation before proceeding. Do not write without confirmation.

3. **Confirm write** (only for existing files > 10 lines)

   Present the before/after and ask: "Confirma o write?" — proceed only on explicit yes.

4. **Write the file**

   Write the content to `IncrementumOS/wiki/<subfolder>/<slug>.md`.

5. **Append to log.md**

   - Check if a `## YYYY-MM-DD` header for today already exists in `IncrementumOS/wiki/log.md`
   - If it **exists**: append the bullet under the existing header
   - If it **does not exist**: append a new block at the bottom:
     ```
     ## YYYY-MM-DD

     - updated — `wiki/<subfolder>/<slug>.md` (<one-line description of what changed and why>)
     ```
   - Never add a duplicate `## YYYY-MM-DD` header

6. **Report**

   Confirm what was written, the path, and the log entry. If this was a new page, remind:
   > "Página nova — lembra de atualizar `wiki/index.md` com a entrada correspondente, ou rode `/wiki-ingest` se houver artigo raw associado."

## Constraints

- Dates always ISO format `YYYY-MM-DD` — never relative
- Wiki paths are always `IncrementumOS/wiki/<subfolder>/<slug>.md` — never `IncrementumOS/wiki/wiki/...`
- Never invent financial data or claims not discussed in the current conversation
- Never modify `wiki/index.md` — that is the user's or wiki-ingest's responsibility
- Never add a duplicate `## YYYY-MM-DD` header to log.md — coalesce entries under the same date
- If the target path is outside `IncrementumOS/wiki/`, stop and ask for confirmation
