import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import colors from '../../styles/colors';

export default function ManageRiders({ navigation }) {
    const [riders, setRiders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRider, setEditingRider] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicleType: '',
        vehicleNumber: '',
        licenseNumber: '',
    });

    useEffect(() => {
        fetchRiders();
    }, []);

    const fetchRiders = async () => {
        try {
            const res = await api.get('/api/users/riders/all');
            if (res.data.success) {
                setRiders(res.data.data || []);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load riders');
            console.error(error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRiders();
        setRefreshing(false);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            phone: '',
            vehicleType: '',
            vehicleNumber: '',
            licenseNumber: '',
        });
        setEditingRider(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (rider) => {
        setEditingRider(rider);
        setFormData({
            name: rider.name || '',
            email: rider.email || '',
            password: '',
            phone: rider.phone || '',
            vehicleType: rider.vehicleType || '',
            vehicleNumber: rider.vehicleNumber || '',
            licenseNumber: rider.licenseNumber || '',
        });
        setModalVisible(true);
    };

    const handleCreateOrUpdateRider = async () => {
        const normalizedVehicleType = formData.vehicleType.trim().toLowerCase();

        if (!formData.name || !formData.email || !formData.phone) {
            Alert.alert('Validation', 'Name, email, and phone are required');
            return;
        }

        setLoading(true);
        try {
            if (editingRider) {
                // Update existing rider
                const res = await api.put(`/api/users/riders/${editingRider._id}`, {
                    name: formData.name,
                    phone: formData.phone,
                    vehicleType: normalizedVehicleType,
                    vehicleNumber: formData.vehicleNumber,
                    licenseNumber: formData.licenseNumber,
                });
                if (res.data.success) {
                    Alert.alert('Success', 'Rider updated successfully');
                    setModalVisible(false);
                    fetchRiders();
                }
            } else {
                // Create new rider
                if (!formData.password) {
                    Alert.alert('Validation', 'Password is required for new rider');
                    setLoading(false);
                    return;
                }
                const res = await api.post('/api/users/riders/create', {
                    ...formData,
                    vehicleType: normalizedVehicleType,
                });
                if (res.data.success) {
                    Alert.alert('Success', `Rider created!\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nShare these credentials with the rider.`);
                    setModalVisible(false);
                    fetchRiders();
                }
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save rider');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRider = (riderId, riderName) => {
        Alert.alert('Delete Rider', `Are you sure you want to delete ${riderName}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.delete(`/api/users/riders/${riderId}`);
                        if (res.data.success) {
                            Alert.alert('Success', 'Rider deleted');
                            fetchRiders();
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete rider');
                    }
                },
            },
        ]);
    };

    const renderRider = ({ item }) => (
        <View style={styles.riderCard}>
            <View style={styles.riderHeader}>
                <View style={styles.riderAvatar}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.riderInfo}>
                    <Text style={styles.riderName}>{item.name}</Text>
                    <Text style={styles.riderEmail}>{item.email}</Text>
                    <Text style={styles.riderPhone}>{item.phone}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <Ionicons
                        name={item.isActive ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={item.isActive ? colors.delivered : colors.cancelled}
                    />
                </View>
            </View>

            <View style={styles.riderDetails}>
                {item.vehicleType && (
                    <View style={styles.detailRow}>
                        <Ionicons name="car" size={14} color={colors.textMuted} />
                        <Text style={styles.detailText}>
                            {item.vehicleType.charAt(0).toUpperCase() + item.vehicleType.slice(1)}
                        </Text>
                    </View>
                )}
                {item.vehicleNumber && (
                    <View style={styles.detailRow}>
                        <Ionicons name="document" size={14} color={colors.textMuted} />
                        <Text style={styles.detailText}>{item.vehicleNumber}</Text>
                    </View>
                )}
                {item.licenseNumber && (
                    <View style={styles.detailRow}>
                        <Ionicons name="id-card" size={14} color={colors.textMuted} />
                        <Text style={styles.detailText}>{item.licenseNumber}</Text>
                    </View>
                )}
            </View>

            <View style={styles.riderActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteRider(item._id, item.name)}
                >
                    <Ionicons name="trash" size={16} color={colors.cancelled} />
                    <Text style={[styles.actionBtnText, { color: colors.cancelled }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Riders</Text>
                <Text style={styles.count}>{riders.length}</Text>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Add Rider</Text>
            </TouchableOpacity>

            <FlatList
                data={riders}
                keyExtractor={(item) => item._id}
                renderItem={renderRider}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="bicycle-outline" size={50} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No riders yet</Text>
                    </View>
                }
            />

            {/* Create/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingRider ? 'Edit Rider' : 'Add New Rider'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Full Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Email *</Text>
                                <TextInput
                                    style={[styles.input, editingRider && styles.disabledInput]}
                                    placeholder="rider@example.com"
                                    value={formData.email}
                                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                                    editable={!editingRider}
                                    placeholderTextColor={colors.textMuted}
                                />
                                <Text style={styles.formHint}>{editingRider ? 'Email cannot be changed' : 'Will be used for login'}</Text>
                            </View>

                            {!editingRider && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Password *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Min 6 characters"
                                        value={formData.password}
                                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                                        secureTextEntry
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Phone *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="+94 71 234 5678"
                                    value={formData.phone}
                                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Vehicle Type</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., bike, car, cycle"
                                    value={formData.vehicleType}
                                    onChangeText={(text) => setFormData({ ...formData, vehicleType: text })}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Vehicle Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., ABC-1234"
                                    value={formData.vehicleNumber}
                                    onChangeText={(text) => setFormData({ ...formData, vehicleNumber: text })}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>License Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Driver's license number"
                                    value={formData.licenseNumber}
                                    onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, loading && styles.disabledBtn]}
                                onPress={handleCreateOrUpdateRider}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                                        <Text style={styles.saveBtnText}>{editingRider ? 'Update' : 'Create'}</Text>
                                    </>
                                )}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    count: { fontSize: 14, color: colors.textMuted },
    addBtn: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    riderCard: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },
    riderHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    riderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    riderInfo: { flex: 1 },
    riderName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    riderEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    riderPhone: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8 },
    riderDetails: { gap: 6, marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 11, color: colors.textMuted },
    riderActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: `${colors.primary}15`,
    },
    deleteBtn: { backgroundColor: `${colors.cancelled}15` },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { color: colors.textMuted, marginTop: 8, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    formContent: { maxHeight: 400, marginBottom: 16 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    input: {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: colors.textPrimary,
        fontSize: 14,
    },
    disabledInput: { opacity: 0.5 },
    formHint: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 16 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        alignItems: 'center',
    },
    cancelBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
    saveBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    disabledBtn: { opacity: 0.6 },
});
