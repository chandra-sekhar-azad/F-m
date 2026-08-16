export const defaultCakes = [
  { id: 'cake-1', name: 'Classic Chocolate Truffle', price: 799, description: 'Rich dark chocolate layers' },
  { id: 'cake-2', name: 'Red Velvet Dream', price: 899, description: 'Cream cheese frosted perfection' },
  { id: 'cake-3', name: 'Butterscotch Crunch', price: 749, description: 'Caramel & crunchy butterscotch' },
  { id: 'cake-4', name: 'Fresh Fruit Delight', price: 999, description: 'Seasonal fruits with cream' },
  { id: 'cake-5', name: 'Black Forest Premium', price: 849, description: 'Cherry-filled chocolate classic' },
];

export const defaultDecorations = [
  { id: 'extra-1', name: 'Balloon Bouquet Setup', price: 1500, description: '100+ premium balloons' },
  { id: 'extra-2', name: 'LED Neon Sign', price: 800, description: 'Custom message neon display' },
  { id: 'extra-3', name: 'Photo Wall / Backdrop', price: 2000, description: 'Instagram-worthy backdrop' },
  { id: 'extra-4', name: 'Fog Machine Effect', price: 500, description: 'Dramatic fog entrance' },
  { id: 'extra-5', name: 'Rose Petal Pathway', price: 1200, description: 'Romantic rose petal setup' },
  { id: 'extra-6', name: 'Confetti Cannon', price: 600, description: 'Party poppers & confetti' },
];

export const defaultPricing = {
  'private-theatre-party-hall': {
    1: { price: 1500, offerPrice: 1300 },
    2: { price: 2500, offerPrice: 2000 },
    3: { price: 5000, offerPrice: 3999 },
    4: { price: 6500, offerPrice: 5499 }
  },
  'premium-pack': {
    1: { price: 4500, offerPrice: 3999 },
    2: { price: 5500, offerPrice: 4999 },
    3: { price: 7500, offerPrice: 5999 },
    4: { price: 9000, offerPrice: 7499 }
  }
};

export const globalDb = {
  branches: [
    {
      id: 'branch-1',
      name: 'Friends & Memories - Eluru',
      address: 'Mulpuri Nageswar Rao St, Eluru, Andhra Pradesh 534006',
      phone: '+91 99127 10932',
      mapLink: 'https://maps.app.goo.gl/DqNPcNmWZH4KC9dd7',
      capacity: 100,
      amenities: ['AC', 'Sound System', 'Projector'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'branch-2',
      name: 'Friends & Memories - Bhimavaram',
      address: '4-Masid St, Narasimhapuram, Kovvada, Bhimavaram, Andhra Pradesh 534202',
      phone: '+91 99127 10933',
      mapLink: 'https://maps.app.goo.gl/hc31fqJaDx6Veqkv7',
      capacity: 80,
      amenities: ['AC', 'Sound System', '4K Screen'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  services: [
    { id: 'private-theatre-party-hall', name: 'Private Theatre + Party Hall', description: 'Experience the best of both: Private Theatre and Party Hall' },
    { id: 'premium-pack', name: 'Premium Pack', description: 'Fog entry • Photos • Cake • Theatre • Decoration' },
  ],
  cakes: defaultCakes,
  decorations: defaultDecorations,
  occasions: ['Birthday', 'Anniversary', 'Proposal', 'Baby Shower', 'Farewell', 'Get Together', 'Date Night', 'Other'],
  pricing: defaultPricing,
  decorationPrice: 1500,
  heroImages: [],
  socialLinks: { instagram: "https://instagram.com/friends_and_memories_elr", facebook: "https://facebook.com", whatsapp: "" }
};

export const branchDbs = {
  'branch-1': { bookings: [], timeSlots: [] },
  'branch-2': { bookings: [], timeSlots: [] },
};

export const createBranchPricingDb = (branchId) => {
  const branchInfo = branchId ? globalDb.branches.find(b => b.id === branchId) : null;
  return {
    branchId: branchId,
    name: branchInfo?.name,
    address: branchInfo?.address,
    phone: branchInfo?.phone,
    mapLink: branchInfo?.mapLink,
    halls: [],  // branches with multiple halls set this; empty = single hall
    cakes: JSON.parse(JSON.stringify(defaultCakes.map(c => ({ ...c, quantity: '1kg' })))),
    decorations: JSON.parse(JSON.stringify(defaultDecorations)),
    pricing: JSON.parse(JSON.stringify(defaultPricing)),
    decorationPrice: 1500,
    testimonials: [],
    heroImages: [],
    branchVideos: [],
    galleryVideos: [],
    socialLinks: { instagram: "https://instagram.com/friends_and_memories_elr", facebook: "https://facebook.com", whatsapp: "" },
    bookingsEnabled: true, // default open
  };
};

export const branchPricingDbs = {
  'branch-1': createBranchPricingDb(),
  'branch-2': createBranchPricingDb(),
};

export const cloneBranchPricingDb = (data = {}) => ({
  name: data.name,
  address: data.address,
  phone: data.phone,
  mapLink: data.mapLink,
  halls: JSON.parse(JSON.stringify(data.halls || [])),
  cakes: JSON.parse(JSON.stringify(data.cakes || defaultCakes.map(c => ({ ...c, quantity: '1kg' })))),
  decorations: JSON.parse(JSON.stringify(data.decorations || defaultDecorations)),
  pricing: JSON.parse(JSON.stringify(data.pricing || defaultPricing)),
  decorationPrice: data.decorationPrice ?? 1500,
  testimonials: JSON.parse(JSON.stringify(data.testimonials || [])),
  heroImages: JSON.parse(JSON.stringify(data.heroImages || [])),
  branchVideos: JSON.parse(JSON.stringify(data.branchVideos || [])),
  galleryVideos: JSON.parse(JSON.stringify(data.galleryVideos || [])),
  socialLinks: JSON.parse(JSON.stringify(data.socialLinks || { instagram: "https://instagram.com/friends_and_memories_elr", facebook: "https://facebook.com", whatsapp: "" })),
  bookingsEnabled: data.bookingsEnabled !== false, // preserve false explicitly; default true
});
