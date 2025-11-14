const express = require('express');
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Debug: Log the DATABASE_URL environment variable
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin with inline service account and databaseURL
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.DATABASE_URL,
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (err) {
  console.error('Firebase Admin SDK initialization error:', err.message);
  process.exit(1);
}

const db = admin.database(); // Use Realtime Database
const auth = admin.auth();

// Test Realtime Database connection with retry
const testDatabaseConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.ref('test/connection-test').set({ connected: true });
      console.log('Firebase Admin SDK initialized and Realtime Database connected');
      return;
    } catch (err) {
      console.error(`Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        console.error('All connection attempts failed. Exiting.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Run the connection test
testDatabaseConnection();

const app = express();

// Enable CORS for development origins (3000, 3001)
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

// Consistent CORS headers for all requests including preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Also use cors package for safety
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed from this origin: ' + origin));
  },
  credentials: true,
}));

// Parse JSON bodies with increased limit for large payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Middleware to verify session and Firebase user
const authenticateUser = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const userRecord = await auth.getUser(req.session.userId);
    if (!userRecord) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = userRecord;
    req.session.user = { email: userRecord.email }; // Store email in session
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.fasta', '.bed', '.vcf', '.gtf'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .fasta, .bed, .vcf, .gtf are allowed.'), false);
    }
  },
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
});

// Create uploads directory
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Register endpoint (updated)
app.post('/api/users/register', async (req, res) => {
  console.log('Register request:', req.body);
  try {
    const { name, email, idToken } = req.body;
    if (!name || !email || !idToken) {
      return res.status(400).json({ message: 'Name, email, and idToken are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }

    // Verify the idToken
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check if user already exists in the database
    const userSnapshot = await db.ref('users/' + uid).once('value');
    if (userSnapshot.exists()) {
      return res.status(400).json({ message: 'User already registered.' });
    }

    // Store user data in Realtime Database
    await db.ref('users/' + uid).set({
      name,
      email,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log('User registered:', uid);
    req.session.userId = uid;
    req.session.user = { email };
    res.json({ message: 'User registered successfully', user: { name, email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
});

// Login endpoint
app.post('/api/users/login', async (req, res) => {
  console.log('Login request:', req.body);
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required.' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    req.session.userId = decodedToken.uid;
    req.session.user = { email: decodedToken.email };

    const userSnapshot = await db.ref('users/' + decodedToken.uid).once('value');
    const userData = userSnapshot.exists() ? userSnapshot.val() : { name: '', email: decodedToken.email };

    res.json({ message: 'Login successful', user: { name: userData.name, email: userData.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Get user details endpoint (session-based)
app.get('/api/users/me', authenticateUser, async (req, res) => {
  try {
    const userSnapshot = await db.ref('users/' + req.session.userId).once('value');
    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User data not found.' });
    }

    const userData = userSnapshot.val();
    res.json({ name: userData.name, email: userData.email });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error fetching user details.' });
  }
});

// Logout endpoint
app.post('/api/users/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Server error during logout.' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// File upload endpoint (session-based)
app.post('/api/data/upload', upload.single('file'), authenticateUser, async (req, res) => {
  console.log('Upload request:', { file: req.file });
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fileData = {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadDate: admin.database.ServerValue.TIMESTAMP,
      userId: req.session.userId,
    };

    await db.ref('uploads').push(fileData);

    res.json({
      message: 'File uploaded successfully',
      file: fileData,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message || 'Server error during file upload.' });
  }
});

// Endpoint to save a visualization upload to Firebase (for WizardStep4)
app.post('/api/uploads', authenticateUser, async (req, res) => {
  try {
    const { image, format, chartType } = req.body;
    if (!image || !format) {
      return res.status(400).json({ message: 'Image and format are required.' });
    }

    const uploadData = {
      email: req.session.user.email,
      image,
      format,
      chartType: chartType || format, // Use chartType if provided, otherwise fallback to format
      timestamp: Date.now(),
    };

    const uploadsRef = db.ref('uploads');
    const newUploadRef = uploadsRef.push();
    await newUploadRef.set(uploadData);

    res.status(200).json({ message: 'Visualization saved successfully' });
  } catch (err) {
    console.error('Error saving visualization:', err);
    res.status(500).json({ message: 'Failed to save visualization' });
  }
});

// Get user statistics endpoint
app.get('/api/users/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userEmail = req.session.user.email;

    // Get visualization count from Firebase uploads (where visualizations are actually saved)
    let visualizationCount = 0;
    let historyCount = 0;
    let fileUploadCount = 0;
    
    try {
      const uploadsSnapshot = await db.ref('uploads').once('value');
      const uploadsData = uploadsSnapshot.val();

      if (uploadsData) {
        Object.values(uploadsData).forEach(upload => {
          // Count visualizations (uploads with image data)
          if (upload.email === userEmail && upload.image) {
            visualizationCount++;
          }
          // Count file uploads (uploads with userId)
          if (upload.userId === userId) {
            fileUploadCount++;
          }
        });
      }
      
      // History count is same as visualization count
      historyCount = visualizationCount;
      
    } catch (firebaseErr) {
      console.error('Firebase error:', firebaseErr);
      // Fallback to 0 if Firebase is not available
    }

    res.json({
      visualizationCount,
      fileUploadCount,
      historyCount
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get user's uploaded files endpoint
app.get('/api/users/files', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userFiles = [];
    
    try {
      const uploadsSnapshot = await db.ref('uploads').once('value');
      const uploadsData = uploadsSnapshot.val();

      if (uploadsData) {
        Object.entries(uploadsData).forEach(([key, upload]) => {
          // Get file uploads (uploads with userId and file data)
          if (upload.userId === userId && upload.filename && upload.path) {
            userFiles.push({
              id: key,
              filename: upload.filename,
              path: upload.path,
              size: upload.size,
              uploadDate: upload.uploadDate
            });
          }
        });
      }
      
      // Sort by upload date (newest first)
      userFiles.sort((a, b) => (b.uploadDate || 0) - (a.uploadDate || 0));
      
    } catch (firebaseErr) {
      console.error('Firebase error:', firebaseErr);
      return res.status(500).json({ message: 'Failed to fetch files from database' });
    }

    res.json({ files: userFiles });
  } catch (err) {
    console.error('Error fetching user files:', err);
    res.status(500).json({ message: 'Failed to fetch user files' });
  }
});

// Get specific file content endpoint
app.get('/api/users/files/:fileId/content', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.userId;
    const fileId = req.params.fileId;
    
    try {
      const fileSnapshot = await db.ref(`uploads/${fileId}`).once('value');
      const fileData = fileSnapshot.val();

      if (!fileData || fileData.userId !== userId) {
        return res.status(404).json({ message: 'File not found or access denied' });
      }

      // Read file content from disk
      const filePath = fileData.path;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ 
        content,
        filename: fileData.filename,
        size: fileData.size,
        uploadDate: fileData.uploadDate
      });
      
    } catch (firebaseErr) {
      console.error('Firebase error:', firebaseErr);
      return res.status(500).json({ message: 'Failed to fetch file from database' });
    }

  } catch (err) {
    console.error('Error fetching file content:', err);
    res.status(500).json({ message: 'Failed to fetch file content' });
  }
});

// Proxy Groq Chat Completions via server-side API key (more secure)
app.post('/api/groq/chat', authenticateUser, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.REACT_APP_GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Server GROQ_API_KEY is not configured.' });
    }

    const { messages, model = 'meta-llama/llama-4-scout-17b-16e-instruct', temperature = 0.7, max_tokens = 1024, top_p = 1 } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages array is required.' });
    }

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, top_p, stream: false }),
    });

    const data = await groqResp.json();
    if (!groqResp.ok) {
      return res.status(groqResp.status).json({ message: data?.error?.message || 'Groq API error', raw: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ message: 'Server error proxying Groq request.' });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});