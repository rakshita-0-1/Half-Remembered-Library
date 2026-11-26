import express from 'express';
import type { Request, Response } from 'express';
import { spawn, execFileSync } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const BACKEND_DIR = path.resolve(process.cwd(), 'LibrarySearchSystem', 'backend');
const BRIDGE_BIN = path.join(BACKEND_DIR, 'library_bridge');
const TESTS_BIN = path.join(BACKEND_DIR, 'run_tests');

function ensureCArtifactsCompiled(): void {
  if (!fs.existsSync(BRIDGE_BIN)) {
    execFileSync(
      'gcc',
      [
        '-std=c99',
        '-O2',
        '-Wall',
        '-Wextra',
        '-Werror',
        '-pedantic',
        '-DSERVER_BRIDGE',
        path.join(BACKEND_DIR, 'catalog.c'),
        path.join(BACKEND_DIR, 'trie.c'),
        path.join(BACKEND_DIR, 'main.c'),
        '-o',
        BRIDGE_BIN,
      ],
      { stdio: 'inherit' },
    );
  }
  if (!fs.existsSync(TESTS_BIN)) {
    execFileSync(
      'gcc',
      [
        '-std=c99',
        '-Wall',
        '-Wextra',
        '-Werror',
        '-pedantic',
        '-DTEST_MODE',
        path.join(BACKEND_DIR, 'catalog.c'),
        path.join(BACKEND_DIR, 'trie.c'),
        path.join(BACKEND_DIR, 'main.c'),
        path.join(BACKEND_DIR, 'tests.c'),
        '-o',
        TESTS_BIN,
      ],
      { stdio: 'inherit' },
    );
  }
}

class CBridgeClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pendingResolve: ((line: string) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;

  private startProcess(): void {
    ensureCArtifactsCompiled();
    const child = spawn(BRIDGE_BIN, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    const rl = readline.createInterface({ input: child.stdout });

    rl.on('line', (line) => {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      this.pendingReject = null;
      if (resolve) {
        resolve(line);
      }
    });

    child.on('exit', (code) => {
      const reject = this.pendingReject;
      this.pendingResolve = null;
      this.pendingReject = null;
      this.proc = null;
      if (reject) {
        reject(new Error(`C bridge process exited unexpectedly (code ${code ?? 'unknown'})`));
      }
    });

    child.on('error', (err) => {
      const reject = this.pendingReject;
      this.pendingResolve = null;
      this.pendingReject = null;
      this.proc = null;
      if (reject) {
        reject(err);
      }
    });

    this.proc = child;
  }

  public sendCommand(command: string): Promise<Record<string, unknown>> {
    const run = async (): Promise<Record<string, unknown>> => {
      if (!this.proc) {
        this.startProcess();
      }
      const proc = this.proc;
      if (!proc) {
        throw new Error('Failed to start C backend process.');
      }

      const rawLine = await new Promise<string>((resolve, reject) => {
        this.pendingResolve = resolve;
        this.pendingReject = reject;
        proc.stdin.write(`${command}\n`, 'utf8', (err) => {
          if (err) {
            this.pendingResolve = null;
            this.pendingReject = null;
            reject(err);
          }
        });
      });

      return JSON.parse(rawLine) as Record<string, unknown>;
    };

    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

function sanitizeLineInput(value: unknown, maxLen = 64): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (/[\r\n\t\0]/.test(value)) {
    return null;
  }
  return value.slice(0, maxLen);
}

async function createApp(): Promise<void> {
  ensureCArtifactsCompiled();
  const bridge = new CBridgeClient();

  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/state', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('STATE');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/catalog/demo', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('LOAD_DEMO');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/catalog/stress', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('LOAD_STRESS');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/catalog/clear', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('RESET');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/catalog/add', async (req: Request, res: Response) => {
    const title = sanitizeLineInput(req.body?.title, 64);
    if (title === null) {
      res.status(400).json({ ok: false, error: 'Title must be a single-line string without control characters.' });
      return;
    }
    try {
      const data = await bridge.sendCommand(`ADD\t${title}`);
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/index/build', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('BUILD');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/search', async (req: Request, res: Response) => {
    const prefix = sanitizeLineInput(req.body?.prefix, 64);
    const suffix = sanitizeLineInput(req.body?.suffix, 64);
    if (prefix === null || suffix === null) {
      res.status(400).json({ ok: false, error: 'Prefix and suffix must be valid strings without control characters.' });
      return;
    }
    try {
      const data = await bridge.sendCommand(`SEARCH\t${prefix}\t${suffix}`);
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/history/clear', async (_req: Request, res: Response) => {
    try {
      const data = await bridge.sendCommand('CLEAR_HISTORY');
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/api/tests/run', (_req: Request, res: Response) => {
    try {
      ensureCArtifactsCompiled();
      const output = execFileSync(TESTS_BIN, [], { encoding: 'utf8', timeout: 10000 });
      res.json({ ok: true, output });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.get('/api/download', (_req: Request, res: Response) => {
    try {
      const pyScript = [
        'import io, os, sys, zipfile',
        'root = os.getcwd()',
        'skip_dirs = {"node_modules", "dist", ".git", "build", "coverage"}',
        'skip_files = {"library_bridge", "library_cli", "run_tests", ".env"}',
        'buf = io.BytesIO()',
        'with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:',
        '    for dirpath, dirnames, filenames in os.walk(root):',
        '        dirnames[:] = [d for d in dirnames if d not in skip_dirs]',
        '        for name in filenames:',
        '            if name in skip_files or name.endswith(".log"):',
        '                continue',
        '            full = os.path.join(dirpath, name)',
        '            rel = os.path.relpath(full, root)',
        '            zf.write(full, os.path.join("half-remembered-library", rel))',
        'sys.stdout.buffer.write(buf.getvalue())',
      ].join('\n');

      const zipBuffer = execFileSync('python3', ['-c', pyScript], {
        cwd: process.cwd(),
        maxBuffer: 50 * 1024 * 1024,
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="half-remembered-library.zip"');
      res.send(zipBuffer);
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
