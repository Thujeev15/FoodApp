require('dotenv').config();
const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Find promotions created in last 7 days but with validFrom in the future
    const promos = await Promotion.find({ createdAt: { $gte: sevenDaysAgo }, validFrom: { $gt: now } });
    if (!promos.length) {
      console.log('No recent future promotions found.');
      await mongoose.disconnect();
      return;
    }

    for (const p of promos) {
      console.log(`Updating promo ${p._id} (${p.title}) validFrom ${p.validFrom} -> ${now.toISOString()}`);
      p.validFrom = now;
      await p.save();
    }

    const updated = await Promotion.find({ _id: { $in: promos.map(p => p._id) } }).lean();
    console.log(JSON.stringify(updated, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
