const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Food = require('../models/Food');
const User = require('../models/User');

dotenv.config();

const users = [
    {
        name: 'Admin User',
        email: 'admin@lagoonbites.com',
        password: 'password123',
        phone: '0770000001',
        address: 'Lagoon Bites HQ',
        role: 'admin',
    },
    {
        name: 'Customer User',
        email: 'customer@lagoonbites.com',
        password: 'password123',
        phone: '0770000002',
        address: 'Colombo',
        role: 'customer',
    },
    {
        name: 'Rider User',
        email: 'rider@lagoonbites.com',
        password: 'password123',
        phone: '0770000003',
        address: 'Colombo',
        role: 'rider',
        vehicleType: 'bike',
        vehicleNumber: 'WP-AB-1234',
        licenseNumber: 'B1234567',
    },
];

const categories = [
    {
        name: 'Rice & Curry',
        description: 'Sri Lankan comfort plates with fragrant rice and rich curries.',
    },
    {
        name: 'Kottu',
        description: 'Chopped roti tossed on the griddle with spices and fillings.',
    },
    {
        name: 'Seafood',
        description: 'Coastal favorites with prawns, fish, and crab.',
    },
    {
        name: 'Vegetarian',
        description: 'Plant-forward dishes packed with spice and texture.',
    },
    {
        name: 'Desserts',
        description: 'Sweet Sri Lankan finishes.',
    },
];

const foods = [
    {
        name: 'Chicken Rice & Curry',
        description: 'Steamed rice served with chicken curry, dhal, mallung, and sambol.',
        price: 1450,
        category: 'Rice & Curry',
        spiceLevel: 'medium',
        isVegetarian: false,
        preparationTime: 25,
        ingredients: ['rice', 'chicken', 'dhal', 'coconut sambol'],
        image: '/uploads/1777648025576-881511879.jpg',
    },
    {
        name: 'Cheese Chicken Kottu',
        description: 'Chopped godamba roti with chicken, vegetables, egg, and melted cheese.',
        price: 1650,
        category: 'Kottu',
        spiceLevel: 'hot',
        isVegetarian: false,
        preparationTime: 20,
        ingredients: ['godamba roti', 'chicken', 'cheese', 'egg'],
        image: '/uploads/1777648307709-187219929.jpg',
    },
    {
        name: 'Devilled Prawns',
        description: 'Wok-tossed prawns with onions, peppers, tomato, and chili sauce.',
        price: 1950,
        category: 'Seafood',
        spiceLevel: 'hot',
        isVegetarian: false,
        preparationTime: 22,
        ingredients: ['prawns', 'onion', 'capsicum', 'chili sauce'],
        image: '/uploads/1777648372356-571995897.jpg',
    },
    {
        name: 'Vegetable Kottu',
        description: 'Crispy chopped roti with vegetables, curry gravy, and herbs.',
        price: 1150,
        category: 'Vegetarian',
        spiceLevel: 'medium',
        isVegetarian: true,
        preparationTime: 18,
        ingredients: ['godamba roti', 'carrot', 'leek', 'cabbage'],
        image: '/uploads/1777648413519-345688450.jpg',
    },
    {
        name: 'Fish Ambul Thiyal',
        description: 'Sour and spicy southern-style fish curry with goraka and black pepper.',
        price: 1750,
        category: 'Seafood',
        spiceLevel: 'extra-hot',
        isVegetarian: false,
        preparationTime: 28,
        ingredients: ['fish', 'goraka', 'pepper', 'curry leaves'],
        image: '/uploads/1777648452228-370566795.jpg',
    },
    {
        name: 'Watalappan',
        description: 'Steamed coconut custard with jaggery, cardamom, and cashews.',
        price: 650,
        category: 'Desserts',
        spiceLevel: 'mild',
        isVegetarian: true,
        preparationTime: 10,
        ingredients: ['coconut milk', 'jaggery', 'egg', 'cashew'],
        image: '/uploads/1777648497778-769898625.jpg',
    },
];

const upsertUser = async (userData) => {
    const user = await User.findOne({ email: userData.email });
    if (user) {
        Object.assign(user, { ...userData, isActive: true });
        await user.save();
        return user;
    }

    return User.create({ ...userData, isActive: true });
};

const seed = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const savedCategories = {};
    for (const categoryData of categories) {
        const category = await Category.findOneAndUpdate(
            { name: categoryData.name },
            { ...categoryData, isActive: true },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        savedCategories[category.name] = category;
    }

    for (const foodData of foods) {
        const { category, ...rest } = foodData;
        await Food.findOneAndUpdate(
            { name: foodData.name },
            { ...rest, category: savedCategories[category]._id, isAvailable: true },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    for (const userData of users) {
        await upsertUser(userData);
    }

    const counts = {
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        foods: await Food.countDocuments(),
    };

    console.log('Demo data ready:', counts);
    console.log('Login accounts:');
    console.log('  admin@lagoonbites.com / password123');
    console.log('  customer@lagoonbites.com / password123');
    console.log('  rider@lagoonbites.com / password123');
};

seed()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
