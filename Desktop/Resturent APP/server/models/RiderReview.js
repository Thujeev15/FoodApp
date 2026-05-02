const mongoose = require('mongoose');

const riderReviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
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
            required: [true, 'Complaint comment is required'],
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

// One rider complaint per user per order
riderReviewSchema.index({ user: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('RiderReview', riderReviewSchema);
