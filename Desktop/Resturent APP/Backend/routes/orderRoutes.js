const express = require('express');
const router = express.Router();
const {
	createOrder,
	getMyOrders,
	getAllOrders,
	getOrder,
	updateOrderStatus,
	updateMyOrder,
	deleteMyOrder,
	deleteOrderAsAdmin,
	assignRider,
	getAvailableRiders,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { admin } = require('../middleware/adminMiddleware');

router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.get('/all', protect, admin, getAllOrders);
router.get('/riders/available', protect, admin, getAvailableRiders);
router.get('/:id', protect, getOrder);
router.put('/:id', protect, updateMyOrder);
router.delete('/:id', protect, deleteMyOrder);
router.delete('/:id/admin', protect, admin, deleteOrderAsAdmin);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.post('/:id/assign-rider', protect, admin, assignRider);

module.exports = router;
