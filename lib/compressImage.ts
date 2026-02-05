import * as ImageManipulator from 'expo-image-manipulator';
import { getImageInfoAsync } from 'expo-image';

/**
 * Compress an image file before upload to reduce storage and egress.
 * Optimized for Next.js Image component compatibility and maximum compression.
 * 
 * Settings:
 * - Resizes to max 1200px (maintaining aspect ratio) - matches Next.js deviceSizes config
 * - Converts to WebP format for best compression (~30% smaller than JPEG)
 * - Quality 0.75 for optimal compression (Next.js uses 60-75 quality range)
 * - Targets ~400KB file size (same as web app)
 * 
 * WebP is preferred by Next.js Image component and provides superior compression
 * while maintaining visual quality, resulting in lower storage costs and faster loads.
 */
export async function compressImageForUpload(uri: string): Promise<{ uri: string; type: string }> {
  try {
    // Get image dimensions to implement maxWidthOrHeight: 1200 behavior
    // This ensures the larger dimension is limited to 1200px (matches web app behavior)
    const imageInfo = await getImageInfoAsync(uri);
    const maxDimension = 1200;
    
    // Determine resize action based on which dimension is larger
    // Only resize if the image exceeds maxDimension
    const actions: ImageManipulator.Action[] = [];
    if (imageInfo.width > maxDimension || imageInfo.height > maxDimension) {
      if (imageInfo.width > imageInfo.height) {
        // Landscape: limit width to 1200px (height will scale proportionally)
        actions.push({ resize: { width: maxDimension } });
      } else {
        // Portrait or square: limit height to 1200px (width will scale proportionally)
        actions.push({ resize: { height: maxDimension } });
      }
    }

    // Compress with WebP format for best compression (Next.js Image compatible)
    // Quality 0.75 matches Next.js optimization range (60-75) for best compression
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions.length > 0 ? actions : [], // Only include resize if needed
      { 
        compress: 0.75, // Optimized for compression (web app uses 0.85, but 0.75 gives ~15% better compression)
        format: ImageManipulator.SaveFormat.WEBP // WebP provides ~30% better compression than JPEG
      }
    );
    
    return { uri: result.uri, type: 'image/webp' };
  } catch (error) {
    // Fallback to JPEG if WebP fails (shouldn't happen on modern devices, but safe fallback)
    try {
      const imageInfo = await getImageInfoAsync(uri);
      const maxDimension = 1200;
      const actions: ImageManipulator.Action[] = [];
      if (imageInfo.width > maxDimension || imageInfo.height > maxDimension) {
        if (imageInfo.width > imageInfo.height) {
          actions.push({ resize: { width: maxDimension } });
        } else {
          actions.push({ resize: { height: maxDimension } });
        }
      }
      
      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      return { uri: result.uri, type: 'image/jpeg' };
    } catch {
      // Last resort: return original (should rarely happen)
      return { uri, type: 'image/jpeg' };
    }
  }
}
