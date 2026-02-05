import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { compressImageForUpload } from '@/lib/compressImage';

/**
 * Reads local image file to a Uint8Array for upload.
 * Tries: (1) new File API on native (2) fetch (3) legacy base64 read when fetch fails for file:// on RN.
 */
async function readFileToBytes(uri: string): Promise<{ bytes: Uint8Array; type: string }> {
  const compressed = await compressImageForUpload(uri);
  const readUri = compressed.uri;
  const isLocalFile = readUri.startsWith('file://') || (Platform.OS !== 'web' && !readUri.startsWith('http'));

  // 1) New File API on native for file:// URIs
  if (isLocalFile && Platform.OS !== 'web') {
    try {
      const file = new File(readUri);
      const bytes = await file.bytes();
      return { bytes, type: compressed.type };
    } catch {
      // Fall through
    }
  }

  // 2) fetch (works on web; often fails for file:// on React Native)
  try {
    const response = await fetch(readUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuffer), type: compressed.type };
  } catch {
    // 3) Legacy base64 read – reliable for file:// on React Native when fetch fails
    if (Platform.OS !== 'web' && isLocalFile) {
      const FileSystemLegacy = await import('expo-file-system/legacy');
      const base64 = await FileSystemLegacy.readAsStringAsync(readUri, { encoding: 'base64' });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { bytes, type: compressed.type };
    }
  }

  throw new Error('Could not read image file. Try choosing the image again.');
}

/**
 * Uploads a local image URI to Supabase storage (item-images bucket)
 * and returns the public URL. Handles compression and reliable file read on RN.
 * Optimized for Next.js Image component compatibility (WebP format preferred).
 */
export async function uploadItemImage(uri: string): Promise<string> {
  const { bytes, type } = await readFileToBytes(uri);
  // Determine file extension from content type, defaulting to webp (best compression, Next.js compatible)
  const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('item-images')
    .upload(fileName, bytes, { contentType: type });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(data.path);
  return urlData.publicUrl;
}
