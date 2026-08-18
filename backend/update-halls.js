import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectToMongo, getBranchModels } from './src/config/mongo.js';

async function run() {
  try {
    await connectToMongo('branch-2', process.env.MONGODB_URI_BRANCH2);
    const models = getBranchModels('branch-2');
    if (models) {
      const res = await models.BranchCatalog.updateOne(
        { branch: 'branch-2' },
        { $set: { halls: [{ id: 'prime', name: 'Prime Screen' }, { id: 'private', name: 'Private Screen' }] } }
      );
      console.log('Updated in MongoDB:', res);
      process.exit(0);
    } else {
      console.log('No models found');
      process.exit(1);
    }
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
