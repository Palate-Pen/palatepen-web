'use client';

import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Generic photo upload component. Used on RecipeForm (recipe + spec
 * photos) and AddNoteDialog (notebook photo entries). Uploads to the
 * given Supabase Storage bucket under a {sitePath}/{contextId}/ prefix,
 * returns the public URL (or signed URL for private buckets) on success.
 *
 * Caller controls:
 *   - bucket — 'recipe-photos' (public) or 'notebook-attachments' (private)
 *   - sitePath — usually the site_id; used as the top-level folder
 *   - contextId — the recipe_id / entry_id this photo belongs to
 *   - onUploaded(url) — fires when the upload succeeds; caller writes
 *     the URL to its own DB row
 *   - initialUrl — existing photo to display before any new upload
 */
export function PhotoUpload({
  bucket,
  sitePath,
  contextId,
  initialUrl,
  onUploaded,
  onRemoved,
  maxBytes = MAX_BYTES_DEFAULT,
  label = 'Photo',
  hint = 'JPG, PNG or WebP · up to 5MB',
}: {
  bucket: 'recipe-photos' | 'notebook-attachments';
  sitePath: string;
  contextId: string;
  initialUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
  onRemoved?: () => void;
  maxBytes?: number;
  label?: string;
  hint?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError('Use JPG, PNG or WebP.');
      return;
    }
    if (file.size > maxBytes) {
      setError(`Photo is too big — max ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.includes('.')
        ? file.name.split('.').pop()!.toLowerCase()
        : 'jpg';
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const path = `${sitePath}/${contextId}/${id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '31536000',
          upsert: false,
          contentType: file.type,
        });
      if (upErr) throw upErr;

      // Public bucket: getPublicUrl is synchronous.
      // Private bucket: createSignedUrl returns a signed URL (1 year here;
      // for v1 we use public URLs for everything — switch to signed if
      // bucket goes private later).
      let resolvedUrl: string | null = null;
      if (bucket === 'recipe-photos') {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        resolvedUrl = pub.publicUrl;
      } else {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        resolvedUrl = signed?.signedUrl ?? null;
      }
      if (!resolvedUrl) throw new Error('Could not resolve photo URL.');

      setPreviewUrl(resolvedUrl);
      onUploaded(resolvedUrl);
    } catch (e) {
      setError((e as Error).message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setPreviewUrl(null);
    setError(null);
    if (onRemoved) onRemoved();
  }

  return (
    <div>
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
        {label}
      </div>

      {previewUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="uploaded photo"
            className="max-h-[260px] max-w-full object-cover border border-rule rounded-sm"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={pick}
              disabled={uploading}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
            >
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="border-2 border-dashed border-rule px-8 py-6 hover:border-gold transition-colors text-center w-full max-w-[260px] disabled:opacity-40"
        >
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-1">
            {uploading ? 'Uploading…' : '+ Add photo'}
          </div>
          <div className="font-serif italic text-xs text-muted">{hint}</div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {error && (
        <p className="mt-2 font-serif italic text-sm text-urgent">{error}</p>
      )}
    </div>
  );
}
