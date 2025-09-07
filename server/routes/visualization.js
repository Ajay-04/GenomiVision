const express = require('express');
const auth = require('../middleware/auth');
const Visualization = require('../models/Visualization');
const router = express.Router();

router.post('/save', auth, async (req, res) => {
  const { config } = req.body;
  try {
    const visualization = new Visualization({ userId: req.userId, config });
    await visualization.save();
    res.json({ message: 'Visualization saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const visualizations = await Visualization.find({ userId: req.userId });
    res.json(visualizations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;