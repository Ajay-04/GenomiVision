const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const DataFile = require('../models/DataFile');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const dataFile = new DataFile({
      userId: req.userId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      metadata: {}, // Add parsing logic here
    });
    await dataFile.save();
    res.json(dataFile);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;