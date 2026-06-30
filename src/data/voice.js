import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { uid } from './storage';
import { isBackendConfigured } from './config';

function b64ToUint8(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const TYPES = { m4a: 'audio/m4a', mp4: 'audio/mp4', caf: 'audio/x-caf', '3gp': 'audio/3gpp', aac: 'audio/aac', webm: 'audio/webm', mp3: 'audio/mpeg' };

async function uploadBytes(bytes, ext, contentType) {
  if (!isBackendConfigured() || !supabase) throw new Error('Backend not configured');
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user?.id || 'anon'}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from('voice').upload(path, bytes, {
    contentType: contentType || TYPES[ext] || 'audio/mpeg', upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('voice').getPublicUrl(path).data.publicUrl;
}

// Uploads a recorded file to the public 'voice' bucket and returns its URL.
export async function uploadVoice(localUri) {
  if (localUri?.startsWith?.('blob:')) {
    const blob = await fetch(localUri).then((r) => r.blob());
    return uploadVoiceBlob(blob);
  }
  const ext = (localUri.split('.').pop() || 'm4a').split('?')[0].toLowerCase();
  const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const bytes = b64ToUint8(b64);
  return uploadBytes(bytes, ext, TYPES[ext]);
}

export async function uploadVoiceBlob(blob) {
  const type = blob?.type || 'audio/webm';
  const ext = type.includes('mp4') ? 'mp4'
    : type.includes('mpeg') ? 'mp3'
      : type.includes('aac') ? 'aac'
        : 'webm';
  return uploadBytes(blob, ext, type);
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export const MAX_VOICE_SECONDS = 900; // 15 minutes
