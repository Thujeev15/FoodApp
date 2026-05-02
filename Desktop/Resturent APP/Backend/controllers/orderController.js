const Order = require('../models/Order');

const ORDER_UPDATE_WINDOW_MS = 5 * 60 * 1000;

const getOrderWindowState = (order) => {
    const createdAtMs = new Date(order.createdAt).getTime();
    const expiresAtMs = createdAtMs + ORDER_UPDATE_WINDOW_MS;
    const remainingMs = Math.max(0, expiresAtMs - Date.now());
    return {
        canEditByTime: remainingMs > 0,
        remainingSeconds: Math.ceil(remainingMs / 1000),
    };
};

const validateOrderUpdateAccess = (order, userId) => {
    if (order.user.toString() !== userId.toString()) {
        return { allowed: false, statusCode: 403, message: 'Not authorized to modify this order' };
    }

    if (order.status !== 'pending') {
        return {
            allowed: false,
            statusCode: 400,
            message: 'Order can be modified only while pending',
        };
    }

    const { canEditByTime, remainingSeconds } = getOrderWindowState(order);
    if (!canEditByTime) {
        return {
            allowed: false,
            statusCode: 400,
            message: 'Order can only be modified or deleted within 5 minutes of placing it',
            remainingSeconds,
        };
    }

    return { allowed: true, statusCode: 200, remainingSeconds };
};

// @desc    Create an order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { items, totalAmount, paymentMethod, deliveryAddress, deliveryLocation, specialInstructions } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No order items' });
        }

        const order = await Order.create({
            user: req.user._id,
            items,
            totalAmount,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: paymentMethod === 'card' ? 'processing' : 'pending',
            deliveryAddress: deliveryAddress || req.user.address,
            deliveryLocation: {
                latitude: Number.isFinite(Number(deliveryLocation?.latitude)) ? Number(deliveryLocation.latitude) : null,
                longitude: Number.isFinite(Number(deliveryLocation?.longitude)) ? Number(deliveryLocation.longitude) : null,
                mapUrl: deliveryLocation?.mapUrl || '',
            },
            specialInstructions: specialInstructions || '',
        });

        const populatedOrder = await order.populate('user', 'name email phone');

        // Emit real-time event to admin
        const io = req.app.get('io');
        io.to('admin').emit('newOrder', {
            message: `New order from ${req.user.name}`,
            order: populatedOrder,
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: populatedOrder,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('items.food', 'name image price')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders/all
// @access  Admin
const getAllOrders = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .populate('items.food', 'name image price')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalRevenue = orders
            .filter((o) => o.status === 'delivered')
            .reduce((sum, o) => sum + o.totalAmount, 0);

        res.json({
            success: true,
            count: orders.length,
            totalRevenue,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('items.food', 'name image price');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const isOwner = order.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isAssignedRider =
            req.user.role === 'rider' &&
            order.rider &&
            order.rider.toString() === req.user._id.toString();

        // Allow owner, admin, or assigned rider to view
        if (!isOwner && !isAdmin && !isAssignedRider) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email phone');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Emit real-time update to customer
        const io = req.app.get('io');
        io.to(order.user._id.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            status: order.status,
            message: `Your order is now ${status}`,
        });

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update own order within 5 minutes
// @route   PUT /api/orders/:id
// @access  Private
const updateMyOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const access = validateOrderUpdateAccess(order, req.user._id);
        if (!access.allowed) {
            return res.status(access.statusCode).json({
                success: false,
                message: access.message,
                remainingSeconds: access.remainingSeconds,
            });
        }

        const { deliveryAddress, deliveryLocation, specialInstructions, paymentMethod } = req.body;
        const validPaymentMethods = ['cash', 'card', 'online'];

        if (typeof deliveryAddress === 'string') {
            order.deliveryAddress = deliveryAddress;
        }

        if (typeof specialInstructions === 'string') {
            order.specialInstructions = specialInstructions;
        }

        if (deliveryLocation && typeof deliveryLocation === 'object') {
            order.deliveryLocation = {
                latitude: Number.isFinite(Number(deliveryLocation.latitude)) ? Number(deliveryLocation.latitude) : null,
                longitude: Number.isFinite(Number(deliveryLocation.longitude)) ? Number(deliveryLocation.longitude) : null,
                mapUrl: deliveryLocation.mapUrl || '',
            };
        }

        if (typeof paymentMethod === 'string') {
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({ success: false, message: 'Invalid payment method' });
            }

            order.paymentMethod = paymentMethod;
            if (order.paymentStatus !== 'paid') {
                order.paymentStatus = paymentMethod === 'card' ? 'processing' : 'pending';
            }
        }

        await order.save();

        const populatedOrder = await order.populate('items.food', 'name image price');

        res.json({
            success: true,
            message: 'Order updated successfully',
            data: populatedOrder,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete own order within 5 minutes
// @route   DELETE /api/orders/:id
// @access  Private
const deleteMyOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const access = validateOrderUpdateAccess(order, req.user._id);
        if (!access.allowed) {
            return res.status(access.statusCode).json({
                success: false,
                message: access.message,
                remainingSeconds: access.remainingSeconds,
            });
        }

        await order.deleteOne();

        res.json({
            success: true,
            message: 'Order deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete any order (admin)
// @route   DELETE /api/orders/:id/admin
// @access  Admin
const deleteOrderAsAdmin = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        await order.deleteOne();

        res.json({
            success: true,
            message: 'Order deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Assign rider to order (admin)
// @route   POST /api/orders/:id/assign-rider
// @access  Admin
const assignRider = async (req, res) => {
    try {
        const { riderId } = req.body;

        if (!riderId) {
            return res.status(400).json({ success: false, message: 'Rider ID required' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const User = require('../models/User');
        const rider = await User.findById(riderId);
        if (!rider || rider.role !== 'rider') {
            return res.status(404).json({ success: false, message: 'Rider not found' });
        }

        if (!rider.isActive) {
            return res.status(400).json({ success: false, message: 'Rider is not active' });
        }

        if (order.status !== 'ready') {
            return res.status(400).json({ success: false, message: 'Order must be ready before assigning rider' });
        }

        order.rider = riderId;
        order.riderAssignedAt = new Date();
        await order.save();

        const populatedOrder = await order.populate([
            { path: 'user', select: 'name email phone address' },
            { path: 'rider', select: 'name phone vehicleType vehicleNumber currentLocation' },
            { path: 'items.food', select: 'name image price' },
        ]);

        // Emit real-time event to rider and customer
        const io = req.app.get('io');
        
        // Notify rider of new order
        io.to(riderId).emit('newOrderAssigned', {
            message: 'New order assigned to you',
            order: populatedOrder,
        });

        // Notify customer that rider is assigned
        io.to(order.user._id.toString()).emit('orderAssignedToRider', {
            orderId: order._id,
            rider: {
                _id: rider._id,
                name: rider.name,
                phone: rider.phone,
                vehicleType: rider.vehicleType,
                vehicleNumber: rider.vehicleNumber,
                currentLocation: rider.currentLocation,
            },
            status: 'ready',
        });

        res.json({ success: true, message: 'Rider assigned', data: populatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get available riders (admin)
// @route   GET /api/orders/riders/available
// @access  Admin
const getAvailableRiders = async (req, res) => {
    try {
        const User = require('../models/User');
        const riders = await User.find({
            role: 'rider',
            isActive: true,
        }).select('name phone email vehicleType vehicleNumber currentLocation isAvailable');

        res.json({ success: true, count: riders.length, data: riders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
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
};
