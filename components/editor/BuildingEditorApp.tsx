'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { BuildingsProvider } from '@/lib/editor/contexts/BuildingsContext';
import { InputPanel } from '@/components/editor/InputPanel/InputPanel';
import { Scene } from '@/components/editor/Viewport/Scene';
import { ExportBar } from '@/components/editor/Export/ExportBar';
import { VoiceDesign } from '@/components/editor/InputPanel/VoiceDesign';
import { RoomListSidebar } from '@/components/editor/FloorPlan/RoomListSidebar';
import { FloorPlanBackButton } from '@/components/editor/FloorPlan/FloorPlanBackButton';

export default function BuildingEditorApp() {
  const sceneRef = useRef<THREE.Scene | null>(null);

  return (
    <BuildingsProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 relative selection:bg-indigo-100 selection:text-indigo-900">
        {/* Header */}
        <header className="bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_2px_12px_rgba(99,102,241,0.06)] z-20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 tracking-wide">3D Building & Parcel Editor</h1>
              <p className="text-[12px] font-medium text-indigo-600 tracking-wide">Clearline Asset Generator</p>
            </div>
          </div>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm bg-white/70 border border-slate-200 text-slate-600 shadow-[0_2px_12px_rgba(2,6,23,0.05)] hover:bg-white hover:text-slate-900 transition-all duration-200 ease-out"
            aria-label="Back to dashboard"
          >
            <span aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
            Back to Dashboard
          </Link>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Input Panel - Left Side */}
          <div className="w-[30%] min-w-[320px] max-w-[500px]">
            <InputPanel />
          </div>

          {/* 3D Viewport - Right Side */}
          <div className="flex-1 relative">
            <Scene sceneRef={sceneRef} />
            <RoomListSidebar />
            <FloorPlanBackButton />
          </div>
        </div>

        {/* Export Bar - Bottom */}
        <ExportBar sceneRef={sceneRef} />
      </div>

      {/* Voice Design - Floating Bottom Left */}
      <VoiceDesign />
    </BuildingsProvider>
  );
}
