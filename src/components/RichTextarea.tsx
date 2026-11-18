'use client';

import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Code,
  Quote,
  Eye,
  Edit3,
  Sparkles,
} from 'lucide-react';
import FormattedText from './FormattedText';

export interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  theme?: 'jiffy' | 'indigo';
  minHeight?: string;
}

export default function RichTextarea({
  value,
  onChange,
  placeholder = 'พิมพ์รายละเอียดที่นี่...',
  rows = 6,
  required = false,
  theme = 'jiffy',
  minHeight = '140px',
}: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);

  const isJiffy = theme === 'jiffy';
  const brandColor = isJiffy ? '#044492' : '#4f46e5';

  const wrapSelection = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.substring(start, end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultPlaceholder}${suffix}`;
    const nextVal = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        el.setSelectionRange(start + prefix.length, start + prefix.length + defaultPlaceholder.length);
      }
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.substring(start, end);

    if (selected) {
      const lines = selected.split('\n').map((l, idx) => {
        if (prefix === '1. ') return `${idx + 1}. ${l}`;
        return `${prefix}${l}`;
      });
      const replacement = lines.join('\n');
      const nextVal = value.substring(0, start) + replacement + value.substring(end);
      onChange(nextVal);
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const nextVal = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(nextVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 10);
    }
  };

  const handleInsertLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.substring(start, end);

    const url = window.prompt('ใส่ลิงก์ URL ที่ต้องการ (https://...):', 'https://');
    if (!url || url.trim() === 'https://') return;

    const cleanUrl = url.trim();
    const label = selected.trim() || 'ข้อความลิงก์';
    const markdownLink = `[${label}](${cleanUrl})`;

    const nextVal = value.substring(0, start) + markdownLink + value.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + markdownLink.length, start + markdownLink.length);
    }, 10);
  };

  return (
    <div
      className={`rounded-2xl border-2 bg-white shadow-xs overflow-hidden transition-all ${
        isJiffy
          ? 'border-slate-200 focus-within:border-jiffy-blue'
          : 'border-slate-200 focus-within:border-indigo-500'
      }`}
    >
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-50/90 border-b border-slate-200 text-xs select-none">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> เครื่องมือจัดข้อความ:
          </span>

          <button
            type="button"
            onClick={() => wrapSelection('**', '**', 'ตัวหนา')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="ตัวหนา (Ctrl+B) • **ข้อความ**"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('*', '*', 'ตัวเอียง')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="ตัวเอียง (Ctrl+I) • *ข้อความ*"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('<u>', '</u>', 'ขีดเส้นใต้')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="ขีดเส้นใต้ • <u>ข้อความ</u>"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('~~', '~~', 'ข้อความขีดฆ่า')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="ขีดฆ่า • ~~ข้อความ~~"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="รายการหัวข้อย่อย • - ข้อความ"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="รายการลำดับตัวเลข • 1. ข้อความ"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="แทรกลิงก์ Hyperlink • [ชื่อลิงก์](url)"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('`', '`', 'โค้ด')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="โค้ดในบรรทัด • `โค้ด`"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertLinePrefix('> ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="กล่องข้อความอ้างอิง (Quote) • > ข้อความ"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-slate-400">
            แปะลิงก์ URL จะกลายเป็น Hyperlink อัตโนมัติ
          </span>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              isPreview
                ? isJiffy
                  ? 'bg-jiffy-blue text-white border-jiffy-blue shadow-2xs'
                  : 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreview ? 'แก้ไขข้อความ' : 'ดูตัวอย่าง'}</span>
          </button>
        </div>
      </div>

      {/* Editor or Preview Pane */}
      {isPreview ? (
        <div
          style={{ minHeight }}
          className="p-4 bg-slate-50/50 text-sm overflow-y-auto max-h-[360px]"
        >
          {value.trim() ? (
            <FormattedText text={value} />
          ) : (
            <span className="text-slate-400 italic text-xs">
              (ยังไม่มีข้อความ — พิมพ์ข้อความแล้วคลิกดูตัวอย่างได้ที่นี่)
            </span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
              e.preventDefault();
              wrapSelection('**', '**', 'ตัวหนา');
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
              e.preventDefault();
              wrapSelection('*', '*', 'ตัวเอียง');
            }
          }}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full p-4 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none resize-y bg-transparent font-sans"
        />
      )}
    </div>
  );
}
