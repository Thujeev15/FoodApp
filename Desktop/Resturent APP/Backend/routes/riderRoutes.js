const express = require('express');
const {
    getRiderDashboard,
    getRiderOrders,
    acceptOrder,
    updateRiderLocation,
    deliverOrder,
    deleteRiderOrderHistory,
    toggleAvailability,
} = require('../controllers/riderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and rider role
router.use(protect);
router.use(authorize('rider'));

// Dashboard
router.get('/dashboard', getRiderDashboard);

// Orders
router.get('/orders', getRiderOrders);
router.post('/orders/:orderId/accept', acceptOrder);
router.post('/orders/:orderId/deliver', deliverOrder);
router.delete('/orders/:orderId', deleteRiderOrderHistory);

// Location tracking
router.post('/location', updateRiderLocation);

// Availability
router.post('/availability', toggleAvailability);

module.exports = router;
