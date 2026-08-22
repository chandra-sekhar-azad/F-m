const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'branchPricingData.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

if (data['branch-2']) {
  data['branch-2'].halls = [
    { id: 'prime', name: 'Prime Screen' },
    { id: 'private', name: 'Private Screen' }
  ];
  
  const oldPricing = data['branch-2'].pricing;
  
  const newPricing = {};
  for (const [service, prices] of Object.entries(oldPricing)) {
    // If it's already nested (unlikely), skip or handle
    if (prices['prime']) {
      newPricing[service] = prices;
      continue;
    }
    newPricing[service] = {
      prime: JSON.parse(JSON.stringify(prices)),
      private: JSON.parse(JSON.stringify(prices))
    };
  }
  
  data['branch-2'].pricing = newPricing;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log("Updated branchPricingData.json");
} else {
  console.error("branch-2 not found");
}
