'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UploadCloud, X, Loader2, Image as ImageIcon, Clipboard } from 'lucide-react';
import { RequirementImage } from '@/types';

interface ImageUploaderProps {
  images: RequirementImage[];
  onChange: (images: RequirementImage[]) => void;
  reqId?: string;
  title?: string;
}

export default function ImageUploader({
  images,
  onChange,
  reqId,
  title = 'รูปภาพประกอบ / Wireframe / Screenshot',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);

      const newImages: RequirementImage[] = [...images];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        setUploadProgress(`กำลังประมวลผลรูปที่ ${i + 1}/${files.length}...`);

        try {
          // 1. Compress image
          const options = {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);

          if (!isSupabaseConfigured) {
            const objectUrl = URL.createObjectURL(compressedFile);
            newImages.push({
              file_url: objectUrl,
              file_name: file.name || `image_${Date.now()}.png`,
              file_size: compressedFile.size,
            });
            continue;
          }

          // 2. Upload to Supabase Storage (try requirement-attachments, fallback to issue-attachments)
          setUploadProgress(`กำลังอัปโหลดรูปที่ ${i + 1}/${files.length}...`);
          const cleanId = (reqId || 'NEW').replace(/[^a-zA-Z0-9_-]/g, '');
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 7);
          const ext = file.name.split('.').pop() || 'png';
          const filePath = `${cleanId}/${timestamp}_${randomStr}.${ext}`;

          let targetBucket = 'requirement-attachments';
          let { error: uploadError } = await supabase.storage
            .from(targetBucket)
            .upload(filePath, compressedFile, {
              contentType: compressedFile.type,
              upsert: false,
            });

          if (uploadError && uploadError.message.includes('Bucket not found')) {
            targetBucket = 'issue-attachments';
            const retry = await supabase.storage
              .from(targetBucket)
              .upload(filePath, compressedFile, {
                contentType: compressedFile.type,
                upsert: false,
              });
            uploadError = retry.error;
          }

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            alert(`เกิดข้อผิดพลาดในการอัปโหลดรูป: ${uploadError.message}`);
            continue;
          }

          // 3. Get public URL
          const { data: publicUrlData } = supabase.storage
            .from(targetBucket)
            .getPublicUrl(filePath);

          newImages.push({
            file_url: publicUrlData.publicUrl,
            file_name: file.name || `image_${timestamp}.${ext}`,
            file_size: compressedFile.size,
          });
        } catch (err) {
          console.error('Image upload failed:', err);
        }
      }

      onChange(newImages);
      setIsUploading(false);
      setUploadProgress('');
    },
    [images, onChange, reqId]
  );

  // Handle Paste from Clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processAndUploadFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processAndUploadFiles]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-sky-600" />
          {title}
          <span className="text-slate-400 font-normal">({images.length} รูป)</span>
        </label>
        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
          <Clipboard className="w-3 h-3 text-sky-600" />
          กด Ctrl + V เพื่อแปะรูปได้ทันที
        </span>
      </div>

      {/* Upload Box / Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/60 scale-[0.99]'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/80 bg-white'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) {
              processAndUploadFiles(Array.from(e.target.files));
            }
          }}
          multiple
          accept="image/*"
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
            <span className="text-xs font-medium text-slate-600">{uploadProgress}</span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">
                คลิกเพื่อเลือกไฟล์ หรือลากรูปภาพมาวางที่นี่
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                รองรับ PNG, JPG, WebP และสามารถแคปหน้าจอกด <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 border">Ctrl+V</kbd> แปะได้เลย
              </p>
            </div>
          </>
        )}
      </div>

      {/* Preview list */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative group border rounded-lg overflow-hidden bg-slate-100 aspect-video flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file_url}
                alt={img.file_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-90 group-hover:opacity-100 transition-colors"
                title="ลบรูปนี้"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded truncate max-w-[90%]">
                {img.file_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
