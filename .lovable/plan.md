

# GitMind AI -- Complete Implementation Plan

## Current State Summary

The project currently has:
- A dark-themed frontend with Auth, Dashboard, and Workspace pages (all using mock data and localStorage)
- A single edge function (`gitmind-api`) with simulated endpoints
- Database tables: `users`, `repositories`, `sessions`, `ai_tasks` (all with permissive RLS)
- No real authentication, no GitHub integration, no real AI

## Platform Constraints

This project runs on Lovable Cloud, which means:
- **Backend = Supabase Edge Functions only** (Deno). No Node.js server.
- **GitHub OAuth is NOT natively supported** by Lovable Cloud (only Google/Apple are). GitHub OAuth must be implemented manually via edge functions.
- **AI calls** will use the Lovable AI Gateway (pre-configured, no API key needed from you).
- **GitHub API token** will be stored as an encrypted Supabase secret and used only in edge functions.

---

## Phase 1 -- Database Schema Evolution

Add new columns and tables to support real GitHub integration, autonomous mode, and the expanded state machine.

### Schema Changes

1. **Alter `session_mode` enum**: add `'autonomous'` value
2. **Alter `session_state` enum**: add `'SPEC_LOCKED'` and `'VALIDATING'` states
3. **Add columns to `repositories`**: `github_repo_id` (text, nullable)
4. **Add columns to `ai_tasks`**: `retry_count` (integer, default 0)
5. **Create `autonomous_specs` table**:
   - `id` (uuid PK)
   - `session_id` (uuid FK to sessions)
   - `spec_json` (jsonb)
   - `locked_at` (timestamptz, nullable)
   - `created_at` (timestamptz)
6. **Create `activity_logs` table** for logging:
   - `id`, `session_id`, `action`, `duration_ms`, `retry_count`, `error_type`, `created_at`

RLS remains permissive (single personal-use user) but is present on all tables.

---

## Phase 2 -- GitHub OAuth via Edge Function

Since Lovable Cloud doesn't support GitHub OAuth natively, we implement it with two edge functions:

### New Edge Functions

1. **`github-auth`** -- Handles the full OAuth flow:
   - `action: "get_auth_url"` -- Returns GitHub OAuth authorize URL with `repo` + `read:user` scopes
   - `action: "callback"` -- Exchanges the authorization code for an access token, fetches GitHub user profile, creates/updates the `users` record, and stores the token as a Supabase secret (never sent to the frontend)
   - Returns a signed JWT or session identifier for frontend auth

2. **Secrets required**: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (you will be prompted to provide these)

### Frontend Changes

- Replace the simulated login button on AuthPage with a "Sign in with GitHub" button
- Add a `/auth/callback` route that receives the GitHub code and calls the edge function
- Replace localStorage-based auth with a proper session check

---

## Phase 3 -- GitHub API Service (Edge Function)

Extend the `gitmind-api` edge function (or create a new `github-service` function) with real GitHub API calls:

### Endpoints

| Action | What it does |
|---|---|
| `github.fetchTree` | `GET /repos/:owner/:repo/git/trees/:branch?recursive=1` -- returns file tree, filters binaries, respects `base_path` |
| `github.fetchFile` | `GET /repos/:owner/:repo/contents/:path` -- decodes base64, returns text |
| `github.commitFile` | Fetches current SHA, applies patch, `PUT` update, commit with `[GitMind]` prefix |
| `github.listRepos` | `GET /user/repos` -- lists user's GitHub repos for attachment |

### Error Handling
- 403 (forbidden), 409 (conflict), 422 (validation), rate limit detection
- All errors logged to `activity_logs` table

### Frontend Changes
- **FileExplorer**: Fetch real file tree from GitHub via edge function instead of mock data
- **CodeViewer**: Load real file content from GitHub
- **Dashboard**: "Attach Repository" button opens a modal to search and select from real GitHub repos (max 5)

---

## Phase 4 -- Real AI Orchestration with Lovable AI

Replace all simulated AI responses with real Lovable AI Gateway calls.

### Architecture (all in edge functions)

1. **Intent Normalization** (deterministic, no AI) -- Keep the existing keyword-based classifier but expand categories:
   - `feature_addition`, `refactor`, `bugfix`, `ui_update`, `config_change`, `add_tests`
   - Add risk level assignment (low/medium/high)

2. **Task Compilation** -- Build a structured prompt including:
   - Classified intent + constraints
   - Allowed file list (max 8 files)
   - Code style rules
   - Strict output format instructions

3. **AI Execute** (new `ai-execute` edge function):
   - Uses Lovable AI Gateway (`google/gemini-3-flash-preview`)
   - System prompt enforces: modify only provided files, return unified diff, provide commit message, no explanation text
   - Validates response schema
   - Retry logic: max 2 retries on malformed output
   - Handles 429/402 errors gracefully

4. **AI Chat** (new `ai-chat` edge function):
   - Streaming chat via Lovable AI for the Chat tab
   - Context-aware: includes selected file contents in the conversation

### Frontend Changes
- **AiPanel Chat tab**: Real streaming responses from Lovable AI
- **AiPanel Action tab**: Real orchestration pipeline (normalize -> compile -> execute -> validate -> commit)
- Show real patches in the UI with diff highlighting
- Show real commit results

---

## Phase 5 -- Diff Validation Engine

Enhance the existing `diff.validate` action:

### Validation Rules
- Patch format validity (unified diff with `---`, `+++`, `@@` headers)
- Only allowed files modified (cross-check with task's file list)
- **Blocked files**: `package.json`, `.env`, any config file outside `base_path`
- **Dangerous pattern detection**: eval(), process.exit(), rm -rf, etc.
- Return structured validation result with pass/fail and specific error messages

---

## Phase 6 -- Real Commit Engine

Replace `commit.simulate` with real GitHub commits:

### Flow
1. Fetch current file SHA from GitHub
2. Parse unified diff, apply patch to current content
3. `PUT /repos/:owner/:repo/contents/:path` with new content + SHA
4. Commit message format: `[GitMind] <ai-generated message>`
5. Log commit to `activity_logs`

### Safety
- Confirm with user before committing (UI confirmation dialog)
- Only commit to the repository's `default_branch` (or a configurable branch)

---

## Phase 7 -- Autonomous Builder Mode

### New UI Tab
Add a third tab "Autonomous" to the AiPanel.

### Flow
1. **Spec Generation**: User describes what they want in natural language. AI generates a structured SPEC JSON:
   ```
   { purpose, features, routes, data_models, ui_pages, constraints }
   ```
2. **Spec Review**: User reviews and confirms the spec
3. **Spec Lock**: State transitions to `SPEC_LOCKED`, spec saved to `autonomous_specs` table
4. **Step Build**: Deterministic steps executed sequentially:
   - Setup -> Auth -> DB -> Backend -> Frontend -> Wiring -> Validation
   - Each step: AI execute -> Validate diff -> Commit
5. **Validation Loop**: Max 5 iterations per step. Pass -> next step. Fail after 5 -> `FAILED`

### State Machine Updates
- `IDLE -> PLANNING -> SPEC_LOCKED -> EXECUTING -> VALIDATING -> DONE`
- `VALIDATING` can loop back to `EXECUTING` (retry)
- Any state can transition to `FAILED`

---

## Phase 8 -- Security and Production Hardening

### Edge Function Security
- All endpoints validate the user's auth token
- Repository ownership validation (user can only access their own repos)
- Session ownership validation

### Rate Limiting (in edge functions)
- AI calls: max 20 per session
- Commits: max 5 per minute
- Track in `activity_logs`

### Logging
- Log: `session_id`, `action`, `duration_ms`, `retry_count`, `error_type`
- Never log: tokens, full code content, raw AI output

### Base Path Enforcement
- No file operations allowed outside the repository's `base_path`

---

## Implementation Order

The work will be done in this sequence across multiple prompts:

1. **Phase 1** -- Database migration (schema changes)
2. **Phase 2** -- GitHub OAuth (requires you to provide `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`)
3. **Phase 3** -- GitHub API integration (file tree, file content, repo listing)
4. **Phase 4** -- AI orchestration with Lovable AI (chat streaming + action pipeline)
5. **Phase 5** -- Diff validation engine
6. **Phase 6** -- Real commit engine
7. **Phase 7** -- Autonomous builder mode
8. **Phase 8** -- Security hardening, rate limiting, logging

---

## Technical Details

### Edge Functions Structure

```text
supabase/functions/
  gitmind-api/index.ts      -- Main API (sessions, repos, state machine, orchestration)
  github-auth/index.ts       -- GitHub OAuth flow
  ai-chat/index.ts           -- Streaming AI chat via Lovable AI Gateway
  ai-execute/index.ts        -- AI code generation + structured output
```

### State Machine (Updated)

```text
IDLE -> PLANNING -> SPEC_LOCKED -> EXECUTING -> VALIDATING -> DONE
                                                    |            |
                                                    +-- retry ---+
Any state -> FAILED
DONE -> IDLE
FAILED -> IDLE
```

### Secrets Needed
- `GITHUB_CLIENT_ID` -- From your GitHub OAuth App
- `GITHUB_CLIENT_SECRET` -- From your GitHub OAuth App
- `LOVABLE_API_KEY` -- Already configured (for AI Gateway)

### Key Files Modified
- `src/pages/AuthPage.tsx` -- Real GitHub OAuth login
- `src/pages/Dashboard.tsx` -- Real repo listing and attachment
- `src/components/workspace/FileExplorer.tsx` -- Real GitHub file tree
- `src/components/workspace/CodeViewer.tsx` -- Real GitHub file content
- `src/components/workspace/AiPanel.tsx` -- Real AI chat, action pipeline, autonomous mode
- `src/pages/Workspace.tsx` -- Real session management
- `src/lib/api.ts` -- Updated API client for all new endpoints
- `src/lib/types.ts` -- Updated types for new states and models

