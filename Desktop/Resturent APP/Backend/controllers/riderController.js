const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get all pending and assigned orders for rider dashboard
// @route   GET /api/riders/dashboard
// @access  Private (Rider)
const getRiderDashboard = async (req, res) => {
    try {
        const riderId = req.user._id;

        // Get assigned orders that are not delivered
        const assignedOrders = await Order.find({
            rider: riderId,
            status: { $in: ['ready', 'in-transit'] },
        })
            .populate('user', 'name email phone address')
            .populate('items.food', 'name image price')
            .sort({ riderAssignedAt: 1 });

        // Get available orders (ready for pickup)
        const availableOrders = await Order.find({
            rider: null,
            status: 'ready',
        })
            .populate('user', 'name email phone address')
            .populate('items.food', 'name image price')
            .sort({ createdAt: -1 });

        // Get completed deliveries today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deliveredToday = await Order.find({
            rider: riderId,
            status: 'delivered',
            deliveredAt: { $gte: today },
        }).countDocuments();

        res.json({
            success: true,
            data: {
                assignedOrders,
                availableOrders,
                deliveredToday,
                riderInfo: {
                    name: req.user.name,
                    phone: req.user.phone,
                    vehicleType: req.user.vehicleType,
                    isAvailable: req.user.isAvailable,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get rider's assigned orders
// @route   GET /api/riders/orders
// @access  Private (Rider)
const getRiderOrders = async (req, res) => {
    try {
        const riderId = req.user._id;
        const { status } = req.query;

        const query = { rider: riderId };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('user', 'name email phone address')
            .populate('items.food', 'name image price')
            .sort({ riderAssignedAt: -1 });

        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Accept an available order
// @route   POST /api/riders/orders/:orderId/accept
// @access  Private (Rider)
const acceptOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.rider && order.rider.toString() !== req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Order already assigned' });
        }

        if (order.status !== 'ready') {
            return res.status(400).json({ success: false, message: 'Order is not ready for pickup' });
        }

        // Assign order to rider or confirm existing assignment, then start delivery
        if (!order.rider) {
            order.rider = req.user._id;
            order.riderAssignedAt = new Date();
        }
        order.status = 'in-transit';

        await order.save();

        const populatedOrder = await order.populate([
            { path: 'user', select: 'name email phone address' },
            { path: 'items.food', select: 'name image price' },
            { path: 'rider', select: 'name phone vehicleType vehicleNumber' },
        ]);

        // Emit real-time event to customer
        const io = req.app.get('io');
        io.to(order.user._id.toString()).emit('orderAssignedToRider', {
            orderId: order._id,
            rider: {
                _id: req.user._id,
                name: req.user.name,
                phone: req.user.phone,
                vehicleType: req.user.vehicleType,
                vehicleNumber: req.user.vehicleNumber,
                currentLocation: req.user.currentLocation,
            },
            status: 'in-transit',
        });

        res.json({ success: true, message: 'Order accepted', data: populatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update rider's current location
// @route   POST /api/riders/location
// @access  Private (Rider)
const updateRiderLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Location coordinates required' });
        }

        // Update rider location
        await User.findByIdAndUpdate(req.user._id, {
            currentLocation: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                updatedAt: new Date(),
            },
        });

        // Update all active orders for this rider
        const activeOrders = await Order.find({
            rider: req.user._id,
            status: 'in-transit',
        }).populate('user', '_id');

        for (let order of activeOrders) {
            order.riderCurrentLocation = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                updatedAt: new Date(),
            };
            await order.save();

            // Emit real-time location update to customer
            const io = req.app.get('io');
            io.to(order.user._id.toString()).emit('riderLocationUpdated', {
                orderId: order._id,
                location: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    updatedAt: new Date(),
                },
            });
        }

        res.json({ success: true, message: 'Location updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark order as delivered
// @route   POST /api/riders/orders/:orderId/deliver
// @access  Private (Rider)
const deliverOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.rider.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (order.status !== 'in-transit') {
            return res.status(400).json({ success: false, message: 'Order is not in transit' });
        }

        // Mark as delivered
        order.status = 'delivered';
        order.deliveredAt = new Date();
        await order.save();

        const populatedOrder = await order.populate([
            { path: 'user', select: 'name email phone address' },
            { path: 'items.food', select: 'name image price' },
        ]);

        // Emit real-time event to customer
        const io = req.app.get('io');
        io.to(order.user._id.toString()).emit('orderDelivered', {
            orderId: order._id,
            status: 'delivered',
            deliveredAt: new Date(),
        });

        res.json({ success: true, message: 'Order delivered', data: populatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a rider's delivered/cancelled order from history
// @route   DELETE /api/riders/orders/:orderId
// @access  Private (Rider)
const deleteRiderOrderHistory = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.rider || order.rider.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const deletableStatuses = ['delivered', 'cancelled'];
        if (!deletableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Only delivered or cancelled orders can be deleted from history',
            });
        }

        await order.deleteOne();

        res.json({ success: true, message: 'Order history deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle rider availability
// @route   POST /api/riders/availability
// @access  Private (Rider)
const toggleAvailability = async (req, res) => {
    try {
        const rider = await User.findByIdAndUpdate(
            req.user._id,
            { isAvailable: !req.user.isAvailable },
            { new: true }
        );

        res.json({
            success: true,
            message: `Rider is now ${rider.isAvailable ? 'available' : 'unavailable'}`,
            data: { isAvailable: rider.isAvailable },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRiderDashboard,
    getRiderOrders,
    acceptOrder,
    updateRiderLocation,
    deliverOrder,
    deleteRiderOrderHistory,
    toggleAvailability,
};
