# wiki-query — Karpathy Query operation

Answer a question against the IncrementumOS wiki.

**Query:** $ARGUMENTS

## Steps

1. **Check for a question**
   - If $ARGUMENTS is empty, ask the user: "What would you like to query from the wiki?"
   - Stop and wait for input

2. **Read the index**
   - Read `IncrementumOS/wiki/index.md`
   - If index is empty (no pages listed), report: "wiki/ is currently empty — no pages to query against" and stop

3. **Identify relevant pages**
   - Based on $ARGUMENTS, select up to **3** most relevant pages from the index
   - Relevance: topic overlap, keyword match, conceptual alignment

4. **Read those pages**
   - Read each selected page in full

5. **Synthesize a response**
   - Answer the question based only on what the wiki pages contain
   - Use citations in `[[page-name]]` format for every claim drawn from a specific page
   - Write clearly and concisely — no padding

6. **Flag gaps**
   - End with a "**Gaps**" section: list specific sub-questions or angles the wiki does not currently address
   - If the wiki fully answers the question, write "No gaps identified for this query."

## Constraints

- Maximum 3 pages opened per query
- Read-only — never modify any file
- Do not answer from prior knowledge or make assumptions beyond what the wiki contains
- If the question spans more than 3 pages clearly, note which pages were excluded and why
