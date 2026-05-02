import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Switch,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import colors from '../../styles/colors';

export default function RiderProfile({ navigation }) {
    const { user, logout, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/riders/orders?status=delivered');
            if (res.data.success) {
                const deliveredOrders = res.data.data || [];
                setDeliveredOrders(deliveredOrders);
                const totalEarnings = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
                setStats({
                    totalDeliveries: deliveredOrders.length,
                    totalEarnings,
                    avgPerDelivery: deliveredOrders.length > 0 ? totalEarnings / deliveredOrders.length : 0,
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAvailability = async () => {
        try {
            const res = await api.post('/api/riders/availability');
            if (res.data.success) {
                setIsAvailable(!isAvailable);
                updateUser({ isAvailable: !isAvailable });
                Alert.alert('Success', res.data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update availability');
        }
    };

    const handleDeleteHistoryItem = (orderId) => {
        Alert.alert('Delete History', 'Remove this order from your history?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/api/riders/orders/${orderId}`);
                        fetchStats();
                        Alert.alert('Deleted', 'Order removed from history.');
                    } catch (error) {
                        Alert.alert('Error', error?.response?.data?.message || 'Failed to delete history item.');
                    }
                },
            },
        ]);
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: () => logout(),
            },
        ]);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters long');
            return;
        }

        try {
            const res = await api.post('/api/auth/change-password', {
                currentPassword,
                newPassword,
                confirmPassword,
            });

            if (res.data.success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(false);
                Alert.alert('Success', 'Password changed successfully');
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.headerSection}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color={colors.primary} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.name}</Text>
                            <Text style={styles.profilePhone}>{user?.phone}</Text>
                        </View>
                    </View>

                    <View style={styles.availabilityCard}>
                        <View>
                            <Text style={styles.availabilityLabel}>Status</Text>
                            <Text style={[styles.availabilityStatus, { color: isAvailable ? colors.delivered : colors.textMuted }]}>
                                {isAvailable ? 'Available' : 'Unavailable'}
                            </Text>
                        </View>
                        <Switch
                            value={isAvailable}
                            onValueChange={handleToggleAvailability}
                            trackColor={{ false: colors.glassBorder, true: colors.primary }}
                        />
                    </View>
                </View>

                {/* Stats Section */}
                {stats && (
                    <View style={styles.statsSection}>
                        <Text style={styles.sectionTitle}>Statistics</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Ionicons name="bicycle" size={24} color={colors.primary} />
                                <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
                                <Text style={styles.statLabel}>Deliveries</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Ionicons name="cash" size={24} color={colors.delivered} />
                                <Text style={styles.statValue}>Rs. {stats.totalEarnings.toFixed(0)}</Text>
                                <Text style={styles.statLabel}>Total Earnings</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Ionicons name="trending-up" size={24} color={colors.preparing} />
                                <Text style={styles.statValue}>Rs. {stats.avgPerDelivery.toFixed(0)}</Text>
                                <Text style={styles.statLabel}>Avg/Order</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Delivery History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery History</Text>
                    {loading ? (
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : deliveredOrders.length > 0 ? (
                        deliveredOrders.map((order) => (
                            <View key={order._id} style={styles.historyCard}>
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyId}>#{order._id.slice(-6).toUpperCase()}</Text>
                                    <Text style={styles.historyDate}>
                                        {new Date(order.deliveredAt || order.createdAt).toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.historyActions}>
                                    <Text style={styles.historyAmount}>Rs. {order.totalAmount.toFixed(0)}</Text>
                                    <TouchableOpacity
                                        style={styles.historyDeleteBtn}
                                        onPress={() => handleDeleteHistoryItem(order._id)}
                                    >
                                        <Ionicons name="trash" size={16} color={colors.cancelled} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyHistory}>
                            <Ionicons name="bicycle-outline" size={40} color={colors.textMuted} />
                            <Text style={styles.emptyHistoryText}>No delivered orders yet</Text>
                        </View>
                    )}
                </View>

                {/* Vehicle Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehicle Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="car" size={18} color={colors.primary} />
                                <Text style={styles.infoLabelText}>Vehicle Type</Text>
                            </View>
                            <Text style={styles.infoValue}>
                                {user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : 'Not Set'}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="document" size={18} color={colors.primary} />
                                <Text style={styles.infoLabelText}>Vehicle Number</Text>
                            </View>
                            <Text style={styles.infoValue}>
                                {user?.vehicleNumber || 'Not Set'}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="id-card" size={18} color={colors.primary} />
                                <Text style={styles.infoLabelText}>License Number</Text>
                            </View>
                            <Text style={styles.infoValue}>
                                {user?.licenseNumber || 'Not Set'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="mail" size={18} color={colors.primary} />
                                <Text style={styles.infoLabelText}>Email</Text>
                            </View>
                            <Text style={styles.infoValue}>{user?.email}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                                <Text style={styles.infoLabelText}>Role</Text>
                            </View>
                            <Text style={styles.infoValue}>
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoLabel}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.delivered} />
                                <Text style={styles.infoLabelText}>Account Status</Text>
                            </View>
                            <Text style={[styles.infoValue, { color: user?.isActive ? colors.delivered : colors.cancelled }]}>
                                {user?.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <View style={styles.section}>
                    <TouchableOpacity 
                        style={styles.changePasswordBtn} 
                        onPress={() => setShowPasswordModal(true)}
                    >
                        <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                        <Text style={styles.changePasswordBtnText}>Change Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out" size={18} color="#FFF" />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                            {/* Current Password */}
                            <View style={styles.passwordField}>
                                <Text style={styles.fieldLabel}>Current Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showPasswords.current}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Enter current password"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    >
                                        <Ionicons
                                            name={showPasswords.current ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* New Password */}
                            <View style={styles.passwordField}>
                                <Text style={styles.fieldLabel}>New Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showPasswords.new}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password (min 6 characters)"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    >
                                        <Ionicons
                                            name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.passwordField}>
                                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showPasswords.confirm}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    >
                                        <Ionicons
                                            name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowPasswordModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleChangePassword}
                            >
                                <LinearGradient colors={colors.gradientPrimary} style={styles.submitButtonGradient}>
                                    <Text style={styles.submitButtonText}>Change Password</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 100 },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    headerSection: { paddingHorizontal: 16, paddingVertical: 12 },
    profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    profilePhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    availabilityCard: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    availabilityLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    availabilityStatus: { fontSize: 16, fontWeight: '700' },
    statsSection: { paddingHorizontal: 16, paddingVertical: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    statsGrid: { flexDirection: 'row', gap: 10 },
    statItem: {
        flex: 1,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 8,
    },
    statValue: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
    historyCard: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyInfo: { gap: 2 },
    historyId: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    historyDate: { fontSize: 11, color: colors.textMuted },
    historyActions: { alignItems: 'flex-end', gap: 6 },
    historyAmount: { fontSize: 13, fontWeight: '700', color: colors.primary },
    historyDeleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.cancelled}15`,
    },
    emptyHistory: { alignItems: 'center', paddingVertical: 16 },
    emptyHistoryText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    section: { paddingHorizontal: 16, paddingVertical: 8 },
    card: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoLabelText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    infoValue: { fontSize: 12, color: colors.textMuted, textAlign: 'right', flex: 1, marginLeft: 10 },
    divider: { height: 1, backgroundColor: colors.glassBorder },
    logoutBtn: {
        backgroundColor: colors.cancelled,
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginVertical: 16,
    },
    logoutBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    changePasswordBtn: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    changePasswordBtnText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    passwordField: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    passwordInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        marginRight: 10,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    submitButton: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
