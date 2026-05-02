require('dotenv').config();
const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const promos = await Promotion.find({}).lean();
    console.log(JSON.stringify(promos, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
