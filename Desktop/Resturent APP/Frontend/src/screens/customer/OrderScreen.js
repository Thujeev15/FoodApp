import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import api from '../../api/axios';
import colors from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { getSocket, onOrderStatusUpdate, onOrderAssignedToRider, onOrderDelivered, onRiderLocationUpdated, offOrderStatusUpdate, offOrderAssignedToRider, offOrderDelivered, offRiderLocationUpdated } from '../../services/socketService';

const statusConfig = {
    pending: { icon: 'time', color: colors.pending, label: 'Pending' },
    confirmed: { icon: 'checkmark-circle', color: colors.confirmed, label: 'Confirmed' },
    preparing: { icon: 'restaurant', color: colors.preparing, label: 'Preparing' },
    ready: { icon: 'checkmark-done-circle', color: colors.ready, label: 'Ready' },
    'in-transit': { icon: 'bicycle', color: colors.preparing, label: 'On the way' },
    delivered: { icon: 'bicycle', color: colors.delivered, label: 'Delivered' },
    cancelled: { icon: 'close-circle', color: colors.cancelled, label: 'Cancelled' },
};

const paymentConfig = {
    cash: { label: 'Cash on Delivery', color: colors.success, icon: 'cash-outline' },
    online: { label: 'Online Transfer', color: colors.info, icon: 'phone-portrait-outline' },
    card: { label: 'Card Payment', color: colors.primary, icon: 'card-outline' },
};

const ORDER_EDIT_WINDOW_MS = 5 * 60 * 1000;

const toFiniteNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const getLocationCoordinates = (location) => {
    const latitude = toFiniteNumber(location?.latitude);
    const longitude = toFiniteNumber(location?.longitude);

    if (latitude === null || longitude === null) {
        return null;
    }

    return { latitude, longitude };
};

// Calculate distance between two coordinates in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
};

const TrackingMap = ({ order, getTrackingRegion }) => {
    const region = getTrackingRegion(order);
    const riderCoordinates = getLocationCoordinates(order.riderCurrentLocation);
    const deliveryCoordinates = getLocationCoordinates(order.deliveryLocation);
    const hasRiderLocation = Boolean(riderCoordinates);
    const hasDeliveryLocation = Boolean(deliveryCoordinates);

    // Calculate distance to determine if we should show polyline
    const shouldShowPolyline = hasRiderLocation && hasDeliveryLocation && 
        calculateDistance(
            riderCoordinates.latitude,
            riderCoordinates.longitude,
            deliveryCoordinates.latitude,
            deliveryCoordinates.longitude
        ) > 0.05; // Only show polyline if > 50 meters apart

    const routeCoordinates = [
        riderCoordinates,
        deliveryCoordinates,
    ].filter(Boolean);

    return (
        <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.trackingMap}
            region={region}
            zoomEnabled={true}
            scrollEnabled={true}
        >
            {/* Route polyline - only show if distance is significant */}
            {shouldShowPolyline && routeCoordinates.length === 2 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={colors.primary}
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                />
            )}

            {/* Rider marker */}
            {hasRiderLocation && (
                <Marker
                    coordinate={{
                        latitude: riderCoordinates.latitude,
                        longitude: riderCoordinates.longitude,
                    }}
                    title="Rider Location"
                    description={`Last updated: ${new Date(order.riderCurrentLocation.updatedAt).toLocaleTimeString()}`}
                >
                    <View style={styles.riderMarker}>
                        <Ionicons name="bicycle" size={16} color="#FFFFFF" />
                    </View>
                </Marker>
            )}

            {/* Destination marker */}
            {hasDeliveryLocation && (
                <Marker
                    coordinate={{
                        latitude: deliveryCoordinates.latitude,
                        longitude: deliveryCoordinates.longitude,
                    }}
                    title="Delivery Address"
                    pinColor={colors.delivered}
                />
            )}
        </MapView>
    );
};

// Full-screen live tracking modal
const FullScreenTrackingMap = ({ order, visible, onClose }) => {
    if (!visible || !order) return null;

    const riderCoordinates = getLocationCoordinates(order.riderCurrentLocation);
    const deliveryCoordinates = getLocationCoordinates(order.deliveryLocation);
    const hasRiderLocation = Boolean(riderCoordinates);
    const hasDeliveryLocation = Boolean(deliveryCoordinates);

    // Return null if we don't have both locations
    if (!hasRiderLocation || !hasDeliveryLocation) return null;

    const routeCoordinates = [
        {
            latitude: deliveryCoordinates.latitude,
            longitude: deliveryCoordinates.longitude,
        },
        {
            latitude: riderCoordinates.latitude,
            longitude: riderCoordinates.longitude,
        },
    ];

    const region = {
        latitude: (riderCoordinates.latitude + deliveryCoordinates.latitude) / 2,
        longitude: (riderCoordinates.longitude + deliveryCoordinates.longitude) / 2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const distance = parseFloat(calculateDistance(
        riderCoordinates.latitude,
        riderCoordinates.longitude,
        deliveryCoordinates.latitude,
        deliveryCoordinates.longitude
    ));

    // Estimate ETA (assuming 40km/h average speed)
    const estimatedMinutes = Math.ceil((distance / 40) * 60);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={styles.trackingFullScreen}>
                {/* Full Map Background */}
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.fullTrackingMapBg}
                    region={region}
                    zoomEnabled={true}
                    scrollEnabled={true}
                >
                    {/* Black polyline - the main route line */}
                    {routeCoordinates.length === 2 && (
                        <>
                            {/* Thick black line underneath (shadow effect) */}
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#000000"
                                strokeWidth={6}
                                lineDashPattern={[0]}
                            />
                            {/* Main colored line on top */}
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor={colors.primary}
                                strokeWidth={4}
                                lineDashPattern={[0]}
                            />
                        </>
                    )}

                    {/* Delivery location marker */}
                    {hasDeliveryLocation && (
                        <Marker
                            coordinate={{
                                latitude: deliveryCoordinates.latitude,
                                longitude: deliveryCoordinates.longitude,
                            }}
                            title="Your Location"
                        >
                            <View style={styles.destinationMarker}>
                                <Ionicons name="location" size={20} color="#FFFFFF" />
                            </View>
                        </Marker>
                    )}

                    {/* Rider marker - prominent */}
                    {hasRiderLocation && (
                        <Marker
                            coordinate={{
                                latitude: riderCoordinates.latitude,
                                longitude: riderCoordinates.longitude,
                            }}
                            title={`${order.rider?.name || 'Rider'}`}
                        >
                            <View style={styles.riderMarkerLarge}>
                                <Ionicons name="bicycle" size={24} color="#FFFFFF" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Header Overlay */}
                <View style={styles.trackingHeaderOverlay}>
                    <TouchableOpacity onPress={onClose} style={styles.trackingCloseBtn}>
                        <Ionicons name="close-circle" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Bottom Sheet - Professional Info Card */}
                <View style={styles.trackingBottomSheet}>
                    {/* Rider Card */}
                    <View style={styles.riderCardPremium}>
                        <View style={styles.riderHeaderRow}>
                            <View style={styles.riderPremiumAvatar}>
                                <Ionicons name="person" size={32} color={colors.primary} />
                            </View>
                            <View style={styles.riderPremiumInfo}>
                                <Text style={styles.riderPremiumName}>{order.rider?.name || 'Rider'}</Text>
                                <View style={styles.riderStatusBadge}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.riderStatusText}>
                                        {distance < 0.05 ? 'Arrived' : 'On the way'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={14} color="#FFB800" />
                                <Text style={styles.ratingText}>4.8</Text>
                            </View>
                        </View>

                        {/* Vehicle Info */}
                        {Boolean(order.rider?.vehicleType) && (
                            <View style={styles.vehicleInfoRow}>
                                <Ionicons name="bicycle-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.vehicleText}>
                                    {order.rider.vehicleType.charAt(0).toUpperCase() + order.rider.vehicleType.slice(1)}
                                    {order.rider.vehicleNumber ? ` • ${order.rider.vehicleNumber}` : ''}
                                </Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity style={styles.actionButtonSecondary}>
                                <Ionicons name="call" size={18} color={colors.primary} />
                                <Text style={styles.actionButtonSecondaryText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButtonSecondary}>
                                <Ionicons name="chatbubble" size={18} color={colors.primary} />
                                <Text style={styles.actionButtonSecondaryText}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Info Cards Row */}
                    <View style={styles.infoCardsRow}>
                        {/* Distance Card */}
                        <View style={styles.infoCardMini}>
                            <Ionicons name="location-sharp" size={20} color={colors.primary} />
                            <Text style={styles.infoCardLabel}>Distance</Text>
                            <Text style={styles.infoCardValue}>{distance} km</Text>
                        </View>

                        {/* ETA Card */}
                        <View style={styles.infoCardMini}>
                            <Ionicons name="timer" size={20} color={colors.primary} />
                            <Text style={styles.infoCardLabel}>ETA</Text>
                            <Text style={styles.infoCardValue}>{estimatedMinutes}m</Text>
                        </View>

                        {/* Status Card */}
                        <View style={styles.infoCardMini}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            <Text style={styles.infoCardLabel}>Status</Text>
                            <Text style={[styles.infoCardValue, { color: distance < 0.05 ? colors.delivered : colors.primary }]}>
                                {distance < 0.05 ? 'Here!' : 'Moving'}
                            </Text>
                        </View>
                    </View>

                    {/* Delivery Address Card */}
                    <View style={styles.addressCardPremium}>
                        <View style={styles.addressIconContainer}>
                            <Ionicons name="pin" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.addressTextContainer}>
                            <Text style={styles.addressLabel}>Delivery Address</Text>
                            <Text style={styles.addressValue} numberOfLines={2}>
                                {order.deliveryAddress || 'Your Location'}
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

export default function OrderScreen({ navigation }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editAddress, setEditAddress] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [submittingEdit, setSubmittingEdit] = useState(false);
    const [foodReviewModalVisible, setFoodReviewModalVisible] = useState(false);
    const [riderReviewModalVisible, setRiderReviewModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedFoodId, setSelectedFoodId] = useState(null);
    const [selectedFoodName, setSelectedFoodName] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [trackingModalVisible, setTrackingModalVisible] = useState(false);
    const [trackedOrder, setTrackedOrder] = useState(null);

    useEffect(() => {
        if (user) {
            fetchOrders();
        } else {
            setOrders([]);
        }

        // Setup Socket.IO listeners for real-time updates
        const socket = getSocket();
        
        if (socket && user) {
            // Listen for order status updates
            onOrderStatusUpdate((updatedOrder) => {
                const updatedOrderId = updatedOrder?.orderId || updatedOrder?._id;
                if (!updatedOrderId) return;
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order._id === updatedOrderId
                            ? { ...order, status: updatedOrder.status }
                            : order
                    )
                );
            });

            // Listen for rider assignment
            onOrderAssignedToRider((data) => {
                if (data.orderId) {
                    setOrders(prevOrders =>
                        prevOrders.map(order =>
                            order._id === data.orderId
                                ? { ...order, rider: data.rider, status: data.status || 'ready' }
                                : order
                        )
                    );
                }
            });

            // Listen for rider location updates
            onRiderLocationUpdated((data) => {
                if (data.orderId) {
                    setOrders(prevOrders =>
                        prevOrders.map(order =>
                            order._id === data.orderId
                                ? {
                                    ...order,
                                    riderCurrentLocation: data.location,
                                    rider: { ...order.rider, currentLocation: data.location },
                                }
                                : order
                        )
                    );
                }
            });

            // Listen for delivery completion
            onOrderDelivered((data) => {
                if (data.orderId) {
                    setOrders(prevOrders =>
                        prevOrders.map(order =>
                            order._id === data.orderId
                                ? { ...order, status: 'delivered', deliveredAt: data.deliveredAt }
                                : order
                        )
                    );
                }
            });
        }

        return () => {
            // Cleanup socket listeners
            offOrderStatusUpdate();
            offOrderAssignedToRider();
            offRiderLocationUpdated();
            offOrderDelivered();
        };
    }, [user]);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/api/orders');
            setOrders(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    };

    const getRemainingWindowMs = (createdAt) => {
        const elapsed = Date.now() - new Date(createdAt).getTime();
        return Math.max(0, ORDER_EDIT_WINDOW_MS - elapsed);
    };

    const canModifyOrder = (order) => {
        return order.status === 'pending' && getRemainingWindowMs(order.createdAt) > 0;
    };

    const getRemainingMinutesText = (order) => {
        const minutes = Math.ceil(getRemainingWindowMs(order.createdAt) / 60000);
        return `${minutes} min left to edit/delete`;
    };

    const getTrackingRegion = (order) => {
        const riderCoordinates = getLocationCoordinates(order?.riderCurrentLocation);
        const deliveryCoordinates = getLocationCoordinates(order?.deliveryLocation);
        const riderLat = riderCoordinates?.latitude;
        const riderLng = riderCoordinates?.longitude;
        const destLat = deliveryCoordinates?.latitude;
        const destLng = deliveryCoordinates?.longitude;

        // If both locations exist, center between them and adjust zoom
        if (riderCoordinates && deliveryCoordinates) {
            const centerLat = (riderLat + destLat) / 2;
            const centerLng = (riderLng + destLng) / 2;

            // Calculate distance to determine zoom level
            const latDiff = Math.abs(destLat - riderLat);
            const lngDiff = Math.abs(destLng - riderLng);

            // Use larger delta if points are far, smaller if close
            const maxDiff = Math.max(latDiff, lngDiff);
            let delta = 0.03; // Default zoom

            if (maxDiff < 0.001) {
                // Same location or very close (< 100m) - zoom in more
                delta = 0.015;
            } else if (maxDiff < 0.005) {
                // Close location (< 500m) - normal zoom
                delta = 0.025;
            } else if (maxDiff < 0.01) {
                // Medium distance (< 1km) - zoom out a bit
                delta = 0.035;
            } else {
                // Far distance - zoom out more
                delta = 0.05;
            }

            return {
                latitude: centerLat,
                longitude: centerLng,
                latitudeDelta: delta,
                longitudeDelta: delta,
            };
        }

        // Fallback to single location
        const latitude = riderLat ?? destLat ?? 6.9271;
        const longitude = riderLng ?? destLng ?? 79.8612;

        return {
            latitude,
            longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
        };
    };

    const openEditModal = (order) => {
        setEditingOrderId(order._id);
        setEditAddress(order.deliveryAddress || '');
        setEditInstructions(order.specialInstructions || '');
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingOrderId(null);
        setEditAddress('');
        setEditInstructions('');
    };

    const openTrackingModal = (order) => {
        setTrackedOrder(order);
        setTrackingModalVisible(true);
    };

    const closeTrackingModal = () => {
        setTrackingModalVisible(false);
        setTrackedOrder(null);
    };

    const handleSaveOrderUpdate = async () => {
        if (!editingOrderId) return;

        try {
            setSubmittingEdit(true);
            await api.put(`/api/orders/${editingOrderId}`, {
                deliveryAddress: editAddress,
                specialInstructions: editInstructions,
            });

            closeEditModal();
            await fetchOrders();
            Alert.alert('Updated', 'Your order has been updated.');
        } catch (error) {
            Alert.alert('Update Failed', error?.response?.data?.message || 'Could not update this order.');
        } finally {
            setSubmittingEdit(false);
        }
    };

    const handleDeleteOrder = (order) => {
        Alert.alert(
            'Delete Order',
            'Are you sure you want to delete this order?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/orders/${order._id}`);
                            await fetchOrders();
                            Alert.alert('Deleted', 'Order deleted successfully.');
                        } catch (error) {
                            Alert.alert('Delete Failed', error?.response?.data?.message || 'Could not delete this order.');
                        }
                    },
                },
            ]
        );
    };

    const resolveFoodId = (orderItem) => orderItem?.food?._id || orderItem?.food || orderItem?._id;

    const openFoodReviewModal = (order) => {
        if (!order?.items?.length) {
            Alert.alert('No items', 'This order has no food items to review.');
            return;
        }
        const firstItem = order.items[0];
        const firstFoodId = resolveFoodId(firstItem);
        setSelectedOrder(order);
        setSelectedFoodId(firstFoodId);
        setSelectedFoodName(firstItem.name || 'Food Item');
        setReviewRating(5);
        setReviewComment('');
        setFoodReviewModalVisible(true);
    };

    const openRiderReviewModal = (order) => {
        if (!order?.rider) {
            Alert.alert('No rider', 'This order does not have a rider assigned.');
            return;
        }
        setSelectedOrder(order);
        setReviewRating(5);
        setReviewComment('');
        setRiderReviewModalVisible(true);
    };

    const handleSubmitFoodReview = async () => {
        if (!selectedFoodId) {
            Alert.alert('Select food', 'Please choose a food item to review.');
            return;
        }
        if (!reviewComment.trim()) {
            Alert.alert('Missing Comment', 'Please add a comment for your review.');
            return;
        }

        try {
            setSubmittingReview(true);
            await api.post('/api/reviews', {
                food: selectedFoodId,
                rating: reviewRating,
                comment: reviewComment.trim(),
            });
            setFoodReviewModalVisible(false);
            Alert.alert('Thank you!', 'Your food review was submitted.');
        } catch (error) {
            Alert.alert('Review Failed', error?.response?.data?.message || 'Could not submit review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleSubmitRiderReview = async () => {
        if (!reviewComment.trim()) {
            Alert.alert('Missing Comment', 'Please describe your complaint.');
            return;
        }

        try {
            setSubmittingReview(true);
            await api.post('/api/rider-reviews', {
                rider: selectedOrder?.rider?._id || selectedOrder?.rider,
                order: selectedOrder?._id,
                rating: reviewRating,
                comment: reviewComment.trim(),
            });
            setRiderReviewModalVisible(false);
            Alert.alert('Submitted', 'Your rider complaint was submitted.');
        } catch (error) {
            Alert.alert('Submission Failed', error?.response?.data?.message || 'Could not submit complaint.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const renderOrder = ({ item }) => {
        const status = statusConfig[item.status] || statusConfig.pending;
        const editable = canModifyOrder(item);
        const riderCoordinates = getLocationCoordinates(item.riderCurrentLocation);
        const deliveryCoordinates = getLocationCoordinates(item.deliveryLocation);
        const canShowRiderTracking = Boolean(item.rider) && ['ready', 'in-transit', 'delivered'].includes(item.status);
        const canShowDistanceInfo = Boolean(riderCoordinates && deliveryCoordinates);
        const canShowTrackingMap = item.status === 'in-transit' && Boolean(deliveryCoordinates);

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                {/* Rider Tracking Section */}
                {canShowRiderTracking && (
                    <View style={styles.trackingCard}>
                        <View style={styles.trackingHeader}>
                            <Ionicons name="bicycle" size={20} color={colors.primary} />
                            <Text style={styles.trackingTitle}>Delivery Tracking</Text>
                        </View>

                        <View style={styles.riderInfo}>
                            <View style={styles.riderAvatar}>
                                <Ionicons name="person" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.riderDetails}>
                                <Text style={styles.riderName}>{item.rider?.name}</Text>
                                <Text style={styles.riderPhone}>{item.rider?.phone}</Text>
                                {Boolean(item.rider?.vehicleType) && (
                                    <Text style={styles.riderVehicle}>
                                        {item.rider.vehicleType.charAt(0).toUpperCase() + item.rider.vehicleType.slice(1)}
                                        {item.rider.vehicleNumber ? ` • ${item.rider.vehicleNumber}` : ''}
                                    </Text>
                                )}
                            </View>
                            {item.status === 'in-transit' && (
                                <View style={styles.trackingStatus}>
                                    <View style={styles.pulsingDot} />
                                    <Text style={styles.trackingStatusText}>On the way</Text>
                                </View>
                            )}
                            {item.status === 'delivered' && (
                                <View style={styles.deliveredBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.delivered} />
                                </View>
                            )}
                        </View>

                        {canShowDistanceInfo && (
                            <TouchableOpacity 
                                style={styles.distanceInfoButton}
                                onPress={() => openTrackingModal(item)}
                            >
                                <View style={styles.distanceInfo}>
                                    {(() => {
                                        const distance = parseFloat(calculateDistance(
                                            riderCoordinates.latitude,
                                            riderCoordinates.longitude,
                                            deliveryCoordinates.latitude,
                                            deliveryCoordinates.longitude
                                        ));
                                        
                                        if (distance < 0.05) {
                                            // Less than 50 meters - rider is here!
                                            return (
                                                <>
                                                    <Ionicons name="checkmark-circle" size={14} color={colors.delivered} />
                                                    <Text style={[styles.distanceText, { color: colors.delivered, fontWeight: '700' }]}>
                                                        ✓ Rider arrived! 🎉
                                                    </Text>
                                                </>
                                            );
                                        } else if (distance < 0.1) {
                                            // Less than 100 meters
                                            return (
                                                <>
                                                    <Ionicons name="close-circle" size={14} color={colors.primary} />
                                                    <Text style={styles.distanceText}>
                                                        🚴 Almost here ({distance} km)
                                                    </Text>
                                                </>
                                            );
                                        } else {
                                            // Further away
                                            return (
                                                <>
                                                    <Ionicons name="location" size={14} color={colors.primary} />
                                                    <Text style={styles.distanceText}>
                                                        🚴 {distance} km away
                                                    </Text>
                                                </>
                                            );
                                        }
                                    })()}
                                </View>
                                <View style={styles.trackingTapIndicator}>
                                    <Text style={styles.trackingTapText}>Tap for live tracking</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                                </View>
                            </TouchableOpacity>
                        )}

                        {canShowTrackingMap && (
                            <View style={styles.trackingMapContainer}>
                                <TrackingMap order={item} getTrackingRegion={getTrackingRegion} />
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.divider} />
                {item.items.map((orderItem, index) => (
                    <View key={index} style={styles.orderItem}>
                        <Text style={styles.itemQty}>{orderItem.quantity}x</Text>
                        <Text style={styles.itemName}>{orderItem.name || 'Food Item'}</Text>
                        <Text style={styles.itemPrice}>Rs. {(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
                    </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.orderFooter}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>Rs. {item.totalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.paymentRow}>
                    <View style={[styles.paymentBadge, { backgroundColor: `${(paymentConfig[item.paymentMethod] || paymentConfig.cash).color}18` }]}>
                        <Ionicons name={(paymentConfig[item.paymentMethod] || paymentConfig.cash).icon} size={12} color={(paymentConfig[item.paymentMethod] || paymentConfig.cash).color} />
                        <Text style={[styles.paymentText, { color: (paymentConfig[item.paymentMethod] || paymentConfig.cash).color }]}>
                            {(paymentConfig[item.paymentMethod] || paymentConfig.cash).label}
                        </Text>
                    </View>
                    <View style={[styles.paymentBadge, { backgroundColor: `${colors.textMuted}18` }]}>
                        <Text style={[styles.paymentText, { color: colors.textMuted }]}>Payment: {item.paymentStatus || 'pending'}</Text>
                    </View>
                </View>
                {item.status === 'delivered' && (
                    <View style={styles.reviewActions}>
                        <TouchableOpacity style={styles.reviewButton} onPress={() => openFoodReviewModal(item)}>
                            <Ionicons name="star-outline" size={14} color={colors.primary} />
                            <Text style={styles.reviewButtonText}>Review Food</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reviewButton} onPress={() => openRiderReviewModal(item)}>
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                            <Text style={styles.reviewButtonText}>Rider Complaint</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!!item.specialInstructions && (
                    <Text style={styles.instructionsText}>Note: {item.specialInstructions}</Text>
                )}
                {editable ? (
                    <>
                        <Text style={styles.windowHint}>{getRemainingMinutesText(item)}</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Update</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteOrder(item)}>
                                <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <Text style={styles.windowExpiredText}>Order update/delete is available for 5 minutes after placing the order.</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {!user ? (
                <View style={styles.guestState}>
                    <Ionicons name="lock-closed-outline" size={66} color={colors.textMuted} />
                    <Text style={styles.guestTitle}>Login Required</Text>
                    <Text style={styles.guestSubtext}>Sign in to view your order history</Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginButtonText}>Login / Sign Up</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
            <View style={styles.header}>
                <Text style={styles.title}>My Orders</Text>
                <Text style={styles.subtitle}>{orders.length} orders</Text>
            </View>
            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                renderItem={renderOrder}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={70} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No orders yet</Text>
                        <Text style={styles.emptySubtext}>Your order history will appear here</Text>
                    </View>
                }
            />
            <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Update Order</Text>
                        <Text style={styles.modalLabel}>Delivery Address</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editAddress}
                            onChangeText={setEditAddress}
                            placeholder="Enter delivery address"
                            placeholderTextColor={colors.textMuted}
                        />
                        <Text style={styles.modalLabel}>Special Instructions</Text>
                        <TextInput
                            style={[styles.modalInput, styles.modalInputMultiline]}
                            value={editInstructions}
                            onChangeText={setEditInstructions}
                            placeholder="Any notes for your order"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                        />
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={closeEditModal} disabled={submittingEdit}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveOrderUpdate} disabled={submittingEdit}>
                                <Text style={styles.modalSaveText}>{submittingEdit ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal visible={foodReviewModalVisible} transparent animationType="fade" onRequestClose={() => setFoodReviewModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Review Food</Text>
                        <Text style={styles.modalLabel}>Select Item</Text>
                        <View style={styles.itemPickerRow}>
                            {selectedOrder?.items?.map((orderItem) => {
                                const foodId = resolveFoodId(orderItem);
                                return (
                                <TouchableOpacity
                                    key={foodId}
                                    style={[styles.itemChip, selectedFoodId === foodId && styles.itemChipActive]}
                                    onPress={() => {
                                        setSelectedFoodId(foodId);
                                        setSelectedFoodName(orderItem.name || 'Food Item');
                                    }}
                                >
                                    <Text style={[styles.itemChipText, selectedFoodId === foodId && styles.itemChipTextActive]}>
                                        {orderItem.name || 'Food Item'}
                                    </Text>
                                </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={styles.modalLabel}>Rating</Text>
                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                                    <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={20} color={colors.gold} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.modalLabel}>Comment</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={reviewComment}
                            onChangeText={setReviewComment}
                            placeholder={`Share your experience with ${selectedFoodName || 'this food'}`}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setFoodReviewModalVisible(false)} disabled={submittingReview}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSubmitFoodReview} disabled={submittingReview}>
                                <Text style={styles.modalSaveText}>{submittingReview ? 'Submitting...' : 'Submit'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal visible={riderReviewModalVisible} transparent animationType="fade" onRequestClose={() => setRiderReviewModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Rider Complaint</Text>
                        <Text style={styles.modalLabel}>Rating</Text>
                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                                    <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={20} color={colors.gold} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.modalLabel}>Complaint</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={reviewComment}
                            onChangeText={setReviewComment}
                            placeholder="Describe the issue with your rider"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setRiderReviewModalVisible(false)} disabled={submittingReview}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSubmitRiderReview} disabled={submittingReview}>
                                <Text style={styles.modalSaveText}>{submittingReview ? 'Submitting...' : 'Submit'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Full Screen Tracking Modal */}
            <FullScreenTrackingMap 
                order={trackedOrder} 
                visible={trackingModalVisible} 
                onClose={closeTrackingModal} 
            />

                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    orderCard: {
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        borderRadius: 18, padding: 16, marginBottom: 14,
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderId: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    orderDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    },
    statusText: { fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 12 },
    orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    itemQty: { fontSize: 13, color: colors.primary, fontWeight: '700', width: 30 },
    itemName: { flex: 1, fontSize: 13, color: colors.textSecondary },
    itemPrice: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
    totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
    paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    reviewActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: colors.glassBg,
    },
    reviewButtonText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    instructionsText: {
        marginTop: 10,
        fontSize: 12,
        color: colors.textSecondary,
    },
    windowHint: {
        marginTop: 10,
        fontSize: 12,
        color: colors.warning,
        fontWeight: '700',
    },
    windowExpiredText: {
        marginTop: 10,
        fontSize: 12,
        color: colors.textMuted,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    editButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deleteButton: {
        backgroundColor: colors.danger,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    paymentText: { fontSize: 11, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 16 },
    emptySubtext: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    guestState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    guestTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 14,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { width: '100%', backgroundColor: colors.backgroundLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    modalLabel: { fontSize: 12, color: colors.textMuted, marginTop: 12, marginBottom: 6 },
    modalInput: { borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, padding: 10, color: colors.textPrimary, minHeight: 90 },
    modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    modalCancelButton: { flex: 1, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    modalCancelText: { color: colors.textMuted, fontWeight: '700' },
    modalSaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    modalSaveText: { color: '#FFF', fontWeight: '700' },
    starRow: { flexDirection: 'row', gap: 8 },
    itemPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    itemChip: { borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    itemChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,53,0.1)' },
    itemChipText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
    itemChipTextActive: { color: colors.primary },
    guestSubtext: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 6,
    },
    loginButton: {
        marginTop: 20,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingHorizontal: 22,
        paddingVertical: 12,
    },
    loginButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: colors.textPrimary,
        marginBottom: 10,
        backgroundColor: colors.background,
    },
    modalInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 8,
    },
    modalCancelButton: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        backgroundColor: colors.background,
    },
    modalCancelText: {
        color: colors.textSecondary,
        fontWeight: '700',
    },
    modalSaveButton: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    modalSaveText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    // Tracking styles
    trackingCard: {
        backgroundColor: `${colors.primary}10`,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
        marginBottom: 10,
    },
    trackingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    trackingTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    riderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    riderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}25`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    riderDetails: {
        flex: 1,
    },
    riderName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    riderPhone: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    riderVehicle: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 1,
    },
    trackingStatus: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    trackingStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    deliveredBadge: {
        alignItems: 'center',
    },
    distanceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    distanceText: {
        fontSize: 11,
        color: colors.textMuted,
    },
    trackingMapContainer: {
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 12,
    },
    trackingMap: { flex: 1 },
    riderMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    // Full Screen Tracking Styles - Professional
    trackingFullScreen: {
        flex: 1,
        backgroundColor: '#000000',
    },
    fullTrackingMapBg: {
        ...StyleSheet.absoluteFillObject,
    },
    trackingHeaderOverlay: {
        position: 'absolute',
        top: 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    trackingCloseBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 22,
    },
    trackingBottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderBottomWidth: 0,
        maxHeight: '50%',
    },
    // Rider Card - Professional
    riderCardPremium: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    riderHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    riderPremiumAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
    },
    riderPremiumInfo: {
        flex: 1,
    },
    riderPremiumName: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },
    riderStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    riderStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: `${colors.primary}15`,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    vehicleInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        marginBottom: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.glassBorder,
    },
    vehicleText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButtonSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderColor: `${colors.primary}50`,
        borderRadius: 12,
        paddingVertical: 10,
        backgroundColor: `${colors.primary}08`,
    },
    actionButtonSecondaryText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    // Info Cards Row
    infoCardsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    infoCardMini: {
        flex: 1,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoCardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoCardValue: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
        marginTop: 4,
    },
    // Address Card
    addressCardPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: `${colors.primary}12`,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        borderRadius: 12,
        padding: 14,
    },
    addressIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressTextContainer: {
        flex: 1,
    },
    addressLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addressValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 4,
        lineHeight: 18,
    },
    // Distance and Status Styles
    distanceInfoButton: {
        padding: 12,
        marginVertical: 8,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    statusDotAnimated: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        marginRight: 8,
    },
    // Marker Styles
    destinationMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.delivered,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    riderMarkerLarge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
});
