const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VEHICLE_TYPES = ['bike', 'car', 'cycle'];

const normalizeVehicleType = (value) => {
    if (value === undefined || value === null) return '';
    const normalized = value.toString().trim().toLowerCase();
    return VEHICLE_TYPES.includes(normalized) ? normalized : '';
};

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide your name'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please provide your email'],
            unique: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
        },
        phone: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            enum: ['customer', 'admin', 'rider'],
            default: 'customer',
        },
        avatar: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Rider specific fields
        vehicleType: {
            type: String,
            enum: [...VEHICLE_TYPES, ''],
            set: normalizeVehicleType,
            default: '',
        },
        vehicleNumber: {
            type: String,
            default: '',
        },
        licenseNumber: {
            type: String,
            default: '',
        },
        currentLocation: {
            latitude: {
                type: Number,
                default: null,
            },
            longitude: {
                type: Number,
                default: null,
            },
            updatedAt: {
                type: Date,
                default: null,
            },
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});


// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
