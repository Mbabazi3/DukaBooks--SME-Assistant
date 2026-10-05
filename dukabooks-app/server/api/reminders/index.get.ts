// Reminders: sent-email log (Test 018C), newest first.
export default defineEventHandler(async () => {
  const { workspaceId } = useGptConfig();
  const emails: any[] = await sdk(() => useGptClient().email.outboundEmails.listByWorkspace(workspaceId));
  return emails
    .map((e) => ({
      id: e.id,
      subject: e.subject,
      status: e.status,
      to: Array.isArray(e.to) ? e.to.join(", ") : e.to ?? e.to_address ?? "",
      sent_at: e.sent_at ?? null,
      error: e.error_message ?? null,
    }))
    .sort((a, b) => String(b.sent_at ?? "").localeCompare(String(a.sent_at ?? "")));
});
