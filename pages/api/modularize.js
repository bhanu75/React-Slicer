// pages/api/modularize.js

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';
import { execSync } from 'child_process';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const rm = promisify(fs.rm);
const exists = fs.existsSync;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid code' });
  }

  const startTime = Date.now();

  try {
    // Step 1: Set up temp workspace
    const tempDir = path.join(os.tmpdir(), `modularizer-${Date.now()}`);
    const componentsDir = path.join(tempDir, 'components');
    await mkdir(tempDir, { recursive: true });
    await mkdir(componentsDir);

    // Step 2: Write App.jsx
    const appPath = path.join(tempDir, 'App.jsx');
    await writeFile(appPath, code, 'utf8');

    // Step 3: Copy modularizer.js into tempDir/lib
    const modularizerSource = path.join(process.cwd(), 'lib', 'modularize.js');
    const libDir = path.join(tempDir, 'lib');
    await mkdir(libDir);
    fs.copyFileSync(modularizerSource, path.join(libDir, 'modularize.js'));

    // Step 4: Run modularizer
    execSync(`node lib/modularize.js`, {
      cwd: tempDir,
      stdio: 'pipe',
    });

    // Step 5: Collect updated App.jsx
    const updatedAppCode = await readFile(appPath, 'utf8');

    // Step 6: Collect components
    const componentFilenames = await readdir(componentsDir);
    const components = await Promise.all(
      componentFilenames.map(async (filename) => {
        const code = await readFile(path.join(componentsDir, filename), 'utf8');
        return {
          name: filename.replace('.jsx', ''),
          filename,
          code,
        };
      })
    );

    // Step 7: Clean up (optional)
    await rm(tempDir, { recursive: true, force: true });

    const endTime = Date.now();

    // Step 8: Return result
    return res.status(200).json({
      updatedApp: updatedAppCode,
      components,
      processingTime: endTime - startTime,
    });
  } catch (err) {
    console.error('❌ Modularization failed:', err);
    return res.status(500).json({ error: 'Internal error during modularization' });
  }
}
