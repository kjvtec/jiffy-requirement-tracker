'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Search,
  ImageIcon,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  Issue,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
} from '@/types';
import { parseIssueNumber } from '@/lib/issueSort';

export interface RecentIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onGoToPriorityList?: () => void;
  onGoToTable: () => void;
}

export default function RecentIssuesModal({
  isOpen,
  onClose,
  issues,
  onSelectIssue,
  onGoToPriorityList,
  onGoToTable,
}: RecentIssuesModalProps) {
  const [recentSearch, setRecentSearch] = useState('');
  const [recentStatusFilter, setRecentStatusFilter] = useState('ALL');

  // Pure Z-A sorting by Req Number descending
  const issuesSortedZa = useMemo(() => {
    return [...issues].sort((a, b) => {
      const numA = parseIssueNumber(a.req_id || a.log_id || '');
      const numB = parseIssueNumber(b.req_id || b.log_id || '');
      return numB - numA;
    });
  }, [issues]);

  const latestIssue = issuesSortedZa[0] || null;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredRecentList = useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    return issuesSortedZa.filter((item) => {
      if (recentStatusFilter === 'ACTIVE' && item.status === 'Closed') return false;
      if (recentStatusFilter !== 'ALL' && recentStatusFilter !== 'ACTIVE' && item.status !== recentStatusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          item.req_id || item.log_id || '',
          item.title || '',
          item.details,
          item.module,
          item.core_function || DEFAULT_CORE_FUNCTION,
          item.requested_by || item.raise_by || '',
          item.status,
          item.priority,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issuesSortedZa, recentSearch, recentStatusFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0C2553] via-[#044492] to-[#0074E0] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFCB06] text-[#0C2553]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                Issue เรียงจากเลขล่าสุดลงไป (Z-A)
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {issues.length} รายการ
                </span>
              </h3>
              <p className="text-[11px] text-blue-100">
                เรียงจากหมายเลขล่าสุดลงไป (มาก ➔ น้อย: {latestIssue?.req_id || latestIssue?.log_id || ''} ➔ JFY-REQ-01)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลข Issue, รายละเอียด, โมดูล, หรือผู้แจ้ง..."
              value={recentSearch}
              onChange={(e) => setRecentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0086FF]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={recentStatusFilter}
              onChange={(e) => setRecentStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">ทุกสถานะ ({issuesSortedZa.length})</option>
              <option value="ACTIVE">เฉพาะที่ยังไม่ Closed ({issuesSortedZa.filter((i) => i.status !== 'Closed').length})</option>
              <option value="Open">Open</option>
              <option value="Need Info">Need Info</option>
              <option value="In Progress">In Progress</option>
              <option value="Test">Test</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Issues List sorted Z-A */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredRecentList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            filteredRecentList.map((issue, idx) => {
              const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
              const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
              const isLatest = idx === 0 && !recentSearch && recentStatusFilter === 'ALL';

              const statusColor =
                issue.status === 'Need Info'
                  ? 'text-orange-800 bg-orange-50 border-orange-300'
                  : issue.status === 'In Progress'
                    ? 'text-purple-700 bg-purple-50 border-purple-200'
                    : issue.status === 'Test'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : issue.status === 'Closed'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200';

              const priorityColor = issue.priority.includes('High')
                ? 'text-red-700 bg-red-50 border-red-200'
                : issue.priority.includes('Medium')
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-sky-700 bg-sky-50 border-sky-200';

              return (
                <div
                  key={issue.id}
                  onClick={() => {
                    onClose();
                    onSelectIssue(issue);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isLatest
                      ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-100/60 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-[#0086FF]/50 hover:bg-[#EFF7FF]/50'
                  }`}
                >
                  {/* Left: Issue No, Core/Module, Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded-md border ${
                          isLatest
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-slate-100 text-slate-800 border-slate-200 group-hover:bg-[#0086FF] group-hover:text-white transition-colors'
                        }`}
                      >
                        {issue.req_id || issue.log_id}
                      </span>

                      {isLatest && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">
                          ล่าสุด NEW
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}>
                        {coreMeta.shortName}
                      </span>

                      <span className="text-[10px] font-medium text-slate-500">
                        • {issue.module}
                      </span>

                      {issue.images && issue.images.length > 0 && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5">
                          <ImageIcon className="w-2.5 h-2.5" />
                          {issue.images.length}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#0C2553]">
                      {issue.details}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {issue.raise_by}
                      </span>
                      {issue.raise_date && (
                        <span>
                          แจ้ง {new Date(issue.raise_date).toLocaleDateString('th-TH')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Priority, Status, Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColor}`}>
                        {issue.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                        {issue.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#0086FF] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ดูรายละเอียด <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            แสดง {filteredRecentList.length} จาก {issues.length} รายการ (เรียงจากเลขล่าสุดลงไป Z-A)
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onGoToPriorityList) onGoToPriorityList();
              else onGoToTable();
            }}
            className="inline-flex items-center gap-1 font-bold text-[#0086FF] hover:text-[#044492] hover:underline"
          >
            ดูในหน้าเต็มแบบ Priority List (Z-A) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
