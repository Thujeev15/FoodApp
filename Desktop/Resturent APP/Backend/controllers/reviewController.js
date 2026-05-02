const Review = require('../models/Review');
const Food = require('../models/Food');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
    try {
        const { food, rating, comment } = req.body;

        // Check if user already reviewed this food
        const existing = await Review.findOne({ user: req.user._id, food });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You already reviewed this item' });
        }

        const review = await Review.create({
            user: req.user._id,
            food,
            rating,
            comment,
        });

        // Update food rating
        const reviews = await Review.find({ food });
        const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        await Food.findByIdAndUpdate(food, { rating: avgRating.toFixed(1), numReviews: reviews.length });

        const populatedReview = await review.populate('user', 'name avatar');

        // Notify admin of new review
        const io = req.app.get('io');
        io.to('admin').emit('newReview', {
            message: `New review from ${req.user.name}`,
            review: populatedReview,
        });

        res.status(201).json({ success: true, message: 'Review submitted', data: populatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get reviews for a food item
// @route   GET /api/reviews/food/:id
// @access  Public
const getFoodReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ food: req.params.id })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all reviews (admin)
// @route   GET /api/reviews
// @access  Admin
const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name avatar email')
            .populate('food', 'name image')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin reply to review
// @route   PUT /api/reviews/:id/reply
// @access  Admin
const replyToReview = async (req, res) => {
    try {
        const { adminReply } = req.body;

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { adminReply, adminRepliedAt: Date.now() },
            { new: true }
        )
            .populate('user', 'name avatar')
            .populate('food', 'name image');

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Notify customer of admin reply
        const io = req.app.get('io');
        io.to(review.user._id.toString()).emit('reviewReply', {
            message: 'Admin replied to your review',
            review,
        });

        res.json({ success: true, message: 'Reply added', data: review });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Admin
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Recalculate food rating
        const reviews = await Review.find({ food: review.food });
        const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
        await Food.findByIdAndUpdate(review.food, { rating: avgRating.toFixed(1), numReviews: reviews.length });

        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createReview, getFoodReviews, getAllReviews, replyToReview, deleteReview };
