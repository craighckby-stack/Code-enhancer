/**
 * DARLEK CANN ARCHITECTURAL HEADER
 * File: server.ts
 * Role: Core system component participating in autonomous cognitive evolution cycles.
 * Architecture: Type-safe modular unit with resilient state interfaces.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { validateEnv } from './lib/env-validator';

dotenv.config();

// Run startup diagnostic health check via lib/env-validator
const envValidation = validateEnv();
if (!envValidation.valid) {
  console.warn(`[DIAGNOSTIC] Missing environment configuration variables: ${envValidation.missing.join(', ')}`);
} else {
  console.log(`[DIAGNOSTIC] Environment validation succeeded. Kernel initialized in ${process.env.NODE_ENV || 'development'} mode.`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Diagnostic health endpoint
  app.get('/api/diagnostic', (_req, res) => {
    const check = validateEnv();
    res.json({
      kernel: 'EMG Core v49',
      status: check.valid ? 'HEALTHY' : 'DEGRADED',
      missing: check.missing,
      nodeEnv: process.env.NODE_ENV || 'development',
      debugMode: process.env.DEBUG_MODE === 'true',
      memoryPath: process.env.MEMORY_PATH || './memory',
      timestamp: new Date().toISOString(),
    });
  });

  // Check API status and environment injection
  app.get('/api/status', (_req, res) => {
    const serverKey = process.env.GEMINI_API_KEY;
    const hasServerKey = Boolean(serverKey && serverKey.trim().length > 0 && serverKey !== 'MY_GEMINI_API_KEY');

    res.json({
      status: 'ok',
      hasServerGeminiKey: hasServerKey,
      autoInjected: hasServerKey,
      defaultModel: 'gemini-3.7-flash',
      supportedModels: [
        { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (Default, State-of-the-Art)', description: 'Ultra-fast & cutting-edge code synthesis' },
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', description: 'Fast, high efficiency neural generation' },
        { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Deep Complex Reasoning)', description: 'Maximum reasoning depth for complex ASTs' },
      ],
    });
  });

  // GitHub user repositories proxy
  app.post('/api/github/user-repos', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'GitHub Token is required.' });
      }
      const response = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token.trim()}`,
            'User-Agent': 'EMG-Sovereign-Engine',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch repositories' });
    }
  });

  // GitHub repo details proxy
  app.post('/api/github/repo-details', async (req, res) => {
    try {
      const { repo, token } = req.body;
      if (!repo) {
        return res.status(400).json({ error: 'Repository name is required.' });
      }
      const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EMG-Sovereign-Engine',
      };
      if (token && typeof token === 'string' && token.trim()) {
        headers.Authorization = `Bearer ${token.trim()}`;
      }

      const response = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch repository details' });
    }
  });

  // GitHub repo file tree proxy
  app.post('/api/github/repo-tree', async (req, res) => {
    try {
      const { repo, branch, token } = req.body;
      if (!repo) {
        return res.status(400).json({ error: 'Repository name is required.' });
      }
      const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      const targetBranch = branch || 'main';
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EMG-Sovereign-Engine',
      };
      if (token && typeof token === 'string' && token.trim()) {
        headers.Authorization = `Bearer ${token.trim()}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${cleanRepo}/git/trees/${targetBranch}?recursive=1`,
        { headers }
      );
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch repository tree' });
    }
  });

  // GitHub file content proxy
  app.post('/api/github/file-content', async (req, res) => {
    try {
      const { repo, filePath, token } = req.body;
      if (!repo || !filePath) {
        return res.status(400).json({ error: 'Repository and filePath are required.' });
      }
      const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EMG-Sovereign-Engine',
      };
      if (token && typeof token === 'string' && token.trim()) {
        headers.Authorization = `Bearer ${token.trim()}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`,
        { headers }
      );
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch file content' });
    }
  });

  // GitHub commit file proxy
  app.post('/api/github/commit-file', async (req, res) => {
    try {
      const { repo, filePath, content, sha, token, commitMessage } = req.body;
      if (!repo || !filePath || !token) {
        return res.status(400).json({ error: 'Repository, filePath, and token are required for commit.' });
      }
      const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'EMG-Sovereign-Engine',
      };

      const response = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: commitMessage || `EMG Core: Update ${filePath}`,
            content,
            sha,
          }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub commit error (${response.status}): ${errorText}`,
        });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to commit file update' });
    }
  });

  // Optimize endpoint using @google/genai
  app.post('/api/optimize', async (req, res) => {
    try {
      const { code, filePath, customApiKey, goal, model } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing source code to optimize.' });
      }

      const apiKey = (customApiKey && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : process.env.GEMINI_API_KEY?.trim();

      // Map any deprecated model names seamlessly
      let targetModel = model || 'gemini-3.7-flash';
      if (targetModel === 'gemini-2.5-flash' || targetModel === 'gemini-2.0-flash' || targetModel === 'gemini-1.5-flash') {
        targetModel = 'gemini-3.6-flash';
      }

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          error: 'No Gemini API key detected. Please configure GEMINI_API_KEY in Secrets or provide a key in the settings panel.',
          needsKey: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const isMarkdown = Boolean(
        filePath &&
        (/\.(md|markdown|mdx|txt)$/i.test(filePath) || /readme(\.|$)/i.test(filePath))
      );

      const codeDirectives: Record<string, string> = {
        performance: 'Focus heavily on execution speed, memory footprint reduction, caching, avoiding unnecessary allocations, loop unrolling where sensible, and data structure efficiency.',
        security: 'Focus on defensive input validation, eliminating potential injection/overflow vulnerabilities, volatile memory safety, and strict bounds checking.',
        'type-safety': 'Focus on exhaustive TypeScript types, eliminating "any", strict generic constraints, narrowing, and robust runtime contracts.',
        readability: 'Focus on pristine modern idioms, descriptive naming, modular decomposition, and clean architectural clarity.',
        comprehensive: 'Perform a comprehensive sovereign overhaul: optimize performance, maximize type-safety, enhance memory efficiency, and ensure robust error handling.',
      };

      const markdownDirectives: Record<string, string> = {
        performance: 'Enhance structure with skimmable executive summaries, streamlined tables of contents, and concise section breakdowns.',
        security: 'Ensure security guidelines, disclosure sections, vulnerability reporting instructions, and best practice warnings are clearly formatted.',
        'type-safety': 'Ensure all code snippets within the document have explicit language tags, correct type signatures in examples, and clean markdown block formatting.',
        readability: 'Improve prose clarity, eliminate ambiguity, standardize markdown heading hierarchy, fix spelling/grammar, and align tables.',
        comprehensive: 'Perform a comprehensive documentation overhaul: polish prose, fix formatting/grammar, standardize headings, and ensure all code snippets are properly annotated.',
      };

      const directive = isMarkdown
        ? (markdownDirectives[goal] || markdownDirectives['comprehensive'])
        : (codeDirectives[goal] || codeDirectives['comprehensive']);

      const prompt = `You are EMG Core v49 Neural Code and Documentation Optimizer Engine.
File Path: "${filePath || (isMarkdown ? 'README.md' : 'source.ts')}"
Optimization Goal: ${(goal || 'comprehensive').toUpperCase()} - ${directive}

Original ${isMarkdown ? 'Markdown Document' : 'Source Code'}:
\`\`\`
${code}
\`\`\`

Instructions:
1. Optimize, modernize, and enhance this ${isMarkdown ? 'markdown document' : 'code'} strictly according to the goal.
2. ${isMarkdown ? 'Preserve all essential links, factual information, and structure while improving clarity, formatting, and completeness.' : 'Maintain all business logic, export names, and external API contracts intact.'}
3. Output ONLY the optimized ${isMarkdown ? 'markdown content' : 'source code'} between delimiters @@@START and @@@END.
4. Output a 1-sentence summary of enhancements immediately after @@@SUMMARY:`;

      const startTime = performance.now();

      // List of candidate models to try with robust fallbacks
      const candidateModels = [
        targetModel,
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-flash-lite-latest',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-3.1-pro-preview',
      ].filter((m, idx, arr) => arr.indexOf(m) === idx);

      let response: any = null;
      let lastErr: any = null;
      let usedModel = targetModel;

      for (const m of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          });
          usedModel = m;
          break;
        } catch (err: any) {
          lastErr = err;
          // If model has error (rate-limit, not found, or 503), try the next candidate model
          continue;
        }
      }

      if (!response) {
        const rawErrMsg = String(lastErr?.message || lastErr || '');
        const isCapacityOrRateLimit =
          rawErrMsg.includes('429') ||
          rawErrMsg.includes('503') ||
          rawErrMsg.includes('UNAVAILABLE') ||
          rawErrMsg.includes('RESOURCE_EXHAUSTED') ||
          rawErrMsg.includes('Quota exceeded') ||
          rawErrMsg.includes('rate-limits') ||
          rawErrMsg.includes('high demand');

        if (isCapacityOrRateLimit) {
          // Extract retry delay if available in the error message
          let retryDelay = '';
          const match = rawErrMsg.match(/retry in\s+([0-9.]+)s/i);
          if (match && match[1]) {
            retryDelay = ` (retry in ~${Math.ceil(parseFloat(match[1]))}s)`;
          }

          return res.status(429).json({
            error: `Gemini API model capacity / high demand reached${retryDelay}. The loop has been auto-paused. Please wait a moment or switch models.`,
            isRateLimit: true,
            raw: rawErrMsg,
          });
        }

        throw lastErr || new Error('All model candidates are currently experiencing high demand.');
      }

      const rawText = response.text || '';
      let optimized = '';
      let summary = isMarkdown
        ? 'Enhanced documentation structure, standard headings, and language tags.'
        : 'Applied neural performance and architecture optimizations.';

      if (rawText.includes('@@@START') && rawText.includes('@@@END')) {
        optimized = rawText.split('@@@START')[1].split('@@@END')[0].trim();
      } else {
        let cleaned = rawText.trim();
        // Only strip wrapping markdown code fences if wrapped at the root
        if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
          cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        optimized = cleaned;
      }

      if (rawText.includes('@@@SUMMARY:')) {
        const summaryPart = rawText.split('@@@SUMMARY:')[1].trim().split('\n')[0];
        if (summaryPart) {
          summary = summaryPart;
        }
      }

      // If summary is accidentally inside optimized code, clean it
      if (optimized.includes('@@@SUMMARY:')) {
        optimized = optimized.split('@@@SUMMARY:')[0].trim();
      }

      if (!optimized || optimized.length < 5) {
        throw new Error('AI Model returned an empty code block.');
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const tokensEstimate = response.usageMetadata?.totalTokenCount || Math.round(rawText.length / 3.8);

      return res.json({
        optimizedCode: optimized,
        summary,
        latencyMs,
        tokensEstimate,
        modelUsed: usedModel,
      });
    } catch (err: any) {
      console.error('Gemini Optimization Error:', err);
      const errMsg = err?.message || String(err) || 'Failed to run neural code optimization';
      return res.status(500).json({ error: errMsg });
    }
  });

  // Explicit 404 handler for API routes to prevent Vite from returning index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMG Core Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
