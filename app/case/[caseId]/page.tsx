import { Suspense } from 'react';
import CasePageContent from './CasePageContent';

export default async function CasePage({ params }: any) {
  // Try resolving as a promise just in case, but also handle it if it's a plain object
  const resolvedParams = await Promise.resolve(params);
  
  console.log('[DEBUG] CasePage raw params:', params);
  console.log('[DEBUG] CasePage resolved params:', resolvedParams);
  
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-medium tracking-widest uppercase">Loading Case...</p>
        </div>
      </div>
    }>
      <CasePageContent />
    </Suspense>
  );
}

