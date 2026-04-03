'use client';

import dynamic from 'next/dynamic';

const BuildingEditorApp = dynamic(() => import('@/components/editor/BuildingEditorApp'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen w-screen bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p className="text-[12px] font-semibold text-slate-900 uppercase tracking-widest">Loading Asset Editor...</p>
      </div>
    </div>
  ),
});

export default function EditorPage() {
  return <BuildingEditorApp />;
}
