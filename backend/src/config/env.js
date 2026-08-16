import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local dev (monorepo): .env is 3 levels up at the repo root (F&M/.env)
// Production (Hostinger): env vars are injected by the platform — dotenv is a no-op.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
