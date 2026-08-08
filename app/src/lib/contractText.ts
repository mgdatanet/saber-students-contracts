import { createClient } from "@/lib/supabase/server";

export type ContractTextBlocks = Record<string, string>;

export const CONTRACT_TEXT_BLOCK_KEYS = [
  "cancellation_refund_policy",
  "methods_of_payment_note",
  "methods_of_payment_footnote",
  "termination_policy",
  "graduation_requirements",
  "employment_assistance",
  "notice_and_agreement",
] as const;

/** Fetches all admin-editable contract text blocks, keyed by their block key. */
export async function fetchContractTextBlocks(): Promise<ContractTextBlocks> {
  const supabase = await createClient();
  const { data } = await supabase.from("contract_text_blocks").select("key, content");

  const blocks: ContractTextBlocks = {};
  for (const row of data ?? []) {
    blocks[row.key] = row.content;
  }
  return blocks;
}

/** Replaces {{TOKEN}} placeholders in a text block with real values. */
export function applyTokens(content: string, tokens: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? "");
}
