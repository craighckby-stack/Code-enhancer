# EMG Core v49

An AI-powered codebase optimization dashboard designed to connect to GitHub repositories, scan source files, and suggest AI-driven code refactoring and performance enhancements.

## Features

- **GitHub Integration**: Direct connection to your GitHub account using Personal Access Tokens (PAT). Fetches a dropdown of your accessible repositories.
- **AI Code Optimization**: Utilizes Google Gemini (`gemini-3.7-flash`, `gemini-3.6-flash`, and `gemini-3.1-pro-preview`) via the `@google/genai` SDK to process code files and suggest improvements.
- **Sandbox Mode**: Built-in simulated repositories (TypeScript, Python, Go) for offline testing without requiring GitHub credentials.
- **Optimization Directives**: Configurable prompts targeting:
  - Comprehensive improvements
  - High-Throughput Performance
  - Memory & Security Hardening
  - Strict Type Safety
  - Clean Architecture & Readability
- **Diff Inspector**: Unified diff viewer for reviewing code transformations before and after optimization.
- **Telemetry Dashboard**: UI for visualizing operation latency, processed files, and system status.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Vite middleware
- **AI**: `@google/genai`

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development

Run the full-stack dev server:

```bash
npm run dev
```

The application runs on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**.

Copyright (c) 2026 Craighckby.
