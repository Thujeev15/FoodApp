const Promotion = require('../models/Promotion');

// @desc    Get all active promotions (filtered by customer if authenticated)
// @route   GET /api/promotions
// @access  Public (optional auth)
const getPromotions = async (req, res) => {
    try {
        const now = new Date();
        let query = {
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
        };

        // If user is authenticated, include both global promotions and user-targeted promotions
        // If not authenticated, show only global promotions (applicableCustomers empty)
        if (req.user) {
            query.$or = [
                { applicableCustomers: { $size: 0 } },
                { applicableCustomers: req.user._id },
            ];
        } else {
            query.applicableCustomers = { $size: 0 };
        }

        const promotions = await Promotion.find(query)
            .populate('applicableFoods', 'name image price')
            .populate('applicableCustomers', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: promotions.length, data: promotions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all promotions (admin - includes inactive)
// @route   GET /api/promotions/all
// @access  Admin
const getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find()
            .populate('applicableFoods', 'name image price')
            .populate('applicableCustomers', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: promotions.length, data: promotions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create promotion
// @route   POST /api/promotions
// @access  Admin
const createPromotion = async (req, res) => {
    try {
        const { title, description, discountPercentage, code, validFrom, validUntil, applicableFoods, applicableCustomers } = req.body;

        let image = '';
        if (req.file) {
            image = `/uploads/${req.file.filename}`;
        }

        // Normalize arrays if sent as JSON strings
        let foodsArr = applicableFoods || [];
        let customersArr = applicableCustomers || [];
        if (typeof foodsArr === 'string') {
            try { foodsArr = JSON.parse(foodsArr); } catch (e) { foodsArr = []; }
        }
        if (typeof customersArr === 'string') {
            try { customersArr = JSON.parse(customersArr); } catch (e) { customersArr = []; }
        }

        const promotion = await Promotion.create({
            title,
            description,
            image,
            discountPercentage,
            code: code || `LAGOON${Date.now()}`,
            validFrom,
            validUntil,
            applicableFoods: foodsArr,
            applicableCustomers: customersArr,
        });

        res.status(201).json({ success: true, message: 'Promotion created', data: promotion });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Promotion code already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
// @access  Admin
const updatePromotion = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        // Normalize arrays if sent as JSON strings
        if (updateData.applicableFoods && typeof updateData.applicableFoods === 'string') {
            try { updateData.applicableFoods = JSON.parse(updateData.applicableFoods); } catch (e) { updateData.applicableFoods = []; }
        }
        if (updateData.applicableCustomers && typeof updateData.applicableCustomers === 'string') {
            try { updateData.applicableCustomers = JSON.parse(updateData.applicableCustomers); } catch (e) { updateData.applicableCustomers = []; }
        }

        const promotion = await Promotion.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('applicableFoods', 'name image price').populate('applicableCustomers', 'name email');

        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Promotion not found' });
        }

        res.json({ success: true, message: 'Promotion updated', data: promotion });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
// @access  Admin
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Promotion not found' });
        }
        res.json({ success: true, message: 'Promotion deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getPromotions, getAllPromotions, createPromotion, updatePromotion, deletePromotion };
