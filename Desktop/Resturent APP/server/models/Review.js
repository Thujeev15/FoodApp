const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Food',
            required: true,
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: [true, 'Review comment is required'],
            trim: true,
        },
        adminReply: {
            type: String,
            default: '',
        },
        adminRepliedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// One review per user per food
reviewSchema.index({ user: 1, food: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
