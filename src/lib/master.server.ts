import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export const masterSchema = z.object({
  narration: z.string(),
  check: z
    .object({
      stat: z.enum(["str", "agi", "int", "cha"]),
      dc: z.number(),
      success: z.boolean(),
    })
    .nullable(),
  hpChanges: z.array(z.object({ target: z.string(), delta: z.number() })),
  actComplete: z.boolean(),
  suggestions: z.array(z.string()),
});

export type MasterReply = z.infer<typeof masterSchema>;

export async function callMaster(instructions: string, prompt: string): Promise<MasterReply> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("ШІ-Майстер не налаштований");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    prompt,
    output: Output.object({ schema: masterSchema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        store: false,
        strictJsonSchema: true,
      },
    },
  });
  return (await result.output) as MasterReply;
}
