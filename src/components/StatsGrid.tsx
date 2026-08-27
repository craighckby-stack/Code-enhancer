/**
 * DARLEK CANN ARCHITECTURAL HEADER
 * File: src/components/StatsGrid.tsx
 * Role: Core system component participating in autonomous cognitive evolution cycles.
 * Architecture: Type-safe modular unit with resilient state interfaces.
 */

import React from 'react';
import { Cpu, ShieldCheck, Activity, RefreshCw, FileCode2, Sparkles } from 'lucide-react';
import { EngineMetrics } from '../types';

interface StatsGridProps {
  metrics: EngineMetrics;
  isSandbox: boolean;
  hasGhToken: boolean;
  onOpenDiagnostics?: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  metrics,
  isSandbox,
  hasGhToken,
  onOpenDiagnostics,
}) => {
  return (
    <div id="emg-stats-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {/* Mutations */}
      <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Mutations</span>
          <Cpu className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
          {metrics.enhancements}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono">AST Optima</div>
      </div>

      {/* Recoveries */}
      <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Recoveries</span>
          <RefreshCw className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-2xl md:text-3xl font-black text-sky-400 tracking-tight">
          {metrics.retries}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono">Fault tolerant</div>
      </div>

      {/* Uplink Status */}
      <div
        onClick={onOpenDiagnostics}
        className={`bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group ${
          onOpenDiagnostics ? 'cursor-pointer hover:border-emerald-500/40 transition-colors' : ''
        }`}
        title={onOpenDiagnostics ? 'Click to inspect Kernel Diagnostics & Environment Telemetry' : undefined}
      >
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Uplink</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-base md:text-xl font-bold text-emerald-400 tracking-tight truncate mt-1">
          {isSandbox ? 'SANDBOX' : hasGhToken ? 'SECURE' : 'PUBLIC'}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono flex items-center justify-between">
          <span>Sovereign Bus</span>
          {onOpenDiagnostics && <span className="text-[9px] text-emerald-400/70 font-bold">PROBE &rarr;</span>}
        </div>
      </div>

      {/* Scanned Files */}
      <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Tree Depth</span>
          <FileCode2 className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl md:text-3xl font-black text-purple-400 tracking-tight">
          {metrics.totalScannedFiles}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono">Discovered Files</div>
      </div>

      {/* Neural Latency */}
      <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Avg Latency</span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl md:text-3xl font-black text-amber-400 tracking-tight">
          {metrics.avgLatencyMs > 0 ? `${metrics.avgLatencyMs}ms` : '--'}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono">Synthesis speed</div>
      </div>

      {/* Tokens Processed */}
      <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Neural Load</span>
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl md:text-3xl font-black text-cyan-400 tracking-tight">
          {metrics.tokensProcessed > 1000
            ? `${(metrics.tokensProcessed / 1000).toFixed(1)}k`
            : metrics.tokensProcessed}
        </div>
        <div className="text-[10px] text-neutral-500 mt-1 font-mono">Tokens analyzed</div>
      </div>
    </div>
  );
};
