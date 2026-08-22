import { API_BASE } from "./api";

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  mapLink?: string;
  bookingsEnabled?: boolean;
  halls?: { id: string; name: string; bookingsEnabled?: boolean }[];
}

export interface CakeOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  offerPrice?: number;
  description: string;
  image?: string;
  quantity?: string;
  variants?: Array<{ quantity: string; price: number; offerPrice?: number }>;
}

export interface ExtraDecoration {
  id: string;
  name: string;
  price: number;
  offerPrice?: number;
  description: string;
  image?: string;
  video?: string;
}

export interface BookingData {
  branch: string;
  hall: string;       // hall within the branch (empty string = no hall selection needed)
  service: "private-theatre-party-hall" | "premium-pack" | "";
  date: string;
  duration: number;
  timeSlot: string;
  name: string;
  phone: string;
  membersCount: number;
  extraPersonsCharge: number;
  decorationRequired: boolean;
  occasion: string;
  customOccasion?: string;
  cakeRequired: boolean;
  selectedCake: CakeOption | null;
  extraDecorations: ExtraDecoration[];
  totalPrice: number;
  paymentStatus: "pending" | "paid";
}

// Default branches - will be overridden by API data
export let BRANCHES: Branch[] = [
  {
    id: "branch-1",
    name: "Friends & Memories - Eluru",
    address: "Mulpuri Nageswar Rao St, Eluru, Andhra Pradesh 534006",
    phone: "+91 99127 10932",
    mapLink: "https://maps.app.goo.gl/DqNPcNmWZH4KC9dd7",
  },
  {
    id: "branch-2",
    name: "Friends & Memories - Bhimavaram",
    address: "Behind Ampere showroom, opposite JBR Convention, Narasimhapuram, Kovvada, Bhimavaram, Andhra Pradesh 534202",
    phone: "+91 99127 10932",
    mapLink: "https://maps.app.goo.gl/hc31fqJaDx6Veqkv7",
    halls: [
      { id: "prime", name: "Prime Screen" },
      { id: "private", name: "Private Screen" }
    ]
  },
];

let branchesLastFetched = 0;
const BRANCH_CACHE_DURATION = 30000; // 30 seconds

// Function to fetch branches from API with cache busting
export const fetchBranches = async (forceRefresh = false): Promise<Branch[]> => {
  const now = Date.now();
  
  // Return cached data if fresh enough and not forced refresh
  if (!forceRefresh && branchesLastFetched && now - branchesLastFetched < BRANCH_CACHE_DURATION) {
    return BRANCHES;
  }
  
  try {
    // Add timestamp to bypass cache
    const response = await fetch(`${API_BASE}/branches?t=${now}`);
    if (response.ok) {
      const branches = await response.json();
      if (Array.isArray(branches)) {
        BRANCHES = branches;
        branchesLastFetched = now;
        return branches;
      }
    }
  } catch (error) {
    console.error('Failed to fetch branches:', error);
  }
  return BRANCHES;
};

export const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Proposal",
  "Baby Shower",
  "Farewell",
  "Get Together",
  "Date Night",
  "Other",
];

export const CAKE_OPTIONS: CakeOption[] = [
  { id: "cake-1", name: "Classic Chocolate Truffle", price: 799, offerPrice: 699, description: "Rich dark chocolate layers", image: "/placeholder.svg" },
  { id: "cake-2", name: "Red Velvet Dream", price: 899, offerPrice: 799, description: "Cream cheese frosted perfection", image: "/placeholder.svg" },
  { id: "cake-3", name: "Butterscotch Crunch", price: 749, offerPrice: 649, description: "Caramel & crunchy butterscotch", image: "/placeholder.svg" },
  { id: "cake-4", name: "Fresh Fruit Delight", price: 999, offerPrice: 849, description: "Seasonal fruits with cream", image: "/placeholder.svg" },
  { id: "cake-5", name: "Black Forest Premium", price: 849, offerPrice: 749, description: "Cherry-filled chocolate classic", image: "/placeholder.svg" },
];

export const EXTRA_DECORATIONS: ExtraDecoration[] = [
  { id: "extra-1", name: "Balloon Bouquet Setup", price: 1500, offerPrice: 1200, description: "100+ premium balloons" },
  { id: "extra-2", name: "LED Neon Sign", price: 800, offerPrice: 600, description: "Custom message neon display" },
  { id: "extra-3", name: "Photo Wall / Backdrop", price: 2000, offerPrice: 1700, description: "Instagram-worthy backdrop" },
  { id: "extra-4", name: "Fog Machine Effect", price: 500, offerPrice: 400, description: "Dramatic fog entrance" },
  { id: "extra-5", name: "Rose Petal Pathway", price: 1200, offerPrice: 999, description: "Romantic rose petal setup" },
  { id: "extra-6", name: "Confetti Cannon", price: 600, offerPrice: 450, description: "Party poppers & confetti" },
];

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  display: string;
}

export const TIME_SLOTS: Record<number, TimeSlot[]> = {
  1: [
    { id: "slot-1", start: "10:00 AM", end: "11:00 AM", display: "10:00 AM - 11:00 AM" },
    { id: "slot-2", start: "11:30 AM", end: "12:30 PM", display: "11:30 AM - 12:30 PM" },
    { id: "slot-3", start: "01:00 PM", end: "02:00 PM", display: "01:00 PM - 02:00 PM" },
    { id: "slot-4", start: "02:30 PM", end: "03:30 PM", display: "02:30 PM - 03:30 PM" },
    { id: "slot-5", start: "04:00 PM", end: "05:00 PM", display: "04:00 PM - 05:00 PM" },
    { id: "slot-6", start: "05:30 PM", end: "06:30 PM", display: "05:30 PM - 06:30 PM" },
    { id: "slot-7", start: "07:00 PM", end: "08:00 PM", display: "07:00 PM - 08:00 PM" },
    { id: "slot-8", start: "08:30 PM", end: "09:30 PM", display: "08:30 PM - 09:30 PM" },
    { id: "slot-9", start: "10:00 PM", end: "11:00 PM", display: "10:00 PM - 11:00 PM" },
  ],
  2: [
    { id: "slot-1", start: "10:00 AM", end: "12:00 PM", display: "10:00 AM - 12:00 PM" },
    { id: "slot-2", start: "12:30 PM", end: "02:30 PM", display: "12:30 PM - 02:30 PM" },
    { id: "slot-3", start: "03:00 PM", end: "05:00 PM", display: "03:00 PM - 05:00 PM" },
    { id: "slot-4", start: "05:30 PM", end: "07:30 PM", display: "05:30 PM - 07:30 PM" },
    { id: "slot-5", start: "08:00 PM", end: "10:00 PM", display: "08:00 PM - 10:00 PM" },
  ],
  3: [
    { id: "slot-1", start: "10:00 AM", end: "01:00 PM", display: "10:00 AM - 01:00 PM" },
    { id: "slot-2", start: "01:30 PM", end: "04:30 PM", display: "01:30 PM - 04:30 PM" },
    { id: "slot-3", start: "05:00 PM", end: "08:00 PM", display: "05:00 PM - 08:00 PM" },
    { id: "slot-4", start: "08:30 PM", end: "11:30 PM", display: "08:30 PM - 11:30 PM" },
  ],
};

export const BASE_PRICES: Record<string, Record<number, any>> = {
  "private-theatre-party-hall": { 
    1: { price: 1999, offerPrice: 1799 }, 
    2: { price: 3499, offerPrice: 2999 }, 
    3: { price: 4999, offerPrice: 3999 } 
  },
};

export const DECORATION_PRICE = 1500;

export const INITIAL_BOOKING: BookingData = {
  branch: "branch-1",
  hall: "",
  service: "private-theatre-party-hall",
  date: "",
  duration: 0,
  timeSlot: "",
  membersCount: 0,
  extraPersonsCharge: 0,
  name: "",
  phone: "",
  decorationRequired: true,
  occasion: "",
  cakeRequired: false,
  selectedCake: null,
  extraDecorations: [],
  totalPrice: 0,
  paymentStatus: "pending",
};
