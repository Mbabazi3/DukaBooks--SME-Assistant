// The "Ask AI" agent. Uses GPT_PLATFORM_AGENT_ID if set; otherwise finds the
// DukaBooks agent in the workspace by name, and creates it the first time.

export const AGENT_NAME = "DukaBooks Invoice Analyst";

const AGENT_SPEC = {
  description: "Answers a Ugandan shop owner's questions about their supplier invoices.",
  instructions: [
    "You help a small shop owner in Uganda understand their supplier invoices.",
    "Each question comes with the shop's extracted invoices as JSON. Answer ONLY from that data.",
    "Amounts are in Ugandan shillings: write them as 'UGX 1,200,000'.",
    "Always cite the invoice numbers you used. If the data doesn't answer the question, say so plainly.",
    "Keep answers short and practical.",
  ].join(" "),
  vertical: "finance",
  tags: ["dukabooks", "invoices", "sme"],
};

let cached: string | null = null;

export async function ensureAgentId(): Promise<string> {
  const configured = useGptConfig().agentId;
  if (configured) return configured;
  if (cached) return cached;

  const client = useGptClient();
  const agents: any[] = await sdk(() => client.agents.list());
  const existing = agents.find((a) => a.name === AGENT_NAME);
  if (existing) return (cached = existing.id);

  const created: any = await sdk(() => client.agents.create(AGENT_NAME, AGENT_SPEC));
  console.info(`[dukabooks] created agent "${AGENT_NAME}" (${created.id}) — set GPT_PLATFORM_AGENT_ID=${created.id} to pin it`);
  return (cached = created.id);
}
