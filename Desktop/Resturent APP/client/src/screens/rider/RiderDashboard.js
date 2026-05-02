import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import colors from '../../styles/colors';

const statusConfig = {
    ready: { icon: 'checkmark-circle', color: colors.ready, label: 'Ready for Pickup' },
    'in-transit': { icon: 'bicycle', color: colors.preparing, label: 'In Transit' },
    delivered: { icon: 'checkmark-done-circle', color: colors.delivered, label: 'Delivered' },
};

export default function RiderDashboard({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' or 'available'

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/api/riders/dashboard');
            if (res.data.success) {
                setDashboard(res.data.data);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load dashboard');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    const handleAcceptOrder = async (orderId) => {
        try {
            const res = await api.post(`/api/riders/orders/${orderId}/accept`);
            if (res.data.success) {
                Alert.alert('Success', 'Order accepted! Pick up the food now.');
                fetchDashboard();
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept order');
        }
    };

    const renderAssignedOrder = ({ item }) => {
        const statusInfo = statusConfig[item.status] || statusConfig.ready;
        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('RiderOrderDetail', { orderId: item._id })}
            >
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderId}>#{item._id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.customerName}>{item.user?.name}</Text>
                        <Text style={styles.customerPhone}>{item.user?.phone}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.orderDetails}>
                    <View style={styles.addressSection}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.address} numberOfLines={2}>
                            {item.deliveryAddress}
                        </Text>
                    </View>

                    {item.items.length > 0 && (
                        <View style={styles.itemCount}>
                            <Ionicons name="bag" size={16} color={colors.textSecondary} />
                            <Text style={styles.itemCountText}>
                                {item.items.length} item{item.items.length > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}

                    <View style={styles.amountSection}>
                        <Text style={styles.amountLabel}>Total Amount:</Text>
                        <Text style={styles.amount}>Rs. {item.totalAmount.toFixed(0)}</Text>
                    </View>
                </View>

                {item.status === 'ready' && (
                    <TouchableOpacity
                        style={styles.pickupBtn}
                        onPress={() =>
                            navigation.navigate('RiderOrderDetail', {
                                orderId: item._id,
                                action: 'startDelivery',
                            })
                        }
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.pickupBtnText}>Start Delivery</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderAvailableOrder = ({ item }) => (
        <TouchableOpacity
            style={styles.availableOrderCard}
            onPress={() => {
                Alert.alert('Accept Order?', `${item.user?.name} - Rs. ${item.totalAmount.toFixed(0)}`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Accept',
                        onPress: () => handleAcceptOrder(item._id),
                    },
                ]);
            }}
        >
            <View style={styles.availableHeader}>
                <View>
                    <Text style={styles.customerName}>{item.user?.name}</Text>
                    <Text style={styles.customerPhone}>{item.user?.phone}</Text>
                </View>
                <Text style={styles.totalPrice}>Rs. {item.totalAmount.toFixed(0)}</Text>
            </View>

            <View style={styles.availableDetails}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.address} numberOfLines={1}>
                    {item.deliveryAddress}
                </Text>
            </View>

            <View style={styles.acceptBtn}>
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={styles.acceptBtnText}>Accept Order</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Ionicons name="bicycle" size={24} color={colors.primary} />
                    <Text style={styles.statValue}>
                        {dashboard?.assignedOrders?.length || 0}
                    </Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="checkmark-done-circle" size={24} color={colors.delivered} />
                    <Text style={styles.statValue}>{dashboard?.deliveredToday || 0}</Text>
                    <Text style={styles.statLabel}>Delivered</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="receipt" size={24} color={colors.preparing} />
                    <Text style={styles.statValue}>
                        {dashboard?.availableOrders?.length || 0}
                    </Text>
                    <Text style={styles.statLabel}>Available</Text>
                </View>
            </View>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'assigned' && styles.tabActive]}
                    onPress={() => setActiveTab('assigned')}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            activeTab === 'assigned' && styles.tabActiveText,
                        ]}
                    >
                        My Orders ({dashboard?.assignedOrders?.length || 0})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'available' && styles.tabActive]}
                    onPress={() => setActiveTab('available')}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            activeTab === 'available' && styles.tabActiveText,
                        ]}
                    >
                        Available ({dashboard?.availableOrders?.length || 0})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Orders List */}
            <FlatList
                data={
                    activeTab === 'assigned'
                        ? dashboard?.assignedOrders || []
                        : dashboard?.availableOrders || []
                }
                keyExtractor={(item) => item._id}
                renderItem={activeTab === 'assigned' ? renderAssignedOrder : renderAvailableOrder}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={activeTab === 'assigned' ? 'bicycle-outline' : 'bag-outline'}
                            size={50}
                            color={colors.textMuted}
                        />
                        <Text style={styles.emptyText}>
                            {activeTab === 'assigned'
                                ? 'No active orders'
                                : 'No available orders at the moment'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        alignItems: 'center',
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabButtonText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    tabActiveText: { color: '#FFF' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    orderCard: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderId: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    customerName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
    customerPhone: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusLabel: { fontSize: 11, fontWeight: '700' },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 10 },
    orderDetails: { gap: 8 },
    addressSection: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    address: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
    itemCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemCountText: { fontSize: 12, color: colors.textSecondary },
    amountSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    amountLabel: { fontSize: 11, color: colors.textMuted },
    amount: { fontSize: 14, fontWeight: '700', color: colors.primary },
    pickupBtn: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    pickupBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    availableOrderCard: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
    },
    availableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalPrice: { fontSize: 16, fontWeight: '800', color: colors.primary },
    availableDetails: { flexDirection: 'row', gap: 8, marginVertical: 10, alignItems: 'center' },
    acceptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: `${colors.primary}15`,
    },
    acceptBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
});
