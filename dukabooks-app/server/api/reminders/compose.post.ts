// Reminders: the platform AI drafts the email (Test 018A). Creates a server-side draft.
export default defineEventHandler(async (event) => {
  const { customer, intent, amount } = await readBody(event);
  const what = intent === "payment_due" ? "payment reminder" : "order update";
  const draft: any = await sdk(() =>
    useGptClient().email.outboundEmails.composeWithAi({
      to: [customer?.email ?? ""],
      prompt: `Write a short, friendly ${what} for a small-business customer. Sign as DukaBooks Hardware.`,
      context: { intent, amount },
      contact_ref_id: customer?.id,
    } as any)
  );
  return { ...draft, customer: customer ? `${customer.first_name} ${customer.last_name}` : null };
});
