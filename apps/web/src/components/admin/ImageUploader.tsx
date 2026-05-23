'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, ImagePlus, GripVertical } from 'lucide-react';
import { uploadsApi } from '@/lib/api';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: 'products' | 'categories' | 'brands' | 'landing-pages' | 'hero-slider';
  maxImages?: number;
  label?: string;
}

export function ImageUploader({
  images,
  onChange,
  folder = 'products',
  maxImages = 10,
  label = 'Images',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArr.length === 0) return;
      const slots = maxImages - images.length;
      const toUpload = fileArr.slice(0, slots);
      if (toUpload.length === 0) return;

      setUploading(true);
      setProgress(toUpload.map((f) => f.name));

      const newUrls: string[] = [];
      for (const file of toUpload) {
        try {
          const { data } = await uploadsApi.uploadImage(file, folder);
          // API returns { url, publicId } — prefer `url`, fallback to `secure_url` for safety
          const url = data?.url || data?.secure_url || (typeof data === 'string' ? data : null);
          if (url) newUrls.push(url);
        } catch (err: any) {
          const statusCode = err?.response?.status;
          const errorMsg = err?.response?.data?.message || err?.message || 'Image upload failed';
          
          console.error('[ImageUploader] Upload failed:', {
            status: statusCode,
            message: errorMsg,
            error: err,
          });
          
          // Show user-friendly error messages
          if (statusCode === 401) {
            alert('Your session has expired. Please log in again to upload images.');
          } else if (statusCode === 403) {
            alert('You do not have permission to upload images. Admin access required.');
          } else {
            console.error('Image upload error:', errorMsg);
          }
          /* skip failed */
        }
        setProgress((p) => p.slice(1));
      }

      onChange([...images, ...newUrls]);
      setUploading(false);
      setProgress([]);
      if (inputRef.current) inputRef.current.value = '';
    },
    [images, onChange, folder, maxImages]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    onChange(next);
  };

  // Drag-to-reorder
  const handleItemDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragEnter = (idx: number) => setDropIndex(idx);

  const handleItemDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setDropIndex(null);
  };

  const canUpload = images.length < maxImages && !uploading;

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, idx) => (
            <div
              key={url + idx}
              draggable
              onDragStart={(e) => handleItemDragStart(e, idx)}
              onDragEnter={() => handleItemDragEnter(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleItemDrop}
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                dropIndex === idx && dragIndex !== idx
                  ? 'border-primary scale-105'
                  : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <Image src={url} alt={`Image ${idx + 1}`} fill className="object-cover" />

              {/* Primary badge */}
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                  Primary
                </span>
              )}

              {/* Drag handle */}
              <div className="absolute top-1 right-7 opacity-0 group-hover:opacity-100 transition">
                <div className="p-0.5 bg-black/50 rounded">
                  <GripVertical className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Uploading placeholders */}
          {progress.map((name, i) => (
            <div
              key={'progress-' + i}
              className="relative aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1"
            >
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-[10px] text-gray-500 text-center px-1 truncate max-w-full">{name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${dragOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">
              {uploading ? 'Uploading…' : 'Drop images here or click to upload'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              PNG, JPG, WebP — up to {maxImages} images · Drag to reorder
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      )}

      {/* Or paste URL */}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Or paste image URL and press Enter…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const url = (e.target as HTMLInputElement).value.trim();
              if (url && !images.includes(url)) {
                onChange([...images, url]);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      </div>

      <p className="text-xs text-gray-400">
        {images.length}/{maxImages} images · First image is the primary/cover image
      </p>
    </div>
  );
}
