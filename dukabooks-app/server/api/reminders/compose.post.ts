// Reminders: the platform AI drafts the email (Test 018A). Creates a server-side draft.
// `customer` is { name, email, id? } — id only when it came from CRM.
const htmlToText = (html = "") =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

const WHAT: Record<string, string> = {
  order_ready: "a friendly note that their order is ready for pickup",
  payment_due: "a polite payment reminder",
  custom: "a short general update",
};

export default defineEventHandler(async (event) => {
  const { customer, intent = "custom", amount } = (await readBody(event)) ?? {};
  if (!customer?.email) throw createError({ statusCode: 400, statusMessage: "customer.email is required" });

  const name = customer.name?.trim() || "there";
  const prompt =
    `Write ${WHAT[intent] ?? WHAT.custom} to ${name}, a customer of a small hardware shop in Uganda. ` +
    (amount ? `The amount is UGX ${Number(amount).toLocaleString("en-US")}. ` : "") +
    "Keep it under 120 words, warm and clear. Sign as DukaBooks Hardware.";

  const senderProfileId = await findSenderProfileId();
  let draft: any;
  try {
    draft = await sdk(() =>
      useGptClient().email.outboundEmails.composeWithAi({
        to: [customer.email],
        prompt,
        context: { intent, amount: amount ?? null, customer_name: name },
        ...(customer.id ? { contact_ref_id: customer.id } : {}),
        ...(senderProfileId ? { sender_profile_id: senderProfileId } : {}),
      })
    );
  } catch (err: any) {
    if (!senderProfileId && err?.statusCode === 400) {
      throw createError({
        statusCode: 400,
        statusMessage: "No email sender profile",
        message:
          `The platform couldn't draft the email (${err?.data?.detail || err?.message}). ` +
          "This workspace has no email sender profile — the 'from' identity emails are sent as. " +
          "Ask the platform team to create one, or set GPT_PLATFORM_SENDER_PROFILE_ID.",
        data: err?.data,
      });
    }
    throw err;
  }
  return {
    id: draft.id,
    status: draft.status,
    to: customer.email,
    customer: name,
    subject: draft.subject ?? "(no subject)",
    body: draft.body_text || htmlToText(draft.body_html) || "",
  };
});
