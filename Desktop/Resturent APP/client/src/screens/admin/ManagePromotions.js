import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import colors from '../../styles/colors';

export default function ManagePromotions({ navigation }) {
    const [promotions, setPromotions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [discount, setDiscount] = useState('');
    const [code, setCode] = useState('');

    // Default promotion dates: start today, end in 7 days
    const formatYMD = (d) => d.toISOString().split('T')[0];
    const today = new Date();
    const defaultFrom = formatYMD(today);
    const plus7 = new Date(today);
    plus7.setDate(plus7.getDate() + 7);
    const defaultUntil = formatYMD(plus7);

    const [validFrom, setValidFrom] = useState(defaultFrom);
    const [validUntil, setValidUntil] = useState(defaultUntil);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [imageUri, setImageUri] = useState('');

    useEffect(() => { fetchPromotions(); }, []);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchPromotions = async () => {
        try { const res = await api.get('/api/promotions/all'); setPromotions(res.data.data || []); }
        catch (e) { console.error(e); }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/api/users');
            setCustomers(res.data.data || []);
        } catch (e) { console.error('Failed to fetch users', e); }
    };

    const pickImage = async () => {
        try {
            // First, request permission
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Permission status:', permission);
            
            // If permission denied, show alert and stop
            if (!permission.granted && permission.status === 'denied') {
                Alert.alert('Permission Denied', 'Please enable photo library access in Settings to add images.');
                return;
            }
            
            // If permission is asking, just try to open picker (permission request happened above)
            const result = await ImagePicker.launchImageLibraryAsync({ 
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                aspect: [4, 3],
                quality: 0.7,
            });
            
            console.log('Image picker result:', result);
            
            // Handle result - check if user didn't cancel
            if (!result.cancelled) {
                if (result.assets && result.assets.length > 0) {
                    console.log('Setting image URI:', result.assets[0].uri);
                    setImageUri(result.assets[0].uri);
                } else if (result.uri) {
                    console.log('Setting image URI (old format):', result.uri);
                    setImageUri(result.uri);
                }
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const toggleCustomer = (id) => {
        setSelectedCustomers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    };

    const handleSubmit = async () => {
        if (!title || !discount || !validFrom || !validUntil) {
            Alert.alert('Error', 'Please fill required fields');
            return;
        }
        // Normalize and validate dates (accept common delimiters)
        const normalizeDateInput = (input) => {
            if (!input) return null;
            // replace dots or slashes with dashes
            const cleaned = input.replace(/[.\\/]/g, '-').trim();
            const d = new Date(cleaned);
            if (isNaN(d.getTime())) return null;
            return d.toISOString();
        };

        const fromIso = normalizeDateInput(validFrom);
        const untilIso = normalizeDateInput(validUntil);
        if (!fromIso || !untilIso) {
            Alert.alert('Error', 'Please enter valid dates in YYYY-MM-DD format (or use 2026-05-21).');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('discountPercentage', String(parseFloat(discount)));
            formData.append('code', code || `LAGOON${Date.now()}`);
            formData.append('validFrom', fromIso);
            formData.append('validUntil', untilIso);
            if (selectedCustomers.length) formData.append('applicableCustomers', JSON.stringify(selectedCustomers));
            // image
            if (imageUri) {
                const filename = imageUri.split('/').pop();
                const match = /\.([0-9a-z]+)(?:[?#]|$)/i.exec(filename);
                const ext = match ? match[1] : 'jpg';
                const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                formData.append('image', { uri: imageUri, name: filename, type });
            }

            await api.post('/api/promotions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setTitle(''); setDescription(''); setDiscount(''); setCode('');
            setValidFrom(defaultFrom); setValidUntil(defaultUntil); setShowForm(false);
            setSelectedCustomers([]); setImageUri('');
            fetchPromotions();
            Alert.alert('Success', 'Promotion created!');
        } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to create'); }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete', 'Delete this promotion?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/api/promotions/${id}`); fetchPromotions(); }
                    catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            },
        ]);
    };

    const toggleActive = async (id, isActive) => {
        try { await api.put(`/api/promotions/${id}`, { isActive: !isActive }); fetchPromotions(); }
        catch (e) { Alert.alert('Error', 'Failed to update'); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Promotions</Text>
                <TouchableOpacity onPress={() => setShowForm(!showForm)}>
                    <Ionicons name={showForm ? 'close' : 'add'} size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {showForm && (
                <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                    <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title *" placeholderTextColor={colors.textMuted} />
                    <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textMuted} />
                    <TextInput style={styles.input} value={discount} onChangeText={setDiscount} placeholder="Discount % *" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                    <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Promo Code" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />
                    <TextInput style={styles.input} value={validFrom} onChangeText={setValidFrom} placeholder="Valid From (YYYY-MM-DD) *" placeholderTextColor={colors.textMuted} />
                    <TextInput style={styles.input} value={validUntil} onChangeText={setValidUntil} placeholder="Valid Until (YYYY-MM-DD) *" placeholderTextColor={colors.textMuted} />
                    
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Promotion Image (optional)</Text>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={styles.imagePickerBox} 
                        onPress={pickImage}
                    >
                        {imageUri ? (
                            <>
                                <Image source={{ uri: imageUri }} style={styles.imageBig} />
                                <View style={styles.changeImageOverlay}>
                                    <Ionicons name="camera" size={24} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 4 }}>Change Image</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 8 }}>Tap to Pick Image</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>PNG, JPG, GIF (Max 10MB)</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 16 }}>Target Customers (optional)</Text>
                    <FlatList
                        data={customers}
                        horizontal
                        keyExtractor={(u) => u._id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 8 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => toggleCustomer(item._id)}
                                style={[styles.customerChip, selectedCustomers.includes(item._id) && styles.customerChipActive]}
                            >
                                <Text style={[{ fontSize: 13 }, selectedCustomers.includes(item._id) && { color: '#FFF' }]}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
                        <LinearGradient colors={colors.gradientPrimary} style={styles.saveGradient}>
                            <Text style={styles.saveBtnText}>Create Promotion</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            )}

            <FlatList
                data={promotions}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.promoCard}>
                        <View style={styles.promoTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.promoTitle}>{item.title}</Text>
                                <Text style={styles.promoDiscount}>{item.discountPercentage}% OFF • {item.code}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.activeBadge, { backgroundColor: item.isActive ? 'rgba(0,214,143,0.15)' : 'rgba(255,61,113,0.15)' }]}
                                onPress={() => toggleActive(item._id, item.isActive)}
                            >
                                <Text style={{ color: item.isActive ? colors.success : colors.danger, fontSize: 10, fontWeight: '600' }}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.promoValidity}>
                            {new Date(item.validFrom).toLocaleDateString()} - {new Date(item.validUntil).toLocaleDateString()}
                        </Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    formContainer: { paddingHorizontal: 20, paddingVertical: 16, maxHeight: 500 },
    input: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, marginBottom: 8 },
    saveBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4, marginBottom: 16 },
    saveGradient: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700' },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    promoCard: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14, marginBottom: 10 },
    promoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    promoTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    promoDiscount: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
    activeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    promoValidity: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
    deleteBtn: { position: 'absolute', bottom: 14, right: 14, padding: 4 },
    customerChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        marginRight: 8,
    },
    customerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    imagePickerBox: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        overflow: 'hidden',
        marginBottom: 16,
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
    },
    imageBig: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    changeImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
