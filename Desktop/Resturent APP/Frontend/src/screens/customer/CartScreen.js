import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api, { API_BASE_URL } from '../../api/axios';
import colors from '../../styles/colors';

WebBrowser.maybeCompleteAuthSession();

export default function CartScreen({ navigation }) {
    const { cartItems, updateQuantity, removeFromCart, clearCart, getTotal } = useCart();
    const { user } = useAuth();
    const tabBarHeight = useBottomTabBarHeight();
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [cardEnabled, setCardEnabled] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 6.9271,
        longitude: 79.8612,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    });

    const paymentOptions = [
        { key: 'cash', label: 'Cash on Delivery', icon: 'cash-outline', description: 'Pay after receiving your order' },
        { key: 'online', label: 'Online Transfer', icon: 'phone-portrait-outline', description: 'Transfer to our account' },
        { key: 'card', label: 'Card Payment', icon: 'card-outline', description: cardEnabled ? 'Secure checkout via Stripe' : 'Currently unavailable' },
    ];

    useEffect(() => {
        fetchPaymentConfig();
    }, []);

    useEffect(() => {
        setDeliveryAddress(user?.address || '');
    }, [user?.address]);

    const handleUseCurrentLocation = async () => {
        try {
            setFetchingLocation(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow location access to use current location for delivery.');
                return;
            }

            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = current.coords;

            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            setDeliveryLocation({ latitude, longitude, mapUrl });
            setMapRegion((prev) => ({ ...prev, latitude, longitude }));

            const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverse && reverse.length > 0) {
                const item = reverse[0];
                const parts = [item.name, item.street, item.city, item.region, item.country].filter(Boolean);
                setDeliveryAddress(parts.join(', '));
            } else {
                setDeliveryAddress(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
            }
        } catch (error) {
            Alert.alert('Location Error', 'Unable to get your location. Please enter address manually.');
        } finally {
            setFetchingLocation(false);
        }
    };

    const updateAddressFromCoordinates = async (latitude, longitude) => {
        try {
            const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverse && reverse.length > 0) {
                const item = reverse[0];
                const parts = [item.name, item.street, item.city, item.region, item.country].filter(Boolean);
                setDeliveryAddress(parts.join(', '));
            } else {
                setDeliveryAddress(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
            }
        } catch (_) {
            setDeliveryAddress(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
        }
    };

    const handleMapPress = async (event) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setDeliveryLocation({ latitude, longitude, mapUrl });
        setMapRegion((prev) => ({ ...prev, latitude, longitude }));
        await updateAddressFromCoordinates(latitude, longitude);
    };

    const handleMarkerDragEnd = async (event) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setDeliveryLocation({ latitude, longitude, mapUrl });
        setMapRegion((prev) => ({ ...prev, latitude, longitude }));
        await updateAddressFromCoordinates(latitude, longitude);
    };

    const openInGoogleMaps = async () => {
        if (!deliveryLocation?.latitude || !deliveryLocation?.longitude) {
            Alert.alert('No location yet', 'Tap "Use Current Location" first.');
            return;
        }

        try {
            await Linking.openURL(deliveryLocation.mapUrl);
        } catch (_) {
            Alert.alert('Error', 'Could not open Google Maps.');
        }
    };

    const fetchPaymentConfig = async () => {
        try {
            const res = await api.get('/api/payments/config');
            const enabled = !!res.data?.data?.cardEnabled;
            setCardEnabled(enabled);
            if (!enabled && paymentMethod === 'card') {
                setPaymentMethod('cash');
            }
        } catch (_) {
            setCardEnabled(false);
            if (paymentMethod === 'card') {
                setPaymentMethod('cash');
            }
        }
    };

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) {
            Alert.alert('Empty Cart', 'Please add items to your cart first');
            return;
        }

        if (!user) {
            Alert.alert('Login Required', 'Please login or sign up to place an order', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Login', onPress: () => navigation.navigate('Login') },
            ]);
            return;
        }

        if (paymentMethod === 'card' && !cardEnabled) {
            Alert.alert('Card Unavailable', 'Card payment is not configured yet. Please use Cash on Delivery or Online Transfer.');
            return;
        }

        try {
            setProcessingPayment(true);

            const orderData = {
                items: cartItems.map((item) => ({
                    food: item._id,
                    name: item.name,
                    image: item.image,
                    quantity: item.quantity,
                    price: item.price,
                })),
                totalAmount: getTotal(),
                deliveryAddress: deliveryAddress || user?.address || 'Pick up',
                deliveryLocation: deliveryLocation || { latitude: null, longitude: null, mapUrl: '' },
                paymentMethod,
            };

            const orderResponse = await api.post('/api/orders', orderData);
            const createdOrder = orderResponse.data.data;

            if (paymentMethod === 'card') {
                const returnUrl = Linking.createURL('payment-return');
                const sessionResponse = await api.post('/api/payments/stripe/create-checkout-session', {
                    orderId: createdOrder._id,
                    returnUrl,
                });

                const checkoutUrl = sessionResponse.data.data.checkoutUrl;
                const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);

                if (result.type === 'success' && result.url) {
                    const parsed = Linking.parse(result.url);
                    const sessionId = parsed.queryParams?.session_id;

                    if (sessionId) {
                        const verifyResponse = await api.get(`/api/payments/stripe/verify/${sessionId}`);
                        if (verifyResponse.data.success && verifyResponse.data.data.paymentStatus === 'paid') {
                            clearCart();
                            Alert.alert('Payment Successful', 'Your card payment was completed successfully');
                            navigation.navigate('Orders');
                            return;
                        }
                    }
                }

                Alert.alert(
                    'Payment Incomplete',
                    'Please complete the card payment in the browser and return to the app. You can refresh Orders afterward.'
                );
                return;
            }

            clearCart();

            if (paymentMethod === 'online') {
                Alert.alert(
                    'Order Placed',
                    'Your order was placed with online transfer selected. Please complete the transfer and keep the order number.'
                );
            } else {
                Alert.alert('Order Placed! 🎉', 'Your cash on delivery order has been placed successfully');
            }

            navigation.navigate('Orders');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to place order');
        } finally {
            setProcessingPayment(false);
        }
    };

    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <View style={styles.itemImageWrap}>
                {item.image ? (
                    <Image source={{ uri: `${API_BASE_URL}${item.image}` }} style={styles.itemImage} />
                ) : (
                    <View style={styles.itemImagePlaceholder}>
                        <Ionicons name="restaurant" size={24} color={colors.textMuted} />
                    </View>
                )}
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(item._id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                </View>
                <View style={styles.itemMetaRow}>
                    <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity - 1)}>
                            <Ionicons name="remove" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity + 1)}>
                            <Ionicons name="add" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Cart</Text>
                {cartItems.length > 0 && (
                    <TouchableOpacity onPress={clearCart}>
                        <Text style={styles.clearText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={cartItems}
                keyExtractor={(item) => item._id}
                renderItem={renderCartItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="cart-outline" size={80} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>Your cart is empty</Text>
                        <Text style={styles.emptySubtitle}>Add some delicious Sri Lankan dishes!</Text>
                        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Menu')}>
                            <Text style={styles.browseText}>Browse Menu</Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={
                    cartItems.length > 0 ? (
                        <View style={styles.bottomSection}>
                            <Text style={styles.sectionTitle}>Delivery Location</Text>
                            <View style={styles.locationCard}>
                                <TextInput
                                    style={styles.locationInput}
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    placeholder="Enter delivery address"
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                />
                                <MapView
                                    style={styles.locationMap}
                                    region={mapRegion}
                                    onPress={handleMapPress}
                                >
                                    <Marker
                                        coordinate={
                                            deliveryLocation
                                                ? { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude }
                                                : { latitude: mapRegion.latitude, longitude: mapRegion.longitude }
                                        }
                                        draggable
                                        onDragEnd={handleMarkerDragEnd}
                                        title="Delivery location"
                                    />
                                </MapView>
                                <Text style={styles.mapHint}>Tap map to set location or drag the pin to adjust</Text>
                                <View style={styles.locationActions}>
                                    <TouchableOpacity style={styles.locationBtn} onPress={handleUseCurrentLocation} disabled={fetchingLocation}>
                                        <Ionicons name="locate-outline" size={16} color={colors.primary} />
                                        <Text style={styles.locationBtnText}>{fetchingLocation ? 'Locating...' : 'Use Current Location'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.locationBtn} onPress={openInGoogleMaps}>
                                        <Ionicons name="map-outline" size={16} color={colors.primary} />
                                        <Text style={styles.locationBtnText}>Open in Google Maps</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.paymentTitle}>Payment Method</Text>
                            <View style={styles.paymentGrid}>
                                {paymentOptions.map((option) => {
                                    const isActive = paymentMethod === option.key;
                                    const isDisabled = option.key === 'card' && !cardEnabled;
                                    return (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[styles.paymentCard, isActive && styles.paymentCardActive, isDisabled && styles.paymentCardDisabled]}
                                            onPress={() => {
                                                if (isDisabled) {
                                                    Alert.alert('Card Unavailable', 'Card payment is not configured yet. Please use Cash on Delivery or Online Transfer.');
                                                    return;
                                                }
                                                setPaymentMethod(option.key);
                                            }}
                                        >
                                            <View style={[styles.paymentIconWrap, isActive && styles.paymentIconWrapActive]}>
                                                <Ionicons name={option.icon} size={18} color={isActive ? '#FFF' : isDisabled ? colors.textMuted : colors.primary} />
                                            </View>
                                            <Text style={[styles.paymentLabel, isActive && styles.paymentLabelActive, isDisabled && { color: colors.textMuted }]}>{option.label}</Text>
                                            <Text style={[styles.paymentDesc, isDisabled && { color: colors.textMuted }]}>{option.description}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Subtotal</Text>
                                    <Text style={styles.summaryValue}>Rs. {getTotal().toFixed(2)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Delivery</Text>
                                    <Text style={[styles.summaryValue, { color: colors.success }]}>Free</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.summaryRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>Rs. {getTotal().toFixed(2)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.orderButton, processingPayment && { opacity: 0.7 }]} onPress={handlePlaceOrder} disabled={processingPayment}>
                                <LinearGradient colors={colors.gradientPrimary} style={styles.orderGradient}>
                                    <Text style={styles.orderButtonText}>{processingPayment ? 'Processing...' : paymentMethod === 'card' ? 'Pay by Card' : 'Confirm Order'}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
    },
    title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
    clearText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 280 },
    cartItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16,
        padding: 12, marginBottom: 12,
    },
    itemImageWrap: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
    itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    itemImagePlaceholder: {
        width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.backgroundElevated,
    },
    itemContent: { flex: 1, marginLeft: 12, minHeight: 64, justifyContent: 'space-between' },
    itemHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
    itemName: { flex: 1, fontSize: 15, lineHeight: 19, fontWeight: '700', color: colors.textPrimary },
    itemPrice: { fontSize: 14, color: colors.primary, fontWeight: '600' },
    quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        justifyContent: 'center', alignItems: 'center',
    },
    qtyText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
    deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 20 },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    browseButton: {
        backgroundColor: colors.primary, borderRadius: 14,
        paddingHorizontal: 28, paddingVertical: 12, marginTop: 24,
    },
    browseText: { color: '#FFF', fontWeight: '700' },
    bottomSection: {
        backgroundColor: colors.backgroundLight, borderTopWidth: 1, borderTopColor: colors.glassBorder,
        padding: 20,
        marginTop: 8,
        marginHorizontal: -16,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    locationCard: {
        backgroundColor: '#FAFAFC',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        padding: 10,
        marginBottom: 14,
    },
    locationInput: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: colors.textPrimary,
        fontSize: 13,
        backgroundColor: '#FFF',
        textAlignVertical: 'top',
    },
    locationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    locationMap: {
        height: 160,
        borderRadius: 12,
        marginTop: 10,
        overflow: 'hidden',
    },
    mapHint: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 8,
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(122,30,44,0.25)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(122,30,44,0.06)',
    },
    locationBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    paymentTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    paymentGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    paymentCard: {
        flex: 1,
        backgroundColor: '#FAFAFC',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        padding: 10,
    },
    paymentCardActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    paymentCardDisabled: {
        opacity: 0.65,
    },
    paymentIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(122,30,44,0.1)',
        marginBottom: 8,
    },
    paymentIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
    paymentLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    paymentLabelActive: { color: '#FFF' },
    paymentDesc: { fontSize: 10, color: colors.textMuted, marginTop: 3, lineHeight: 13 },
    summaryCard: { marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: colors.textMuted, fontSize: 14 },
    summaryValue: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 8 },
    totalLabel: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
    totalValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
    orderButton: { borderRadius: 16, overflow: 'hidden' },
    orderGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, gap: 8,
    },
    orderButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
