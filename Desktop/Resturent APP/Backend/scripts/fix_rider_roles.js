/**
 * Script to update existing rider users to have role='rider'
 * Run this if you have existing rider accounts with role='customer'
 * 
 * Usage: node fix_rider_roles.js <rider_email>
 * Example: node fix_rider_roles.js john.rider@gmail.com
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const updateRiderRole = async (email, vehicleType = 'bike', vehicleNumber = '') => {
    try {
        const user = await User.findOneAndUpdate(
            { email },
            {
                role: 'rider',
                vehicleType: vehicleType || 'bike',
                vehicleNumber: vehicleNumber || '',
            },
            { new: true }
        );

        if (!user) {
            console.log(`❌ User not found: ${email}`);
            process.exit(1);
        }

        console.log(`✅ Updated user: ${email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Vehicle Type: ${user.vehicleType}`);
        console.log(`   - Vehicle Number: ${user.vehicleNumber}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

const main = async () => {
    const email = process.argv[2];

    if (!email) {
        console.log('❌ Please provide rider email address');
        console.log('Usage: node fix_rider_roles.js <rider_email> [vehicleType] [vehicleNumber]');
        console.log('Example: node fix_rider_roles.js john.rider@gmail.com bike ABC-2024');
        process.exit(1);
    }

    const vehicleType = process.argv[3] || 'bike';
    const vehicleNumber = process.argv[4] || '';

    await connectDB();
    await updateRiderRole(email, vehicleType, vehicleNumber);
};

main();
