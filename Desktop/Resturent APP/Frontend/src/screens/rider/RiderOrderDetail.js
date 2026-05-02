import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../api/axios';
import colors from '../../styles/colors';

const statusConfig = {
    ready: { icon: 'checkmark-circle', color: colors.ready, label: 'Ready for Pickup' },
    'in-transit': { icon: 'bicycle', color: colors.preparing, label: 'In Transit' },
    delivered: { icon: 'checkmark-done-circle', color: colors.delivered, label: 'Delivered' },
};

export default function RiderOrderDetail({ route, navigation }) {
    const { orderId } = route.params;
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [delivering, setDelivering] = useState(false);
    const locationWatchRef = useRef(null);
    const lastLocationSentAtRef = useRef(0);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (order?.status === 'in-transit') {
            startLocationUpdates();
        } else {
            stopLocationUpdates();
        }

        return () => stopLocationUpdates();
    }, [order?.status]);

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/api/orders/${orderId}`);
            if (res.data.success) {
                setOrder(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const sendRiderLocation = async (coords) => {
        const now = Date.now();
        if (now - lastLocationSentAtRef.current < 3000) return;
        lastLocationSentAtRef.current = now;

        try {
            await api.post('/api/riders/location', {
                latitude: coords.latitude,
                longitude: coords.longitude,
            });
        } catch (error) {
            console.error('Failed to update rider location', error);
        }
    };

    const startLocationUpdates = async () => {
        if (locationWatchRef.current) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow location access to enable live tracking.');
            return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (current?.coords) {
            sendRiderLocation(current.coords);
        }

        locationWatchRef.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                distanceInterval: 20,
            },
            (location) => {
                if (location?.coords) {
                    sendRiderLocation(location.coords);
                }
            }
        );
    };

    const stopLocationUpdates = () => {
        if (locationWatchRef.current) {
            locationWatchRef.current.remove();
            locationWatchRef.current = null;
        }
    };

    const handleStartDelivery = async () => {
        Alert.alert('Start Delivery?', 'Confirm that you are picking up this order', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Start',
                onPress: async () => {
                    try {
                        const res = await api.post(`/api/riders/orders/${orderId}/accept`);
                        if (res.data.success) {
                            Alert.alert('Success', 'Delivery started! Navigate to customer location.');
                            startLocationUpdates();
                            fetchOrder();
                        }
                    } catch (error) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to start delivery');
                    }
                },
            },
        ]);
    };

    const handleDeliverOrder = async () => {
        Alert.alert('Confirm Delivery', 'Mark order as delivered?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delivered',
                onPress: async () => {
                    setDelivering(true);
                    try {
                        const res = await api.post(`/api/riders/orders/${orderId}/deliver`);
                        if (res.data.success) {
                            Alert.alert('Success', 'Order delivered! Thank you.');
                            fetchOrder();
                        }
                    } catch (error) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to deliver order');
                    } finally {
                        setDelivering(false);
                    }
                },
            },
        ]);
    };

    const handleOpenMaps = () => {
        if (order?.deliveryLocation?.latitude && order?.deliveryLocation?.longitude) {
            const url = `https://maps.google.com/?q=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`;
            Linking.openURL(url);
        } else if (order?.deliveryAddress) {
            const url = `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`;
            Linking.openURL(url);
        }
    };

    const handleCallCustomer = () => {
        if (order?.user?.phone) {
            Linking.openURL(`tel:${order.user.phone}`);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Order not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const statusInfo = statusConfig[order.status] || statusConfig.ready;
    const deliveryLatitude = Number(order.deliveryLocation?.latitude);
    const deliveryLongitude = Number(order.deliveryLocation?.longitude);
    const hasDeliveryCoordinates = Number.isFinite(deliveryLatitude) && Number.isFinite(deliveryLongitude);
    const hasSpecialInstructions = Boolean(order.specialInstructions);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order._id.slice(-6).toUpperCase()}</Text>
                <View style={styles.statusIcon}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Map */}
                {hasDeliveryCoordinates && (
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{
                                latitude: deliveryLatitude,
                                longitude: deliveryLongitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: deliveryLatitude,
                                    longitude: deliveryLongitude,
                                }}
                                title={order.user?.name || 'Customer'}
                                description={order.deliveryAddress || 'Delivery location'}
                            />
                        </MapView>
                    </View>
                )}

                {/* Customer Info Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Customer Details</Text>
                    <View style={styles.customerInfo}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person" size={18} color={colors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Name</Text>
                                <Text style={styles.infoValue}>{order.user?.name}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="call" size={18} color={colors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                <Text style={styles.infoValue}>{order.user?.phone}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={18} color={colors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Delivery Address</Text>
                                <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
                            </View>
                        </View>

                        {hasSpecialInstructions && (
                            <View style={styles.infoRow}>
                                <Ionicons name="document-text" size={18} color={colors.primary} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Special Instructions</Text>
                                    <Text style={styles.infoValue}>{order.specialInstructions}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleCallCustomer}>
                            <Ionicons name="call" size={18} color={colors.primary} />
                            <Text style={styles.actionBtnText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMaps}>
                            <Ionicons name="map" size={18} color={colors.primary} />
                            <Text style={styles.actionBtnText}>Navigate</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Order Items */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Items</Text>
                    {order.items?.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>Rs. {(item.price * item.quantity).toFixed(0)}</Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalPrice}>Rs. {order.totalAmount.toFixed(0)}</Text>
                    </View>
                </View>

                {/* Payment Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment Info</Text>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Method</Text>
                        <Text style={styles.paymentValue}>
                            {order.paymentMethod?.charAt(0).toUpperCase() + order.paymentMethod?.slice(1)}
                        </Text>
                    </View>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Status</Text>
                        <Text
                            style={[
                                styles.paymentValue,
                                {
                                    color:
                                        order.paymentStatus === 'paid'
                                            ? colors.delivered
                                            : colors.textSecondary,
                                },
                            ]}
                        >
                            {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1)}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Action Button */}
            <View style={styles.footer}>
                {order.status === 'ready' && (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleStartDelivery}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.primaryBtnText}>Start Delivery</Text>
                    </TouchableOpacity>
                )}

                {order.status === 'in-transit' && (
                    <TouchableOpacity
                        style={[styles.primaryBtn, delivering && styles.disabledBtn]}
                        onPress={handleDeliverOrder}
                        disabled={delivering}
                    >
                        {delivering ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
                                <Text style={styles.primaryBtnText}>Mark Delivered</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {order.status === 'delivered' && (
                    <View style={[styles.primaryBtn, styles.completedBtn]}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
                        <Text style={styles.primaryBtnText}>Delivered</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: colors.textMuted },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1, marginLeft: 12 },
    statusIcon: { alignItems: 'flex-end' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    content: { paddingHorizontal: 16, paddingVertical: 12 },
    mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
    map: { flex: 1 },
    card: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    customerInfo: { gap: 12, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
    infoValue: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    actionButtons: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: `${colors.primary}15` },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    itemQuantity: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    itemPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    totalLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    totalPrice: { fontSize: 16, fontWeight: '800', color: colors.primary },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
    paymentLabel: { fontSize: 12, color: colors.textMuted },
    paymentValue: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    footer: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.background },
    primaryBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
    primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    disabledBtn: { opacity: 0.6 },
    completedBtn: { backgroundColor: colors.delivered },
});
