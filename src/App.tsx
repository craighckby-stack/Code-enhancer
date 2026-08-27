/**
 * @license
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
 * Copyright (c) 2026 Craighckby
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  EngineStatus,
  EngineConfig,
  EngineMetrics,
  TelemetryLog,
  MutationRecord,
  LogType,
} from './types';
import { SplashView } from './components/SplashView';
import { Header } from './components/Header';
import { StatsGrid } from './components/StatsGrid';
import { ConfigPanel } from './components/ConfigPanel';
import { NeuralChart } from './components/NeuralChart';
import { MutationViewer } from './components/MutationViewer';
import { LogStream } from './components/LogStream';
import { DiffModal } from './components/DiffModal';
import { LicenseModal } from './components/LicenseModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { SANDBOX_REPOSITORIES } from './utils/mockRepo';
import {
  fetchRepoDetails,
  fetchRepoTree,
  fetchFileContent,
  commitFileUpdate,
} from './utils/github';
import { optimizeSourceCode } from './utils/gemini';

const INITIAL_CONFIG: EngineConfig = {
  targetRepo: 'craighckby/sovereign-kernel',
  ghToken: '',
  geminiKey: '',
  model: 'gemini-3.7-flash',
  isSandboxMode: true,
  dryRun: false,
  goal: 'comprehensive',
  loopIntervalSec: 6,
  branch: 'main',
  fileScope: 'all',
  specificFilePath: 'README.md',
};

const INITIAL_METRICS: EngineMetrics = {
  enhancements: 0,
  validations: 0,
  retries: 0,
  totalScannedFiles: 4,
  avgLatencyMs: 0,
  tokensProcessed: 0,
};

export default function App() {
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<EngineStatus>('IDLE');
  const [activePath, setActivePath] = useState<string | null>(null);
  const [config, setConfig] = useState<EngineConfig>(INITIAL_CONFIG);
  const [metrics, setMetrics] = useState<EngineMetrics>(INITIAL_METRICS);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [mutations, setMutations] = useState<MutationRecord[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>(Array(20).fill(0));
  const [latestLatency, setLatestLatency] = useState<number>(0);
  const [selectedRecord, setSelectedRecord] = useState<MutationRecord | null>(null);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isCycling, setIsCycling] = useState(false);

  const isCyclingRef = useRef(false);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileIndexRef = useRef(0);

  // Push structured log
  const pushLog = useCallback(
    (msg: string, type: LogType = 'info', latencyMs?: number, path?: string) => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
      const newLog: TelemetryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        type,
        msg,
        latencyMs,
        path,
      };

      setLogs((prev) => [newLog, ...prev].slice(0, 150));
    },
    []
  );

  // Push latency data point to telemetry
  const recordLatency = useCallback((val: number) => {
    setLatestLatency(val);
    setLatencyHistory((prev) => {
      const next = [...prev.slice(1), val];
      return next;
    });
  }, []);

  // Update Config handler
  const handleConfigChange = (key: keyof EngineConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Run a single optimization pass
  const executeCycle = useCallback(async () => {
    if (isCyclingRef.current) return;
    isCyclingRef.current = true;
    setIsCycling(true);

    const cycleStartTime = performance.now();

    try {
      if (config.isSandboxMode) {
        // --- SANDBOX SIMULATED WORKFLOW ---
        setStatus('SCANNING');
        pushLog(`Scanning sandbox repository "${config.targetRepo}"...`, 'info');

        const repoData = SANDBOX_REPOSITORIES[config.targetRepo] || SANDBOX_REPOSITORIES['craighckby/sovereign-kernel'];
        let candidateFiles = repoData.files;

        // Apply File Scope filter
        if (config.fileScope === 'markdown-only') {
          const mdFiles = candidateFiles.filter(
            (f) => /\.(md|markdown|mdx|txt)$/i.test(f.path) || /readme(\.|$)/i.test(f.path)
          );
          if (mdFiles.length > 0) {
            candidateFiles = mdFiles;
          }
        } else if (config.fileScope === 'specific' && config.specificFilePath?.trim()) {
          const query = config.specificFilePath.trim().toLowerCase();
          const matched = candidateFiles.filter(
            (f) => f.path.toLowerCase().includes(query) || f.path.toLowerCase() === query
          );
          if (matched.length > 0) {
            candidateFiles = matched;
          }
        }

        setMetrics((prev) => ({ ...prev, totalScannedFiles: candidateFiles.length }));

        // Sequential round-robin selection
        const targetFile = candidateFiles[fileIndexRef.current % candidateFiles.length];
        fileIndexRef.current = (fileIndexRef.current + 1) % candidateFiles.length;
        setActivePath(targetFile.path);

        setStatus('OPTIMIZING');
        pushLog(`Synthesizing neural mutations for [${targetFile.path}]...`, 'neural', undefined, targetFile.path);

        const result = await optimizeSourceCode(
          targetFile.content,
          targetFile.path,
          config.geminiKey,
          config.goal,
          config.model,
          config.isSandboxMode
        );

        const originalLines = targetFile.content.split('\n').length;
        const optimizedLines = result.optimizedCode.split('\n').length;

        // Record mutation
        const record: MutationRecord = {
          id: `mut-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          path: targetFile.path,
          originalCode: targetFile.content,
          optimizedCode: result.optimizedCode,
          originalLines,
          optimizedLines,
          latencyMs: result.latencyMs,
          optimizationSummary: result.summary,
          status: config.dryRun ? 'dry-run' : 'applied',
        };

        setMutations((prev) => [record, ...prev]);
        recordLatency(result.latencyMs);

        // Update metrics
        setMetrics((prev) => {
          const newEnhancements = prev.enhancements + 1;
          const newTokens = prev.tokensProcessed + result.tokensEstimate;
          const newAvgLatency = prev.avgLatencyMs === 0
            ? result.latencyMs
            : Math.round((prev.avgLatencyMs * prev.enhancements + result.latencyMs) / newEnhancements);

          return {
            ...prev,
            enhancements: newEnhancements,
            tokensProcessed: newTokens,
            avgLatencyMs: newAvgLatency,
          };
        });

        setStatus('COMMITTING');
        pushLog(
          `Mutation applied: ${targetFile.path} (${result.latencyMs}ms) - ${result.summary}`,
          'success',
          result.latencyMs,
          targetFile.path
        );

      } else {
        // --- REAL GITHUB LIVE REPOSITORY WORKFLOW ---
        if (!config.targetRepo || !config.targetRepo.includes('/')) {
          throw new Error('Invalid Target Repository format. Please use "owner/repo".');
        }

        setStatus('SCANNING');
        pushLog(`Handshaking with GitHub repo "${config.targetRepo}"...`, 'info');

        const repoInfo = await fetchRepoDetails(config.targetRepo, config.ghToken);
        const branch = repoInfo.default_branch || 'main';

        pushLog(`Discovering file tree for branch [${branch}]...`, 'info');
        const tree = await fetchRepoTree(config.targetRepo, branch, config.ghToken);

        if (tree.length === 0) {
          throw new Error('No candidate source code files found in repository tree.');
        }

        let candidateTree = tree;

        // Apply File Scope filter
        if (config.fileScope === 'markdown-only') {
          const mdFiles = tree.filter(
            (item) => /\.(md|markdown|mdx|txt)$/i.test(item.path) || /readme(\.|$)/i.test(item.path)
          );
          if (mdFiles.length > 0) {
            candidateTree = mdFiles;
          } else {
            pushLog(`No markdown files found matching filter. Falling back to all repository files.`, 'warning');
          }
        } else if (config.fileScope === 'specific' && config.specificFilePath?.trim()) {
          const query = config.specificFilePath.trim().toLowerCase();
          const matched = tree.filter(
            (item) => item.path.toLowerCase().includes(query) || item.path.toLowerCase() === query
          );
          if (matched.length > 0) {
            candidateTree = matched;
          } else {
            pushLog(`Specified file "${config.specificFilePath}" not found in tree. Falling back to all files.`, 'warning');
          }
        }

        setMetrics((prev) => ({ ...prev, totalScannedFiles: candidateTree.length }));

        // Select candidate file sequentially (round-robin)
        const target = candidateTree[fileIndexRef.current % candidateTree.length];
        fileIndexRef.current = (fileIndexRef.current + 1) % candidateTree.length;
        setActivePath(target.path);

        setStatus('FETCHING');
        pushLog(`Fetching source blob: ${target.path}...`, 'info');
        const fileData = await fetchFileContent(config.targetRepo, target.path, config.ghToken);

        setStatus('OPTIMIZING');
        pushLog(`Neural AST optimization in progress for [${target.path}]...`, 'neural', undefined, target.path);

        const result = await optimizeSourceCode(
          fileData.content,
          target.path,
          config.geminiKey,
          config.goal,
          config.model,
          config.isSandboxMode
        );

        const originalLines = fileData.content.split('\n').length;
        const optimizedLines = result.optimizedCode.split('\n').length;

        let commitSha = 'dry-run';

        if (!config.dryRun) {
          if (!config.ghToken) {
            throw new Error('GitHub PAT Token is required to commit changes to a real repository.');
          }

          setStatus('COMMITTING');
          pushLog(`Pushing sovereign commit for ${target.path}...`, 'info');
          const commitRes = await commitFileUpdate(
            config.targetRepo,
            target.path,
            result.optimizedCode,
            fileData.sha,
            config.ghToken,
            `EMG Core v49: Neural Optimization on ${target.path}`
          );
          commitSha = commitRes.commitSha;
        }

        // Record mutation
        const record: MutationRecord = {
          id: `mut-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          path: target.path,
          originalCode: fileData.content,
          optimizedCode: result.optimizedCode,
          originalLines,
          optimizedLines,
          latencyMs: result.latencyMs,
          commitSha,
          optimizationSummary: result.summary,
          status: config.dryRun ? 'dry-run' : 'applied',
        };

        setMutations((prev) => [record, ...prev]);
        recordLatency(result.latencyMs);

        // Update metrics
        setMetrics((prev) => {
          const newEnhancements = prev.enhancements + 1;
          const newTokens = prev.tokensProcessed + result.tokensEstimate;
          const newAvgLatency = prev.avgLatencyMs === 0
            ? result.latencyMs
            : Math.round((prev.avgLatencyMs * prev.enhancements + result.latencyMs) / newEnhancements);

          return {
            ...prev,
            enhancements: newEnhancements,
            tokensProcessed: newTokens,
            avgLatencyMs: newAvgLatency,
          };
        });

        pushLog(
          `Mutation success: ${target.path} (${result.latencyMs}ms) [${config.dryRun ? 'DRY-RUN' : commitSha.substring(0, 7)}]`,
          'success',
          result.latencyMs,
          target.path
        );
      }
    } catch (err: any) {
      const errMsg = err.message || 'Unknown optimization fault.';
      pushLog(`Engine Fault: ${errMsg}`, 'error');
      setMetrics((prev) => ({ ...prev, retries: prev.retries + 1 }));
      recordLatency(0);
      setStatus('ERROR');

      // Auto-pause continuous autonomous loop on rate limit / quota exhaustion / 503 capacity
      const isRateLimit =
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('rate limit') ||
        errMsg.toLowerCase().includes('429') ||
        errMsg.toLowerCase().includes('503') ||
        errMsg.toLowerCase().includes('unavailable') ||
        errMsg.toLowerCase().includes('capacity') ||
        errMsg.toLowerCase().includes('high demand') ||
        errMsg.toLowerCase().includes('resource_exhausted');

      if (isRateLimit && isLive) {
        setIsLive(false);
        pushLog(
          'Autonomous loop automatically paused to avoid quota exhaustion. Configure a custom Gemini API key in Engine Configuration or resume after rate limit window resets.',
          'warning'
        );
      }
    } finally {
      isCyclingRef.current = false;
      setIsCycling(false);
      setTimeout(() => {
        setStatus(isLive ? 'IDLE' : 'IDLE');
      }, 600);
    }
  }, [config, isLive, pushLog, recordLatency]);

  // Autonomous continuous cycle loop
  useEffect(() => {
    if (isLive) {
      // Run first cycle immediately if not cycling
      if (!isCyclingRef.current) {
        executeCycle();
      }

      const intervalMs = Math.max(3000, config.loopIntervalSec * 1000);
      loopTimerRef.current = setInterval(() => {
        if (!isCyclingRef.current) {
          executeCycle();
        }
      }, intervalMs);

      return () => {
        if (loopTimerRef.current) {
          clearInterval(loopTimerRef.current);
          loopTimerRef.current = null;
        }
      };
    } else {
      if (loopTimerRef.current) {
        clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    }
  }, [isLive, config.loopIntervalSec, executeCycle]);

  // Initial welcome event on initialization
  const handleInitializeSystem = () => {
    setIsAcknowledged(true);
    pushLog('EMG Core v49 Sovereign Engine initialized.', 'info');
    pushLog('Autonomous memory bus & telemetry systems online.', 'success');
  };

  // Toggle Live Autonomous loop
  const handleToggleLive = () => {
    if (!isLive) {
      setIsLive(true);
      pushLog('Engaging autonomous continuous mutation loop...', 'info');
    } else {
      setIsLive(false);
      setStatus('IDLE');
      pushLog('Engine terminated by user command.', 'warning');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  if (!isAcknowledged) {
    return (
      <>
        <SplashView
          onInitialize={handleInitializeSystem}
          onOpenLicense={() => setIsLicenseOpen(true)}
        />
        <LicenseModal
          isOpen={isLicenseOpen}
          onClose={() => setIsLicenseOpen(false)}
        />
      </>
    );
  }

  return (
    <div
      id="emg-app-root"
      className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-3 sm:p-4 md:p-6 flex flex-col gap-5 max-w-7xl mx-auto selection:bg-blue-600 selection:text-white"
    >
      {/* Header */}
      <Header
        isLive={isLive}
        status={status}
        targetRepo={config.targetRepo}
        isSandbox={config.isSandboxMode}
        onToggleLive={handleToggleLive}
        onRunSingleCycle={executeCycle}
        onOpenLicense={() => setIsLicenseOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        isCycling={isCycling}
      />

      {/* Stats Grid */}
      <StatsGrid
        metrics={metrics}
        isSandbox={config.isSandboxMode}
        hasGhToken={Boolean(config.ghToken && config.ghToken.length > 5)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Content Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 w-full">
          <ConfigPanel
            config={config}
            onChange={handleConfigChange}
            disabled={isLive}
          />
        </div>

        {/* Right Column: Neural Pulse Chart, Mutation History & Log Stream */}
        <div className="lg:col-span-8 flex flex-col gap-5 w-full">
          {/* Real-Time Neural Latency Chart */}
          <NeuralChart
            activePath={activePath}
            latencyHistory={latencyHistory}
            latestLatency={latestLatency}
          />

          {/* Mutation History & Diff Trigger */}
          <MutationViewer
            mutations={mutations}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
          />

          {/* Real-time Telemetry Event Stream */}
          <LogStream logs={logs} onClearLogs={handleClearLogs} />
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedRecord && (
        <DiffModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* License & Attribution Modal */}
      <LicenseModal
        isOpen={isLicenseOpen}
        onClose={() => setIsLicenseOpen(false)}
      />

      {/* System Diagnostics & Kernel Health Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Sovereign Footer */}
      <footer className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] py-4 border-t border-neutral-900 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>EMG CORE // v49 // SOVEREIGN ENGINE</span>
          <span>•</span>
          <span>CRAIGHCKBY @ 2026</span>
        </div>
        <button
          id="btn-footer-license"
          onClick={() => setIsLicenseOpen(true)}
          className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer underline underline-offset-4 decoration-blue-500/40 hover:decoration-blue-400"
        >
          CC BY-NC-SA 4.0 License
        </button>
      </footer>
    </div>
  );
}
