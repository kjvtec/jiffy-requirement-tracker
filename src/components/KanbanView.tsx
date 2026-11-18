'use client';

import React from 'react';
import { Requirement, RequirementStatusType } from '@/types';
import { ImageIcon, User, ChevronRight, Layers, Code2, Tag } from 'lucide-react';

interface KanbanViewProps {
  requirements: Requirement[];
  onSelectRequirement: (requirement: Requirement) => void;
  onStatusChange: (requirementId: string, newStatus: RequirementStatusType) => Promise<void>;
}

const COLUMNS: { id: RequirementStatusType; label: string; color: string; badge: string }[] = [
  { id: 'Draft', label: 'Draft', color: 'border-slate-300 bg-slate-50/60', badge: 'bg-slate-200 text-slate-800' },
  { id: 'In Review', label: 'In Review', color: 'border-amber-300 bg-amber-50/60', badge: 'bg-amber-100 text-amber-800' },
  { id: 'In Development', label: 'In Development', color: 'border-indigo-300 bg-indigo-50/60', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'Testing', label: 'Testing / UAT', color: 'border-sky-300 bg-sky-50/60', badge: 'bg-sky-100 text-sky-800' },
  { id: 'Done', label: 'Done / Released', color: 'border-emerald-300 bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-800' },
];

export default function KanbanView({
  requirements,
  onSelectRequirement,
  onStatusChange,
}: KanbanViewProps) {
  const getNextStatus = (current: RequirementStatusType): RequirementStatusType | null => {
    if (current === 'Draft') return 'In Review';
    if (current === 'In Review') return 'In Development';
    if (current === 'In Development') return 'Testing';
    if (current === 'Testing') return 'Done';
    return null;
  };

  const getPriorityStyle = (priority: string) => {
    if (priority.includes('High')) return 'bg-red-50 text-red-700 border-red-200';
    if (priority.includes('Medium')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colReqs = requirements.filter((r) => r.status === col.id);

        return (
          <div
            key={col.id}
            className={`rounded-2xl border ${col.color} p-4 flex flex-col max-h-[82vh] bg-white shadow-sm`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  {col.label}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colReqs.length}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {colReqs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ไม่มีรายการในสถานะนี้
                </div>
              ) : (
                colReqs.map((req) => {
                  const nextStatus = getNextStatus(req.status as RequirementStatusType);

                  return (
                    <div
                      key={req.id}
                      onClick={() => onSelectRequirement(req)}
                      className="group bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                          {req.req_id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getPriorityStyle(
                            req.priority
                          )}`}
                        >
                          {req.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                        {req.title}
                      </h4>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {req.details}
                      </p>

                      {/* Image Thumbnail if attached */}
                      {req.images && req.images.length > 0 && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-100 h-20 bg-slate-50 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={req.images[0].file_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {req.images.length}
                          </span>
                        </div>
                      )}

                      {/* Dev Assigned & Target Version */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {req.dev_assigned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                            <Code2 className="w-2.5 h-2.5" />
                            {req.dev_assigned}
                          </span>
                        )}
                        {req.target_version && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                            <Tag className="w-2.5 h-2.5" />
                            {req.target_version}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {req.requested_by}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Layers className="w-3 h-3" />
                          {req.module}
                        </span>
                      </div>

                      {/* Quick Move Next Button */}
                      {nextStatus && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(req.id, nextStatus);
                          }}
                          className="w-full mt-1 py-1.5 px-2 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-[11px] font-semibold rounded-lg border border-slate-200 hover:border-sky-200 transition-colors flex items-center justify-center gap-1"
                        >
                          ส่งต่อเป็น {nextStatus} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
