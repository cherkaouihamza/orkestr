import { createClient } from "./server";

export const BUCKETS = {
  AVATARS: "avatars",
  SPACE_LOGOS: "space-logos",
  EVENT_BANNERS: "event-banners",
  SUBMISSIONS: "submissions",
} as const;

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string; error: Error | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return { url: "", error };

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return { url: publicUrl, error: null };
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data.signedUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}

export function getSubmissionPath(
  eventId: string,
  milestoneId: string,
  participantOrTeamId: string,
  fileName: string
): string {
  return `${eventId}/${milestoneId}/${participantOrTeamId}/${Date.now()}-${fileName}`;
}
