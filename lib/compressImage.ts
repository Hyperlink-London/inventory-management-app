import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImageForUpload(uri: string): Promise<{ uri: string; type: string }> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, type: 'image/jpeg' };
  } catch {
    return { uri, type: 'image/jpeg' };
  }
}
