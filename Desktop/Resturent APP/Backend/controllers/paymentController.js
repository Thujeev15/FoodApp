const Stripe = require('stripe');
const Order = require('../models/Order');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isStripeKeyConfigured =
    typeof stripeSecretKey === 'string' &&
    (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'));

const stripe = isStripeKeyConfigured ? new Stripe(stripeSecretKey) : null;

const getPaymentConfig = async (req, res) => {
    return res.json({
        success: true,
        data: {
            cardEnabled: !!stripe,
            availableMethods: ['cash', 'online', ...(stripe ? ['card'] : [])],
        },
    });
};

const createStripeCheckoutSession = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(400).json({
                success: false,
                message: 'Card payment is not configured. Please use Cash on Delivery or Online Transfer.',
            });
        }

        const { orderId, returnUrl } = req.body;

        if (!orderId || !returnUrl) {
            return res.status(400).json({
                success: false,
                message: 'orderId and returnUrl are required',
            });
        }

        const order = await Order.findById(orderId).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (order.paymentMethod !== 'card') {
            return res.status(400).json({ success: false, message: 'This order is not marked for card payment' });
        }

        const successUrl = `${returnUrl}?payment=success&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${returnUrl}?payment=cancel&orderId=${order._id}`;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'lkr',
                        product_data: {
                            name: `Lagoon Bites Order #${order._id.toString().slice(-6).toUpperCase()}`,
                        },
                        unit_amount: Math.round(order.totalAmount),
                    },
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                orderId: order._id.toString(),
                userId: req.user._id.toString(),
            },
        });

        order.paymentStatus = 'processing';
        order.paymentReference = session.id;
        await order.save();

        return res.json({
            success: true,
            message: 'Checkout session created',
            data: {
                sessionId: session.id,
                checkoutUrl: session.url,
            },
        });
    } catch (error) {
        const isStripeConfigError =
            typeof error?.message === 'string' &&
            (error.message.includes('Invalid API Key') || error.message.includes('No API key provided'));

        return res.status(isStripeConfigError ? 400 : 500).json({
            success: false,
            message: isStripeConfigError
                ? 'Card payment is not configured. Please use Cash on Delivery or Online Transfer.'
                : error.message,
        });
    }
};

const verifyStripeCheckoutSession = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(400).json({
                success: false,
                message: 'Card payment is not configured. Please use Cash on Delivery or Online Transfer.',
            });
        }

        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'sessionId is required' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, message: 'Checkout session not found' });
        }

        const orderId = session.metadata?.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (session.payment_status === 'paid') {
            order.paymentStatus = 'paid';
            order.paymentReference = session.id;
            order.status = 'confirmed';
            await order.save();
        }

        return res.json({
            success: true,
            message: session.payment_status === 'paid' ? 'Payment confirmed' : 'Payment not completed',
            data: {
                paymentStatus: session.payment_status,
                orderId: order._id,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPaymentConfig,
    createStripeCheckoutSession,
    verifyStripeCheckoutSession,
};