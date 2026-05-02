const User = require('../models/User');

const allowedVehicleTypes = new Set(['bike', 'car', 'cycle', '']);

const normalizeVehicleType = (value) => {
    if (value === undefined || value === null) return undefined;
    return value.toString().trim().toLowerCase();
};

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single user (admin)
// @route   GET /api/users/:id
// @access  Admin
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user role/status (admin)
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = async (req, res) => {
    try {
        const { role, isActive } = req.body;
        const updateData = {};
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User updated', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user (admin)
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all riders (admin)
// @route   GET /api/users/riders/all
// @access  Admin
const getRiders = async (req, res) => {
    try {
        const riders = await User.find({ role: 'rider' }).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, count: riders.length, data: riders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create rider (admin)
// @route   POST /api/users/riders/create
// @access  Admin
const createRider = async (req, res) => {
    try {
        const { name, email, password, phone, vehicleType, vehicleNumber, licenseNumber } = req.body;

        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and phone are required' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const normalizedVehicleType = normalizeVehicleType(vehicleType) ?? '';
        if (!allowedVehicleTypes.has(normalizedVehicleType)) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle type must be one of: bike, car, cycle',
            });
        }

        // Create rider
        const rider = await User.create({
            name,
            email,
            password,
            phone,
            role: 'rider',
            vehicleType: normalizedVehicleType,
            vehicleNumber: vehicleNumber || '',
            licenseNumber: licenseNumber || '',
            isActive: true,
            isAvailable: true,
        });

        const riderData = rider.toObject();
        delete riderData.password;

        res.status(201).json({
            success: true,
            message: 'Rider created successfully',
            data: riderData,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update rider info (admin)
// @route   PUT /api/users/riders/:id
// @access  Admin
const updateRider = async (req, res) => {
    try {
        const { name, phone, vehicleType, vehicleNumber, licenseNumber, isActive, isAvailable } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (vehicleType !== undefined) {
            const normalizedVehicleType = normalizeVehicleType(vehicleType) ?? '';
            if (!allowedVehicleTypes.has(normalizedVehicleType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vehicle type must be one of: bike, car, cycle',
                });
            }
            updateData.vehicleType = normalizedVehicleType;
        }
        if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
        if (licenseNumber) updateData.licenseNumber = licenseNumber;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

        const rider = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!rider) {
            return res.status(404).json({ success: false, message: 'Rider not found' });
        }

        res.json({ success: true, message: 'Rider updated', data: rider });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete rider (admin)
// @route   DELETE /api/users/riders/:id
// @access  Admin
const deleteRider = async (req, res) => {
    try {
        const rider = await User.findByIdAndDelete(req.params.id);
        if (!rider) {
            return res.status(404).json({ success: false, message: 'Rider not found' });
        }
        res.json({ success: true, message: 'Rider deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getUsers, getUser, updateUser, deleteUser, getRiders, createRider, updateRider, deleteRider };
