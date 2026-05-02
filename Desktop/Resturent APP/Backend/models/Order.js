const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [
            {
                food: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Food',
                    required: true,
                },
                name: String,
                image: String,
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'preparing', 'ready', 'in-transit', 'delivered', 'cancelled'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'online'],
            default: 'cash',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed'],
            default: 'pending',
        },
        paymentReference: {
            type: String,
            default: '',
        },
        deliveryAddress: {
            type: String,
            default: '',
        },
        deliveryLocation: {
            latitude: {
                type: Number,
                default: null,
            },
            longitude: {
                type: Number,
                default: null,
            },
            mapUrl: {
                type: String,
                default: '',
            },
        },
        specialInstructions: {
            type: String,
            default: '',
        },
        estimatedDeliveryTime: {
            type: Number,
            default: 30,
        },
        // Rider assignment
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        riderAssignedAt: {
            type: Date,
            default: null,
        },
        // Tracking
        riderCurrentLocation: {
            latitude: {
                type: Number,
                default: null,
            },
            longitude: {
                type: Number,
                default: null,
            },
            updatedAt: {
                type: Date,
                default: null,
            },
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
