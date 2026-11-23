import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname is server/src/config -> serverRoot is server/
const serverRoot = path.resolve(__dirname, '../..');

const candidatePaths = [
  path.resolve(serverRoot, '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
];

let loadedPath = null;
for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedPath = envPath;
    break;
  }
}

if (!loadedPath) {
  dotenv.config();
}

export { loadedPath };

