// Which "from" identity the platform sends reminders as. Uses
// GPT_PLATFORM_SENDER_PROFILE_ID if set; otherwise the workspace's default
// sender profile, then a DNS-validated one, then the first one.
let cached: string | null | undefined;

export async function findSenderProfileId(): Promise<string | null> {
  const configured = process.env.GPT_PLATFORM_SENDER_PROFILE_ID;
  if (configured) return configured;
  if (cached !== undefined) return cached;

  const { workspaceId } = useGptConfig();
  const profiles: any[] = await useGptClient().email.senderProfiles.listByWorkspace(workspaceId).catch((err: any) => {
    console.warn(`[dukabooks] could not list email sender profiles: ${err?.message ?? err}`);
    return [];
  });
  const pick = profiles.find((p) => p.is_default) ?? profiles.find((p) => p.dns_validated) ?? profiles[0];
  cached = pick?.id ?? null;
  console.info(`[dukabooks] email sender profiles: ${profiles.length}${pick ? ` — using ${pick.email} (${pick.id})` : " — none set up"}`);
  return cached;
}
