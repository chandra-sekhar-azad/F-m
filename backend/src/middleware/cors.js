  const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://friendsandmemories.in',
  'https://www.friendsandmemories.in',
];

export const corsOptions = {
  origin: (origin, callback) => {
    // Log the origin to help debugging
    if (origin) {
      console.log(`CORS request from origin: ${origin}`);
    }
    
    // Always allow for now to fix the blocking issue
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'X-Requested-With', 
    'X-HTTP-Method-Override', 
    'Origin'
  ],

  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

