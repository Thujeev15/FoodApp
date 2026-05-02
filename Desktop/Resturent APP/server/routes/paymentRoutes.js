const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPaymentConfig, createStripeCheckoutSession, verifyStripeCheckoutSession } = require('../controllers/paymentController');

router.get('/config', getPaymentConfig);
router.post('/stripe/create-checkout-session', protect, createStripeCheckoutSession);
router.get('/stripe/verify/:sessionId', protect, verifyStripeCheckoutSession);

module.exports = router;