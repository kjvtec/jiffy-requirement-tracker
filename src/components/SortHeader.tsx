'use client';

import React from 'react';
import { ArrowDownZA, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import type { SortState } from '@/lib/sort';

interface SortHeaderProps<K extends string> {
  label: React.ReactNode;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
}

/** A sortable table header cell: click to sort A-Z, click again for Z-A. */
export default function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: SortHeaderProps<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUpAZ : ArrowDownZA;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`p-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={active ? (sort.dir === 'asc' ? 'เรียง A→Z (คลิกเพื่อกลับเป็น Z→A)' : 'เรียง Z→A (คลิกเพื่อกลับเป็น A→Z)') : 'คลิกเพื่อเรียง A→Z'}
        className={`w-full flex items-center gap-1.5 py-3 px-4 text-left font-semibold whitespace-nowrap transition-colors ${
          active ? 'text-jiffy-navy bg-jiffy-sky' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span>{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-jiffy-blue' : 'text-slate-400'}`} aria-hidden />
      </button>
    </th>
  );
}
