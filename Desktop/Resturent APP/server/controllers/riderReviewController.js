const RiderReview = require('../models/RiderReview');

// @desc    Create rider review/complaint
// @route   POST /api/rider-reviews
// @access  Private
const createRiderReview = async (req, res) => {
    try {
        const { rider, order, rating, comment } = req.body;

        if (!rider || !order) {
            return res.status(400).json({ success: false, message: 'Rider and order are required' });
        }

        const existing = await RiderReview.findOne({ user: req.user._id, order });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You already reviewed this rider for this order' });
        }

        const review = await RiderReview.create({
            user: req.user._id,
            rider,
            order,
            rating,
            comment,
        });

        const populatedReview = await review.populate([
            { path: 'user', select: 'name avatar email' },
            { path: 'rider', select: 'name phone' },
            { path: 'order', select: '_id' },
        ]);

        // Notify admin of new rider complaint
        const io = req.app.get('io');
        io.to('admin').emit('newRiderReview', {
            message: `New rider review from ${req.user.name}`,
            review: populatedReview,
        });

        res.status(201).json({ success: true, message: 'Rider review submitted', data: populatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all rider reviews (admin)
// @route   GET /api/rider-reviews
// @access  Admin
const getAllRiderReviews = async (req, res) => {
    try {
        const reviews = await RiderReview.find()
            .populate('user', 'name avatar email')
            .populate('rider', 'name phone')
            .populate('order', '_id')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin reply to rider review
// @route   PUT /api/rider-reviews/:id/reply
// @access  Admin
const replyToRiderReview = async (req, res) => {
    try {
        const { adminReply } = req.body;

        const review = await RiderReview.findByIdAndUpdate(
            req.params.id,
            { adminReply, adminRepliedAt: Date.now() },
            { new: true }
        )
            .populate('user', 'name avatar email')
            .populate('rider', 'name phone')
            .populate('order', '_id');

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Notify customer of admin reply
        const io = req.app.get('io');
        io.to(review.user._id.toString()).emit('riderReviewReply', {
            message: 'Admin replied to your rider review',
            review,
        });

        res.json({ success: true, message: 'Reply added', data: review });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete rider review
// @route   DELETE /api/rider-reviews/:id
// @access  Admin
const deleteRiderReview = async (req, res) => {
    try {
        const review = await RiderReview.findByIdAndDelete(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, message: 'Rider review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createRiderReview,
    getAllRiderReviews,
    replyToRiderReview,
    deleteRiderReview,
};
