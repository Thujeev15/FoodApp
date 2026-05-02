const express = require('express');
const router = express.Router();
const {
    createRiderReview,
    getAllRiderReviews,
    replyToRiderReview,
    deleteRiderReview,
} = require('../controllers/riderReviewController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/adminMiddleware');

router.post('/', protect, createRiderReview);
router.get('/', protect, admin, getAllRiderReviews);
router.put('/:id/reply', protect, admin, replyToRiderReview);
router.delete('/:id', protect, admin, deleteRiderReview);

module.exports = router;
