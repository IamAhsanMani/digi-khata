/**
 * Supabase Storage Service
 * Handles secure uploads, public/signed URLs, and lifecycle management for company logos,
 * transaction receipt photos, invoice PDFs, and expense vouchers.
 * Includes resilient fallbacks to local data storage to prevent UI lockup when offline or pre-provisioned.
 */

import { supabase } from '@/lib/db.js';

export const SUPABASE_STORAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'digikhata-media';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Helper to convert a File or Blob into a base64 Data URL
 * @param {File | Blob} file
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file (Logo, Receipt, Bill, PDF) to Supabase Storage
 *
 * @param {Object} options
 * @param {File} options.file - The File object to upload
 * @param {'logos' | 'receipts' | 'documents' | 'expenses'} [options.folder='receipts']
 * @param {string} [options.bucketName] - Optional override of default bucket
 * @returns {Promise<{
 *   success: boolean,
 *   url?: string,
 *   path?: string,
 *   bucket?: string,
 *   provider: 'supabase' | 'local_fallback',
 *   size?: number,
 *   name?: string,
 *   type?: string,
 *   error?: string,
 *   warning?: string
 * }>}
 */
export async function uploadFileToSupabase({
  file,
  folder = 'receipts',
  bucketName = SUPABASE_STORAGE_BUCKET,
}) {
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File exceeds maximum allowed size of ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB`,
    };
  }

  const cleanName = file.name
    ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    : 'attachment';
  const timestamp = Date.now();
  const salt = Math.random().toString(36).substring(2, 7);
  const filePath = `${folder}/${timestamp}_${salt}_${cleanName}`;

  // If Supabase client is configured, attempt direct Supabase Storage upload
  if (supabase && supabase.storage) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (!error && data) {
        // Retrieve public URL from Supabase Storage
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path || filePath);

        return {
          success: true,
          url: publicUrlData?.publicUrl || filePath,
          path: data.path || filePath,
          bucket: bucketName,
          provider: 'supabase',
          size: file.size,
          name: file.name,
          type: file.type,
        };
      }

      console.warn(
        `[DigiKhata Supabase Storage] Remote upload returned an error (${error?.message || 'Unknown error'}). Falling back to resilient local storage.`
      );
    } catch (err) {
      console.warn(
        `[DigiKhata Supabase Storage] Network/bucket error (${err?.message || 'Upload exception'}). Falling back to resilient local storage.`
      );
    }
  }

  // Graceful local fallback if Supabase bucket isn't yet created or client is unconfigured
  try {
    const base64Url = await readFileAsDataUrl(file);
    return {
      success: true,
      url: base64Url,
      path: filePath,
      bucket: bucketName,
      provider: 'local_fallback',
      size: file.size,
      name: file.name,
      type: file.type,
      warning: 'Stored locally via fallback because Supabase Storage bucket is uninitialized.',
    };
  } catch (readErr) {
    return {
      success: false,
      error: readErr?.message || 'Failed to process file.',
    };
  }
}

/**
 * Deletes a file from Supabase Storage
 *
 * @param {Object} options
 * @param {string} options.path
 * @param {string} [options.bucketName]
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteFileFromSupabase({
  path,
  bucketName = SUPABASE_STORAGE_BUCKET,
}) {
  if (!path) return { success: true };

  // If it's a data URL, no remote deletion is required
  if (typeof path === 'string' && path.startsWith('data:')) {
    return { success: true };
  }

  if (supabase && supabase.storage) {
    try {
      const { error } = await supabase.storage.from(bucketName).remove([path]);
      if (error) {
        console.warn('[DigiKhata Supabase Storage] Failed to remove file:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message };
    }
  }

  return { success: true };
}

/**
 * Checks connectivity and readiness of the Supabase Storage service
 * @returns {Promise<{ isConfigured: boolean, bucket: string, connected: boolean, message: string }>}
 */
export async function getSupabaseStorageStatus() {
  const isConfigured = Boolean(
    supabase &&
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  if (!isConfigured) {
    return {
      isConfigured: false,
      bucket: SUPABASE_STORAGE_BUCKET,
      connected: false,
      message: 'Supabase credentials not configured in environment (local storage active).',
    };
  }

  try {
    const { data, error } = await supabase.storage.getBucket(SUPABASE_STORAGE_BUCKET);
    if (error) {
      return {
        isConfigured: true,
        bucket: SUPABASE_STORAGE_BUCKET,
        connected: false,
        message: `Bucket "${SUPABASE_STORAGE_BUCKET}" not found or unauthorized: ${error.message}`,
      };
    }
    return {
      isConfigured: true,
      bucket: SUPABASE_STORAGE_BUCKET,
      connected: true,
      message: `Supabase Storage connected and bucket "${SUPABASE_STORAGE_BUCKET}" is ready.`,
    };
  } catch (err) {
    return {
      isConfigured: true,
      bucket: SUPABASE_STORAGE_BUCKET,
      connected: false,
      message: err?.message || 'Storage check timed out',
    };
  }
}
