import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const gymDist = path.join(root, 'dist/gym');
const trackedGymDist = path.join(root, 'dist-gym');
const stashRoot = path.join(tmpdir(), `albumvault-gym-${process.pid}`);
const gymStash = path.join(stashRoot, 'gym');

let exitCode = 0;
let beforeGymHash = null;

try {
  const gymSource = existsSync(gymDist) ? gymDist : (existsSync(trackedGymDist) ? trackedGymDist : null);
  if (gymSource) {
    beforeGymHash = await hashDirectory(gymSource);
    await mkdir(stashRoot, { recursive: true });
    await cp(gymSource, gymStash, { recursive: true });
  }

  exitCode = await run('tsc', ['--noEmit']);
  if (exitCode === 0) {
    exitCode = await runViteBuild();
  }
} catch (error) {
  console.error(error);
  exitCode = exitCode || 1;
} finally {
  try {
    await restoreGym();
  } catch (error) {
    console.error(error);
    exitCode = exitCode || 1;
  }
  await rm(stashRoot, { recursive: true, force: true });
}

process.exit(exitCode);

async function runViteBuild() {
  const injectedFailure = process.env.ALBUMVAULT_BUILD_PRESERVE_GYM_FAIL_VITE;
  if (injectedFailure) {
    return Number.parseInt(injectedFailure, 10) || 1;
  }
  return await run('vite', ['build']);
}

function run(command, args) {
  const executable = path.join(root, 'node_modules/.bin', command);
  return new Promise((resolve) => {
    const child = spawn(executable, args, { cwd: root, stdio: 'inherit' });
    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
    child.on('close', (code, signal) => {
      if (typeof code === 'number') {
        resolve(code);
        return;
      }
      resolve(signalExitCode(signal));
    });
  });
}

async function restoreGym() {
  if (!beforeGymHash) return;
  await mkdir(path.dirname(gymDist), { recursive: true });
  await rm(gymDist, { recursive: true, force: true });
  await cp(gymStash, gymDist, { recursive: true });
  const afterGymHash = await hashDirectory(gymDist);
  if (afterGymHash !== beforeGymHash) {
    throw new Error('dist/gym restore verification failed: restored bytes differ from the original gym snapshot.');
  }
}

function signalExitCode(signal) {
  if (!signal) return 1;
  const signals = { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGTERM: 15 };
  return 128 + (signals[signal] ?? 1);
}

async function hashDirectory(dir) {
  const hash = createHash('sha256');
  await hashDirectoryInto(hash, dir, dir);
  return hash.digest('hex');
}

async function hashDirectoryInto(hash, rootDir, dir) {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    if (entry.isDirectory()) {
      hash.update(`dir:${relativePath}\n`);
      await hashDirectoryInto(hash, rootDir, fullPath);
    } else if (entry.isFile()) {
      hash.update(`file:${relativePath}\n`);
      hash.update(await readFile(fullPath));
      hash.update('\n');
    }
  }
}
