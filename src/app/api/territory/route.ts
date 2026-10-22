import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SellerRole } from "@/domain/profile";
import { classifySeller, findPreset } from "@/data/profiles";
import { ResearchSchema, researchPrompt, researchToTerritory } from "@/data/profiles/research";

/**
 * POST /api/territory  { company, role }
 *
 * Optional enhancement for sellers without a curated preset: asks Claude for
 * the seller's ICP and eight target accounts, then validates the answer into
 * seeds the client grows deterministically. Without ANTHROPIC_API_KEY it
 * returns 501 and the client keeps its archetype territory.
 *
 * Excluded from the static preview build (see next.config.ts).
 */

export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const ROLES: SellerRole[] = ["AE", "SDR", "AM"];

/*
 * Best-effort cost guards for a public demo: answers are cached per seller and
 * role, and each client gets a handful of fresh research calls per window.
 * Both live in memory, so they reset with the server instance.
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, unknown>();
const WINDOW_MS = 10 * 60_000;
const CALLS_PER_WINDOW = 6;
const calls = new Map<string, number[]>();

function rateLimited(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const recent = (calls.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= CALLS_PER_WINDOW) return true;
  recent.push(now);
  calls.set(ip, recent);
  if (calls.size > 1000) calls.clear();
  return false;
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return error(501, "ICP research is not configured on this deployment. Using the built-in archetype territory.");
  }

  let body: { company?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return error(400, "Expected a JSON body.");
  }
  const company = typeof body.company === "string" ? body.company.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  if (company.length < 2) return error(400, "Enter a company name.");
  if (findPreset(company)) return error(409, "This company has a curated territory.");
  const role: SellerRole = ROLES.includes(body.role as SellerRole) ? (body.role as SellerRole) : "AE";
  const archetype = classifySeller(company);
  const cacheKey = `${company.toLowerCase()}|${role}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);
  if (rateLimited(request)) return error(429, "Research limit reached for now. Using the archetype territory.");
  const prompt = researchPrompt(company, role, archetype);

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { format: zodOutputFormat(ResearchSchema), effort: "medium" },
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });

    if (response.stop_reason === "refusal") {
      return error(422, "The research request was declined. Using the archetype territory.");
    }
    if (response.stop_reason === "max_tokens") {
      return error(502, "The research answer was cut short. Using the archetype territory.");
    }
    const parsed = response.parsed_output;
    if (!parsed) return error(502, "The research answer could not be read. Using the archetype territory.");

    const result = researchToTerritory(company, role, archetype, parsed);
    if (!result) return error(502, "The research answer did not contain enough usable accounts.");
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, result);
    return Response.json(result);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return error(429, "Research is busy right now. Using the archetype territory.");
    if (err instanceof Anthropic.APIError) return error(502, `Research failed (${err.status ?? "network"}).`);
    return error(500, "Research failed unexpectedly.");
  }
}
