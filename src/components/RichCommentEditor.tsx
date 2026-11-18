'use client';

import React, { useRef } from 'react';
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
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface RichCommentEditorProps {
  value: string;
  onChange: (val: string) => void;
  sender: string;
  onSenderChange: (val: string) => void;
  nameOptions: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  hasImages?: boolean;
}

export default function RichCommentEditor({
  value,
  onChange,
  sender,
  onSenderChange,
  nameOptions,
  onSubmit,
  isSubmitting,
  hasImages = false,
}: RichCommentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Helper to insert markdown tokens at cursor or around selected text
   */
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

  /**
   * Insert line-based prefix (e.g. - list, 1. numbered, > quote)
   */
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
      // Find beginning of current line
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

  const canSubmit = !isSubmitting && (Boolean(value.trim()) || hasImages) && Boolean(sender);

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xs overflow-hidden focus-within:border-[#0086FF] transition-all">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-50/90 border-b border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#0086FF]" /> เครื่องมือจัดข้อความ:
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
            onClick={() => wrapSelection('~~', '~~', 'ข้อความ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="ขีดฆ่า • ~~ข้อความ~~"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="รายการแบบจุด (Bullet List) • - รายการ"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="รายการแบบตัวเลข (Numbered List) • 1. รายการ"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="แทรกลิงก์ Hyperlink • [ชื่อ](url)"
          >
            <Link2 className="w-3.5 h-3.5 text-[#0086FF]" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('`', '`', 'code')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="Inline Code • `code`"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertLinePrefix('> ')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
            title="Quote / ข้อความอ้างอิง • > ข้อความ"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          💡 แปะลิงก์ URL ตรงๆ จะกลายเป็น Hyperlink อัตโนมัติ
        </span>
      </div>

      {/* Spacious Multi-line Textarea */}
      <textarea
        ref={textareaRef}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl+Enter or Cmd+Enter to submit
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }
          // Ctrl+B for bold
          if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            wrapSelection('**', '**', 'ตัวหนา');
          }
          // Ctrl+I for italic
          if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            wrapSelection('*', '*', 'ตัวเอียง');
          }
        }}
        placeholder="พิมพ์รายละเอียดความคืบหน้า หรือความเห็น... (รองรับตัวหนา, ลิสต์รายการ, แปะลิงก์ URL จะเป็น Hyperlink ให้อัตโนมัติ, กด Ctrl+Enter เพื่อส่ง)"
        className="w-full p-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none resize-y min-h-[110px] bg-transparent font-sans"
      />

      {/* Bottom Bar: Sender selection & Send button */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          <label className="font-bold text-slate-600">ผู้ส่ง:</label>
          <select
            value={sender}
            onChange={(e) => onSenderChange(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-semibold text-slate-800 shadow-2xs"
            aria-label="ผู้แสดงความเห็น"
          >
            <option value="">-- เลือกชื่อผู้ส่ง * --</option>
            {nameOptions}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {!sender && (value.trim() || hasImages) && (
            <span className="text-xs font-semibold text-amber-600">
              * กรุณาเลือกชื่อผู้ส่งก่อน
            </span>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#044492] hover:bg-[#0C2553] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งอัปเดตความคืบหน้า'}
          </button>
        </div>
      </div>
    </div>
  );
}
