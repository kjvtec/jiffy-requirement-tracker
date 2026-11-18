'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UploadCloud, X, Loader2, Image as ImageIcon, Clipboard } from 'lucide-react';
import { IssueImage } from '@/types';

interface ImageUploaderProps {
  images: IssueImage[];
  onChange: (images: IssueImage[]) => void;
  issueLogId?: string;
  title?: string;
}

export default function ImageUploader({ images, onChange, issueLogId, title = 'รูปภาพประกอบปัญหา' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndUploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);

    const newImages: IssueImage[] = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      setUploadProgress(`กำลังประมวลผลรูปที่ ${i + 1}/${files.length}...`);

      try {
        // 1. Compress image to save bandwidth and storage
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        if (!isSupabaseConfigured) {
          // Demo fallback: create Object URL so user can preview even without Supabase credentials
          const objectUrl = URL.createObjectURL(compressedFile);
          newImages.push({
            file_url: objectUrl,
            file_name: file.name || `image_${Date.now()}.png`,
            file_size: compressedFile.size,
          });
          continue;
        }

        // 2. Upload to Supabase Storage
        setUploadProgress(`กำลังอัปโหลดรูปที่ ${i + 1}/${files.length}...`);
        const cleanLogId = (issueLogId || 'NEW').replace(/[^a-zA-Z0-9_-]/g, '');
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 7);
        const ext = file.name.split('.').pop() || 'png';
        const filePath = `${cleanLogId}/${timestamp}_${randomStr}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('issue-attachments')
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          alert(`เกิดข้อผิดพลาดในการอัปโหลดรูป: ${uploadError.message}`);
          continue;
        }

        // 3. Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('issue-attachments')
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
  }, [images, onChange, issueLogId]);

  // Handle Paste from Clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        processAndUploadFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processAndUploadFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUploadFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <label className="font-medium text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          {title} ({images.length} รูป)
        </label>
        <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
          <Clipboard className="w-3 h-3" />
          กด <b>Ctrl + V</b> เพื่อวางรูปหน้าจอได้ทันที
        </span>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-600">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-indigo-600 py-1">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm font-medium">{uploadProgress || 'กำลังอัปโหลด...'}</p>
            </div>
          ) : (
            <>
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full mb-1">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-xs text-slate-500">
                รองรับ PNG, JPG, WebP (บีบอัดอัตโนมัติก่อนส่งขึ้น Cloud)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Images Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="group relative rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm hover:shadow transition-all"
            >
              <div className="relative h-24 w-full overflow-hidden rounded bg-slate-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.file_url}
                  alt={img.file_name}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="truncate max-w-[90px]" title={img.file_name}>
                  {img.file_name}
                </span>
                <span>{formatSize(img.file_size)}</span>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(idx);
                }}
                className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform hover:scale-110"
                title="ลบรูปนี้"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
