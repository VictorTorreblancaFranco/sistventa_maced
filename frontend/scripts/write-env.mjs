import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const apiUrl = process.env.API_URL || 'http://localhost:2080/api';
const target = join(root, 'public', 'env.js');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `window.__env = {\n  apiUrl: ${JSON.stringify(apiUrl)}\n};\n`);
