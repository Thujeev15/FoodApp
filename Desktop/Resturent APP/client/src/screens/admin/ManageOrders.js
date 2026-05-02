import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import colors from '../../styles/colors';

const allStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
const statusConfig = {
    pending: { icon: 'time', color: colors.pending },
    confirmed: { icon: 'checkmark-circle', color: colors.confirmed },
    preparing: { icon: 'restaurant', color: colors.preparing },
    ready: { icon: 'checkmark-done-circle', color: colors.ready },
    delivered: { icon: 'bicycle', color: colors.delivered },
    cancelled: { icon: 'close-circle', color: colors.cancelled },
};

export default function ManageOrders() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [riderModalVisible, setRiderModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [riders, setRiders] = useState([]);
    const [loadingRiders, setLoadingRiders] = useState(false);

    useEffect(() => { fetchOrders(); }, [filter]);

    const fetchOrders = async () => {
        try {
            let url = '/api/orders/all';
            if (filter) url += `?status=${filter}`;
            const res = await api.get(url);
            setOrders(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

    const fetchAvailableRiders = async () => {
        setLoadingRiders(true);
        try {
            const res = await api.get('/api/orders/riders/available');
            setRiders(res.data.data || []);
        } catch (e) {
            Alert.alert('Error', 'Failed to fetch riders');
        } finally {
            setLoadingRiders(false);
        }
    };

    const updateStatus = (orderId, currentStatus) => {
        const nextStatuses = allStatuses.filter((s) => s !== currentStatus);
        Alert.alert('Update Status', 'Select new status', [
            ...nextStatuses.map((status) => ({
                text: status.charAt(0).toUpperCase() + status.slice(1),
                onPress: async () => {
                    try { await api.put(`/api/orders/${orderId}/status`, { status }); fetchOrders(); }
                    catch (e) { Alert.alert('Error', 'Failed to update'); }
                },
            })),
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleAssignRider = (order) => {
        if (order.status !== 'ready') {
            Alert.alert('Error', 'Order must be in "ready" status to assign a rider');
            return;
        }
        setSelectedOrder(order);
        setRiderModalVisible(true);
        fetchAvailableRiders();
    };

    const confirmAssignRider = async (riderId) => {
        try {
            const res = await api.post(`/api/orders/${selectedOrder._id}/assign-rider`, { riderId });
            if (res.data.success) {
                Alert.alert('Success', 'Rider assigned to order');
                setRiderModalVisible(false);
                fetchOrders();
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to assign rider');
        }
    };

    const handleDeleteOrder = (orderId) => {
        Alert.alert('Delete Order', 'Delete this order permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/api/orders/${orderId}/admin`);
                        fetchOrders();
                        Alert.alert('Deleted', 'Order deleted successfully');
                    } catch (e) {
                        Alert.alert('Error', e.response?.data?.message || 'Failed to delete order');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Orders</Text>
                <Text style={styles.count}>{orders.length}</Text>
            </View>

            <FlatList
                horizontal data={[{ _id: null, name: 'All' }, ...allStatuses.map((s) => ({ _id: s, name: s }))]}
                keyExtractor={(item) => item._id || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.filterBar}
                contentContainerStyle={styles.filterList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.filterChip, filter === item._id && styles.filterActive]}
                        onPress={() => setFilter(item._id)}
                    >
                        <Text style={[styles.filterText, filter === item._id && { color: '#FFF' }]}>
                            {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                renderItem={({ item }) => {
                    const sc = statusConfig[item.status] || statusConfig.pending;
                    return (
                        <View style={styles.orderCard}>
                            <View style={styles.orderTop}>
                                <View>
                                    <Text style={styles.orderId}>#{item._id.slice(-6).toUpperCase()}</Text>
                                    <Text style={styles.orderCustomer}>{item.user?.name} • {item.user?.phone || 'No phone'}</Text>
                                    <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                                </View>
                                <View style={styles.orderActions}>
                                    <TouchableOpacity
                                        style={[styles.statusBtn, { backgroundColor: `${sc.color}20` }]}
                                        onPress={() => updateStatus(item._id, item.status)}
                                    >
                                        <Ionicons name={sc.icon} size={14} color={sc.color} />
                                        <Text style={[styles.statusText, { color: sc.color }]}>{item.status}</Text>
                                        <Ionicons name="chevron-down" size={12} color={sc.color} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteOrder(item._id)}
                                    >
                                        <Ionicons name="trash" size={14} color={colors.cancelled} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            {item.items.map((orderItem, idx) => (
                                <Text key={idx} style={styles.itemLine}>{orderItem.quantity}x {orderItem.name || 'Item'} — Rs.{(orderItem.price * orderItem.quantity).toFixed(0)}</Text>
                            ))}
                            <View style={styles.orderBottom}>
                                <Text style={styles.specialNote}>{item.specialInstructions || ''}</Text>
                                <Text style={styles.orderTotal}>Rs. {item.totalAmount.toFixed(0)}</Text>
                            </View>

                            {/* Rider Assignment Section */}
                            <View style={styles.riderSection}>
                                <View style={styles.riderInfo}>
                                    <Ionicons name="bicycle" size={16} color={colors.primary} />
                                    {item.rider ? (
                                        <View style={styles.riderAssigned}>
                                            <Text style={styles.riderLabel}>Assigned to:</Text>
                                            <Text style={styles.riderName}>{item.rider?.name || 'Loading...'}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.riderLabel}>No rider assigned</Text>
                                    )}
                                </View>
                                {item.status === 'ready' && !item.rider && (
                                    <TouchableOpacity style={styles.assignBtn} onPress={() => handleAssignRider(item)}>
                                        <Ionicons name="add-circle" size={16} color={colors.primary} />
                                        <Text style={styles.assignBtnText}>Assign</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}><Ionicons name="receipt-outline" size={50} color={colors.textMuted} /><Text style={styles.emptyText}>No orders</Text></View>
                }
            />

            {/* Rider Assignment Modal */}
            <Modal
                visible={riderModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRiderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Rider</Text>
                            <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {loadingRiders ? (
                            <View style={styles.centerContent}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : riders.length > 0 ? (
                            <ScrollView style={styles.ridersList} showsVerticalScrollIndicator={false}>
                                {riders.map((rider) => (
                                    <TouchableOpacity
                                        key={rider._id}
                                        style={styles.riderOption}
                                        onPress={() => confirmAssignRider(rider._id)}
                                    >
                                        <View style={styles.riderOptionInfo}>
                                            <Text style={styles.riderOptionName}>{rider.name}</Text>
                                            <View style={styles.riderOptionDetails}>
                                                <Text style={styles.riderOptionPhone}>{rider.phone}</Text>
                                                <Text style={styles.riderOptionVehicle}>
                                                    {rider.vehicleType ? rider.vehicleType.charAt(0).toUpperCase() + rider.vehicleType.slice(1) : 'Vehicle'} • {rider.vehicleNumber}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.riderOptionAvatar}>
                                            <Ionicons name="bicycle" size={24} color={colors.primary} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.centerContent}>
                                <Ionicons name="bicycle-outline" size={50} color={colors.textMuted} />
                                <Text style={styles.noRidersText}>No available riders</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    count: { fontSize: 14, color: colors.textMuted },
    filterBar: { marginBottom: 8 },
    filterList: { paddingHorizontal: 16, paddingVertical: 4, alignItems: 'center' },
    filterChip: {
        minHeight: 44,
        paddingHorizontal: 18,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        marginRight: 10,
    },
    filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: {
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
        includeFontPadding: false,
    },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    orderCard: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 14, marginBottom: 10 },
    orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    orderId: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    orderCustomer: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    orderTime: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    deleteBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.cancelled}15`,
    },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 10 },
    itemLine: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
    orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    specialNote: { fontSize: 11, color: colors.textMuted, flex: 1 },
    orderTotal: { fontSize: 16, fontWeight: '800', color: colors.primary },
    riderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.glassBorder,
    },
    riderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    riderAssigned: { flex: 1 },
    riderLabel: { fontSize: 10, color: colors.textMuted },
    riderName: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 2 },
    assignBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: `${colors.primary}20`,
    },
    assignBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: colors.textMuted, marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    centerContent: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    ridersList: { maxHeight: 400 },
    riderOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    riderOptionInfo: { flex: 1 },
    riderOptionName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    riderOptionDetails: { marginTop: 4 },
    riderOptionPhone: { fontSize: 11, color: colors.textMuted },
    riderOptionVehicle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    riderOptionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noRidersText: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
});

