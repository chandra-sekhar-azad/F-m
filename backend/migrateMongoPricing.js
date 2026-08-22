import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI_BRANCH2;

async function run() {
  const conn = await mongoose.createConnection(uri).asPromise();
  const catalogsCollection = conn.collection('catalogs');
  
  const doc = await catalogsCollection.findOne({ branch: 'branch-2' });
  if (doc && doc.pricing) {
    const oldPricing = doc.pricing;
    const newPricing = {};
    for (const [service, prices] of Object.entries(oldPricing)) {
      if (prices['prime']) {
        newPricing[service] = prices;
        continue;
      }
      newPricing[service] = {
        prime: JSON.parse(JSON.stringify(prices)),
        private: JSON.parse(JSON.stringify(prices))
      };
    }
    
    const result = await catalogsCollection.updateOne(
      { branch: 'branch-2' },
      { $set: { pricing: newPricing } }
    );
    console.log("Updated MongoDB pricing for branch-2:", result);
  } else {
    console.log("Document or pricing not found in Mongo");
  }
  await conn.close();
}

run().catch(console.error);
