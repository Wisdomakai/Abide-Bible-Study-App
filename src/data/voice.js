import { supabase } from './supabase';
import { uid } from './storage';

const EXTENSIONS = { 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/webm': 'webm' };

export async function uploadVoice(blob) {
  if (!supabase || !(blob instanceof Blob)) throw new Error('A browser recording is required');
  if (!blob.size) throw new Error('The recording is empty. Please record it again.');
  if (blob.size > MAX_VOICE_BYTES) throw new Error('This recording is over 20 MB. Please send a shorter recording.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in before uploading a recording');
  const ext = EXTENSIONS[blob.type] || 'webm';
  const path = `${user.id}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from('voice').upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
  if (error) throw error;
  return path;
}

export async function signedVoiceUrl(path) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path; // legacy public recording
  const { data, error } = await supabase.storage.from('voice').createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteVoice(path) {
  if (!path || /^https?:/.test(path)) return;
  const { error } = await supabase.storage.from('voice').remove([path]);
  if (error) throw error;
}

// A local note and one or more group posts can reference the same recording.
// Only remove the object when no live group post still needs it.
export async function deleteVoiceIfUnreferenced(path) {
  if (!path || /^https?:/.test(path)) return true;
  const { count, error } = await supabase.from('posts')
    .select('id', { count: 'exact', head: true }).eq('audio_url', path);
  if (error) throw error;
  if (count) return false;
  await deleteVoice(path);
  return true;
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export const MAX_VOICE_SECONDS = 900;
export const MAX_VOICE_BYTES = 20 * 1024 * 1024;
