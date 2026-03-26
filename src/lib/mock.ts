import {
  GenerateDraftsResponse,
  AdaptContentResponse,
  IdeationPayload,
  DraftArticle,
} from "./types";
import { logger } from "./logger";

// ─── Generic mock fetch with simulated latency ─────────────────
function mockFetch<T>(data: T, delayMs = 1800): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}

// ─── Utility: Strip Markdown (for LinkedIn) ───────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/gm, "") // Headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
    .replace(/\*(.*?)\*/g, "$1") // Italic
    .replace(/__(.*?)__/g, "$1") // Bold underscores
    .replace(/_(.*?)_/g, "$1") // Italic underscores
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links
    .replace(/^>\s+/gm, "") // Blockquotes
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1"); // Code
}

// ─── Status label → human-readable message mapping ─────────────
const STATUS_MESSAGES: Record<string, string> = {
  form_data_received: "Receiving your submission…",
  data_cleaned: "Cleaning and preparing source data…",
  llm_create_articles: "AI Writers drafting 3 article variants…",
  llm_create_images: "Generating header images for each draft…",
  waiting_for_selection: "Drafts ready!",
  waiting_post_selection: "Social Copies ready!",
  writing_social_copies: "AI is adapting your draft for social media...",
  formatting_newsletter: "Formatting the final newsletter...",
  error: "Error: Workflow failed in n8n.",
};

export function getStatusMessage(status: string): string {
  return STATUS_MESSAGES[status] || `Processing: ${status}…`;
}

// ─── Polling helper ─────────────────────────────────────────────
function pollAirtable(
  requestId: string,
  onStatusChange: (status: string) => void,
  targetStatus: string = "waiting_for_selection",
  intervalMs = 5000,
  maxDurationMs = 3600000 // 1-hour safety timeout (indefinite enough)
): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = async () => {
      // Safety timeout
      if (Date.now() - startTime > maxDurationMs) {
        reject(new Error("Polling timed out after 5 minutes. The n8n workflow may have failed."));
        return;
      }

      try {
        const res = await fetch(`/api/airtable?request_id=${encodeURIComponent(requestId)}`);
        const data = await res.json();

        logger.info(`📡 Airtable poll (${requestId}): status = ${data.status}`);

        // If Airtable credentials aren't configured, fall back to mock
        if (data.status === "mock_mode") {
          reject(new Error("MOCK_MODE"));
          return;
        }

        // Row not yet created by n8n
        if (data.status === "not_found") {
          onStatusChange("form_data_received");
          setTimeout(poll, intervalMs);
          return;
        }

        // Update the UI with the current status label
        onStatusChange(data.status);

        // Handle explicit error status from n8n
        if (data.status === "error") {
          reject(new Error("ERROR_FROM_WORKFLOW"));
          return;
        }

        // Drafts are ready!
        if (targetStatus === "waiting_for_selection" && data.status === "waiting_for_selection" && data.drafts) {
          const draftsArray = Array.isArray(data.drafts) ? data.drafts : [data.drafts];

          const mappedDrafts: DraftArticle[] = draftsArray.map((d: any) => ({
            id: d.id || "draft_" + Math.random().toString(36).slice(2),
            title: d.title || "Untitled Draft",
            style: d.angle || d.style || "Default",
            body: d.content || d.body || "",
            image_prompt: d.image_generation_prompt || d.image_prompt,
            word_count: d.stats?.word_count || d.word_count,
            image_url: d.image_url,
          }));

          resolve({
            request_id: requestId,
            drafts: mappedDrafts,
          });
          return;
        }

        // Social copies are ready!
        if (targetStatus === "waiting_post_selection" && data.status === "waiting_post_selection" && data.adaptations) {
          const adp = Array.isArray(data.adaptations) ? data.adaptations[0] : data.adaptations;
          const pkg = adp?.package || {};

          // Extract and format the specific structure requested
          const xContent = Array.isArray(pkg.x_thread) ? pkg.x_thread.join("\n\n") : pkg.x_thread || "";
          const linkedinContent = pkg.linkedin || "";
          const newsletterData = pkg.newsletter || {};
          const newsletterContent = `Subject: ${newsletterData.subject || "Newsletter"}\n\n${newsletterData.body || ""}`;

          resolve({
            copies: [
              { platform: "X", content: xContent },
              { platform: "LinkedIn", content: stripMarkdown(linkedinContent) },
              { platform: "Newsletter", content: newsletterContent },
            ],
            image_url: adp?.image_url,
          });
          return;
        }

        // Still processing — poll again
        setTimeout(poll, intervalMs);
      } catch (err: any) {
        logger.error("Polling error:", err.message);
        // Network hiccup — retry
        setTimeout(poll, intervalMs);
      }
    };

    // Start the first poll
    poll();
  });
}

// ─── Restore Session: Smart routing based on Airtable status ────
export async function restoreSession(
  requestId: string,
  onStatusChange: (status: string) => void = () => {}
): Promise<{
  targetStep: 2 | 3;
  requestId: string;
  drafts?: DraftArticle[];
  socialCopies?: { platform: string; content: string }[];
}> {
  logger.info(`🔄 Restoring session for request: ${requestId}`);
  onStatusChange("form_data_received");

  // Do a single Airtable fetch to check the current status
  try {
    const res = await fetch(`/api/airtable?request_id=${encodeURIComponent(requestId)}`);
    const data = await res.json();

    logger.info(`📡 Restore check (${requestId}): status = ${data.status}`);

    // Handle explicit error status from n8n
    if (data.status === "error") {
      throw new Error("ERROR_FROM_WORKFLOW");
    }

    // Already past draft selection → jump to Step 3
    if (data.status === "waiting_post_selection" && data.adaptations) {
      const adp = Array.isArray(data.adaptations) ? data.adaptations[0] : data.adaptations;
      const pkg = adp?.package || {};

      const xContent = Array.isArray(pkg.x_thread) ? pkg.x_thread.join("\n\n") : pkg.x_thread || "";
      const linkedinContent = pkg.linkedin || "";
      const newsletterData = pkg.newsletter || {};
      const newsletterContent = `Subject: ${newsletterData.subject || "Newsletter"}\n\n${newsletterData.body || ""}`;

      return {
        targetStep: 3,
        requestId,
        socialCopies: [
          { platform: "X", content: xContent },
          { platform: "LinkedIn", content: stripMarkdown(linkedinContent) },
          { platform: "Newsletter", content: newsletterContent },
        ],
      };
    }

    // Still at draft selection (or earlier) → poll for drafts → Step 2
    const result = await pollAirtable(requestId, onStatusChange);
    return {
      targetStep: 2,
      requestId,
      drafts: result.drafts,
    };
  } catch (error: any) {
    if (error.message === "ERROR_FROM_WORKFLOW") {
      throw error;
    }
    logger.warn(`⚠️ Restore failed: ${error.message}. Falling back to draft polling.`);
    const result = await pollAirtable(requestId, onStatusChange);
    return {
      targetStep: 2,
      requestId,
      drafts: result.drafts,
    };
  }
}

// ─── Step 1 → Step 2: Generate Drafts (n8n + Airtable Polling) ──
export async function mockGenerateDrafts(
  payload: IdeationPayload,
  onStatusChange: (status: string) => void = () => {}
): Promise<GenerateDraftsResponse> {
  const isUrl =
    payload.content.startsWith("http://") ||
    payload.content.startsWith("https://");

  const requestId = "req_" + Math.random().toString(36).slice(2, 10);

  const n8nPayload = [
    {
      request_id: requestId,
      metadata: {
        version: "1.0",
        source: "content_dashboard_ui",
        user_id: "usr_cm_001",
        timestamp: new Date().toISOString(),
      },
      source_url: isUrl,
      data: {
        content: payload.content,
      },
    },
  ];

  // Phase 1: Fire & Forget — send the webhook, don't await the response
  onStatusChange("form_data_received");
  logger.info(`🚀 Triggering n8n webhook for request: ${requestId}`);
  fetch(
    "https://cohort2pod1.app.n8n.cloud/webhook-test/e1bbd678-2b08-412c-b3fc-64cafa186ba7",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    }
  ).catch((err) => console.warn("Webhook fire-and-forget:", err.message));

  // Phase 2: Poll Airtable for the result
  try {
    const result = await pollAirtable(requestId, onStatusChange);
    return result;
  } catch (error: any) {
    if (error.message === "ERROR_FROM_WORKFLOW") {
      throw error;
    }
    // If Airtable is in mock mode or polling failed, use fallback data
    logger.warn(`⚠️ Polling failed or in mock mode: ${error.message}. Using fallback.`);

    // Simulate the status progression for demo purposes
    const statuses = ["form_data_received", "data_cleaned", "llm_create_articles", "llm_create_images"];
    let i = 0;
    let statusInterval: NodeJS.Timeout; // Declare statusInterval here

    // Only start interval if not already in "waiting_for_selection"
    if (onStatusChange) {
      statusInterval = setInterval(() => {
        if (i < statuses.length) {
          onStatusChange(statuses[i]);
          i++;
        } else {
          clearInterval(statusInterval);
        }
      }, 3000);
    }


    // Wait 15 seconds total, then return mock data
    await new Promise((r) => setTimeout(r, 15000));
    if (statusInterval!) { // Clear interval if it was set
      clearInterval(statusInterval);
    }
    onStatusChange("waiting_for_selection");

    const fallbackDrafts: DraftArticle[] = [
      {
        id: "draft_1_fallback",
        title: "Why AGI Will Not Happen",
        style: "How-To Guide",
        body: "This step\u2011by\u2011step how\u2011to guide explains why AGI will not happen as a sudden, limitless emergence and how to evaluate claims about it.\n\n## Step 1 \u2014 Grasp the core: \"Computation is physical\"\n### Memory movement, energy, and the memory wall\nComputation is not abstract code alone \u2014 it is atoms, wires, heat, and energy. Moving bits across distance costs latency and energy, often far more than raw arithmetic.\n\n## Step 2 \u2014 Understand the math: linear gains need exponential resources\n### Scaling laws and diminishing returns\nMany observed AI gains follow scaling laws: more compute and data yield better performance. But linear improvements in capability often require exponentially more resources.",
        word_count: 965,
      },
      {
        id: "draft_2_fallback",
        title: "Why AGI Will Not Happen",
        style: "Contrarian",
        body: "This is a contrarian, opinionated critique: why the popular AGI narrative is wrong.\n\n## Start here: treat computation as physical, not mystical\n### The memory wall is not a metaphor\nAsk any systems engineer: moving bits costs energy, time, and area. Processor raw FLOPS are cheap compared with getting useful data to those FLOPS at low latency.\n\n## Linear capability gains demand exponential resources\n### The scaling trap\nIf you want one more unit of capability, expect to pay a lot more than the last unit.",
        word_count: 1354,
      },
      {
        id: "draft_3_fallback",
        title: "Why AGI Will Not Happen",
        style: "Case Study",
        body: "This data\u2011driven case study argues, step\u2011by\u2011step, why AGI will not happen as a sudden, runaway event.\n\n## Computation is physical: the memory wall\n### The bottom line \u2014 data movement dominates cost\nComputation is not abstract. Bits live on silicon and in packages, and moving them costs energy, time, and area.\n\n## Scaling laws and the exponential cost trap\n### Observed facts: scaling helps, but costs compound\nEmpirical scaling laws show quality improves with more data, parameters, and compute.",
        word_count: 1414,
      },
    ];

    return {
      request_id: requestId,
      drafts: fallbackDrafts,
    };
  }
}

// ─── Step 2 → Step 3: Adapt Content ────────────────────────────
export async function mockAdaptContent(
  requestId: string,
  draft: DraftArticle,
  onStatusChange: (status: string) => void = () => {}
): Promise<AdaptContentResponse> {
  const n8nPayload = {
    request_id: requestId,
    selected_draft: draft,
  };

  // Phase 1: Fire & Forget Webhook
  onStatusChange("writing_social_copies");
  logger.info(`🚀 Triggering adaptation webhook for request: ${requestId}`);
  fetch(
    "https://cohort2pod1.app.n8n.cloud/webhook-test/a8018dfd-567f-4132-97f5-fc8391cb24b6",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    }
  ).catch((err) => logger.warn(`Webhook fire-and-forget (Adaptation): ${err.message}`));

  // Phase 2: Poll Airtable for the result
  try {
    const result = await pollAirtable(requestId, onStatusChange, "waiting_post_selection");
    return result;
  } catch (error: any) {
    if (error.message === "ERROR_FROM_WORKFLOW") {
      throw error;
    }
    logger.warn(`⚠️ Adaptation Polling failed or in mock mode: ${error.message}. Using fallback.`);

    // Simulate status progression
    const statuses = ["writing_social_copies", "formatting_newsletter"];
    let i = 0;
    const statusInterval = setInterval(() => {
      if (i < statuses.length) {
        onStatusChange(statuses[i]);
        i++;
      } else {
        clearInterval(statusInterval);
      }
    }, 4000);

    // Wait 10 seconds total, then return mock data
    await new Promise((r) => setTimeout(r, 10000));
    clearInterval(statusInterval);
    onStatusChange("waiting_post_selection");

    return {
      copies: [
        {
          platform: "X",
          content: `🧵 Most content teams are drowning in distribution, not ideation.\n\nHere's the framework we used to cut content production costs by 40% while tripling output:\n\n1/ Define your content pillars — they're the guardrails your AI operates within\n2/ Build a single approval interface — quality lives here\n3/ Auto-adapt for every channel — one draft, three formats\n4/ Measure resonance, not volume\n\nThe teams winning at content aren't producing more. They have tighter feedback loops.`,
        },
        {
          platform: "LinkedIn",
          content: stripMarkdown(`I've been rethinking how we approach content production at scale...\n\nThe result? Our pilot team went from 4 to 12 pieces/week while cutting production costs by 40%.`),
        },
        {
          platform: "Newsletter",
          content: `Subject: The content production lie nobody talks about\n\nHey there,\n\nThe 3-Stage Pipeline:\n1. Human ideation\n2. AI-assisted drafting\n3. Automated adaptation\n\nUntil next time,\nThe Content Team`,
        },
      ],
    };
  }
}

// ─── Step 3: Publish (Per-Platform) with Airtable Polling ──────
export async function publishToPlatform(
  requestId: string,
  platform: string,
  action: "publish" | "schedule",
  content: string,
  onStatusChange: (message: string) => void = () => {}
): Promise<{ status: number; message: string }> {
  logger.info(`🚀 Triggering ${action} webhook for ${platform} (req: ${requestId})`);

  const payload = {
    request_id: requestId,
    platform,
    action,
    content,
  };

  // Phase 0: Clear stale statuses in Airtable before polling
  onStatusChange("Loading...");
  try {
    await fetch("/api/airtable", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        fields: {
          "Newsletter Post Status": "Loading",
          "X Post Status": "Loading",
          "Linkedin Post Status": "Loading",
        },
      }),
    });
    logger.info(`🧹 Cleared stale post statuses for ${requestId}`);
  } catch (err: any) {
    logger.warn(`Failed to clear stale statuses: ${err.message}`);
  }

  // Phase 1: Fire & Forget — kick off the n8n workflow
  fetch(
    "https://cohort2pod1.app.n8n.cloud/webhook-test/5ef3c9b5-f992-4d5c-8acf-8b31ed494f59",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  ).catch((err) => logger.warn(`Webhook fire-and-forget (${platform} ${action}): ${err.message}`));

  // Phase 2: Poll Airtable for this platform's specific post status column
  const POLL_INTERVAL = 5000;
  const MAX_DURATION = 3600000; // 1 hour safety
  const startTime = Date.now();

  return new Promise((resolve) => {
    const poll = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        onStatusChange("Timed out");
        resolve({ status: 408, message: "Polling timed out" });
        return;
      }

      try {
        const res = await fetch(`/api/airtable?request_id=${encodeURIComponent(requestId)}`);
        const data = await res.json();

        // Read the platform-specific post status
        const postStatus = data.postStatus?.[platform] || "";

        logger.info(`📡 Publish poll (${requestId} / ${platform}): postStatus = "${postStatus}"`);

        if (postStatus === "Published") {
          onStatusChange("Published");
          resolve({ status: 200, message: "Published successfully" });
          return;
        }

        // Handle error status
        if (postStatus.toLowerCase() === "error") {
          onStatusChange("ERROR");
          resolve({ status: 500, message: "Publishing failed" });
          return;
        }

        // Show the dynamic Airtable cell value, or "Loading..." if empty
        onStatusChange(postStatus || "Loading...");
        setTimeout(poll, POLL_INTERVAL);
      } catch (err: any) {
        logger.error(`Publish polling error (${platform}):`, err.message);
        setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();
  });
}
