import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// State machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  IDLE: ["PLANNING"],
  PLANNING: ["EXECUTING", "FAILED"],
  EXECUTING: ["DONE", "FAILED"],
  DONE: ["IDLE"],
  FAILED: ["IDLE"],
};

// Intent classification (deterministic)
function classifyIntent(input: string): { intentType: string; confidence: number } {
  const lower = input.toLowerCase();
  if (lower.includes("refactor")) return { intentType: "refactor_component", confidence: 0.92 };
  if (lower.includes("fix") || lower.includes("bug")) return { intentType: "bug_fix", confidence: 0.88 };
  if (lower.includes("add") || lower.includes("create") || lower.includes("new")) return { intentType: "add_feature", confidence: 0.85 };
  if (lower.includes("delete") || lower.includes("remove")) return { intentType: "remove_code", confidence: 0.90 };
  if (lower.includes("test")) return { intentType: "add_tests", confidence: 0.87 };
  if (lower.includes("style") || lower.includes("css")) return { intentType: "style_update", confidence: 0.83 };
  return { intentType: "general_edit", confidence: 0.70 };
}

// Compile task from intent
function compileTask(intentType: string, sessionId: string) {
  const hash = btoa(`${intentType}:${sessionId}:${Date.now()}`).slice(0, 16);
  return {
    task: {
      id: crypto.randomUUID(),
      session_id: sessionId,
      intent_type: intentType,
      compiled_prompt_hash: hash,
      steps: [
        { action: "analyze", target: "selected_files" },
        { action: "generate_patch", format: "unified_diff" },
        { action: "validate_output", checks: ["syntax", "format"] },
      ],
      metadata: { compiled_at: new Date().toISOString(), version: "0.1.0" },
    },
  };
}

// Simulate patch generation
function simulatePatches(intentType: string) {
  const patches: Record<string, string> = {
    refactor_component: `--- a/src/components/App.tsx\n+++ b/src/components/App.tsx\n@@ -5,7 +5,7 @@\n-  const [isLoading, setIsLoading] = React.useState(false);\n+  const [isLoading, setIsLoading] = React.useState<boolean>(false);`,
    bug_fix: `--- a/src/lib/utils.ts\n+++ b/src/lib/utils.ts\n@@ -3,6 +3,7 @@\n   return (...args: Parameters<T>) => {\n+    if (delay < 0) throw new Error('Delay must be positive');\n     clearTimeout(timeoutId);`,
    add_feature: `--- a/src/lib/api.ts\n+++ b/src/lib/api.ts\n@@ -15,6 +15,10 @@\n+export async function postJSON<T>(\n+  endpoint: string,\n+  body: unknown\n+): Promise<ApiResponse<T>> {`,
  };
  return { patches: [patches[intentType] || patches.refactor_component] };
}

// Validate diff format
function validateDiff(patch: string) {
  const errors: string[] = [];
  if (!patch.includes("---")) errors.push("Missing source file header");
  if (!patch.includes("+++")) errors.push("Missing target file header");
  if (!patch.includes("@@")) errors.push("Missing hunk header");
  return { valid: errors.length === 0, errors };
}

// Simulate commit
function simulateCommit(patches: string[]) {
  const hash = Array.from(crypto.getRandomValues(new Uint8Array(7)))
    .map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 7);
  return {
    commitHash: hash,
    message: `ai: apply ${patches.length} patch(es) via GitMind orchestration`,
    timestamp: new Date().toISOString(),
    files_changed: patches.length,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case "session.create": {
        const { repoId, mode } = body;
        // Check max 1 active session
        const { data: active } = await supabase
          .from("sessions")
          .select("id")
          .neq("state", "DONE")
          .neq("state", "FAILED")
          .neq("state", "IDLE");
        
        if (active && active.length > 0) {
          return new Response(JSON.stringify({ error: "Max 1 active session allowed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("sessions")
          .insert({ repo_id: repoId, mode, state: "IDLE" })
          .select()
          .single();
        
        if (error) throw error;
        result = { session: data };
        break;
      }

      case "session.get": {
        const { sessionId } = body;
        const { data, error } = await supabase.from("sessions").select().eq("id", sessionId).single();
        if (error) throw error;
        result = { session: data };
        break;
      }

      case "session.transition": {
        const { sessionId, newState } = body;
        const { data: current, error: fetchErr } = await supabase
          .from("sessions").select().eq("id", sessionId).single();
        if (fetchErr) throw fetchErr;

        const allowed = VALID_TRANSITIONS[current.state] || [];
        if (!allowed.includes(newState)) {
          return new Response(
            JSON.stringify({ error: `Invalid transition: ${current.state} → ${newState}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("sessions").update({ state: newState }).eq("id", sessionId).select().single();
        if (error) throw error;
        result = { session: data };
        break;
      }

      case "repo.attach": {
        const { owner, name } = body;
        // Check max 5 repos
        const { count } = await supabase.from("repositories").select("*", { count: "exact", head: true });
        if (count && count >= 5) {
          return new Response(JSON.stringify({ error: "Max 5 repositories allowed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get or create user
        let { data: users } = await supabase.from("users").select().limit(1);
        let userId;
        if (!users || users.length === 0) {
          const { data: newUser } = await supabase.from("users").insert({ name: "Developer" }).select().single();
          userId = newUser?.id;
        } else {
          userId = users[0].id;
        }

        const { data, error } = await supabase
          .from("repositories")
          .insert({ user_id: userId, owner, name, default_branch: "main" })
          .select()
          .single();
        if (error) throw error;
        result = { repository: data };
        break;
      }

      case "repo.selectFiles": {
        const { paths } = body;
        // Simulate file content
        const files = (paths || []).map((p: string) => ({
          path: p,
          content: `// Simulated content for ${p}\nexport default {};`,
        }));
        result = { files };
        break;
      }

      case "ai.normalize": {
        const { input } = body;
        result = classifyIntent(input || "");
        break;
      }

      case "ai.compile": {
        const { sessionId, intentType } = body;
        result = compileTask(intentType, sessionId);
        break;
      }

      case "ai.execute": {
        const { sessionId, taskId } = body;
        // Store task record
        await supabase.from("ai_tasks").insert({
          session_id: sessionId,
          intent_type: "execute",
          compiled_prompt_hash: taskId,
          status: "completed",
          result: { simulated: true },
        });
        result = simulatePatches("refactor_component");
        break;
      }

      case "diff.validate": {
        const { patch } = body;
        result = validateDiff(patch || "");
        break;
      }

      case "commit.simulate": {
        const { patches } = body;
        result = simulateCommit(patches || []);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
