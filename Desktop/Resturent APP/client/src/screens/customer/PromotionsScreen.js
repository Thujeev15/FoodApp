import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api/axios';
import colors from '../../styles/colors';

const screenWidth = Dimensions.get('window').width;
const imageWidth = screenWidth - 32;

export default function PromotionsScreen({ navigation }) {
    const [promotions, setPromotions] = useState([]);
    const [imageErrors, setImageErrors] = useState({});

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await api.get('/api/promotions');
            console.log('Fetched promotions:', res.data.data);
            if (res.data.data && res.data.data.length > 0) {
                res.data.data.forEach(promo => {
                    console.log(`Promo: title="${promo.title}", image="${promo.image}"`);
                });
            }
            setPromotions(res.data.data || []);
        } catch (e) { console.error('Error fetching promotions:', e); }
    };

    const handleImageError = (promoId, error) => {
        console.error(`Image failed to load for ${promoId}:`, error);
        setImageErrors(prev => ({ ...prev, [promoId]: true }));
    };

    const renderPromo = ({ item, index }) => {
        const imageUri = item.image ? `${API_BASE_URL}${item.image}` : null;
        const hasError = imageErrors[item._id];
        
        console.log(`Rendering "${item.title}" - image="${item.image}", uri="${imageUri}"`);

        return (
            <View style={styles.promoCard}>
                {item.image && !hasError ? (
                    <Image 
                        source={{ uri: imageUri }}
                        style={{ width: imageWidth, height: 200, resizeMode: 'cover' }}
                        onError={(error) => handleImageError(item._id, error)}
                    />
                ) : item.image && hasError ? (
                    <View style={[styles.imageErrorContainer]}>
                        <Ionicons name="alert-circle-outline" size={40} color="#999" />
                        <Text style={{ color: '#999', marginTop: 8 }}>Image unavailable</Text>
                    </View>
                ) : null}
                <LinearGradient
                    colors={index % 3 === 0 ? colors.gradientPrimary : index % 3 === 1 ? colors.gradientGold : colors.gradientSuccess}
                    style={[styles.promoGradient, item.image && !hasError && styles.promoGradientOverlay]}
                >
                    <View style={styles.promoContent}>
                        <Text style={styles.promoDiscount}>{item.discountPercentage}% OFF</Text>
                        <Text style={styles.promoTitle}>{item.title}</Text>
                        <Text style={styles.promoDesc}>{item.description}</Text>
                        <View style={styles.codeBox}>
                            <Text style={styles.codeLabel}>Promo Code</Text>
                            <Text style={styles.codeValue}>{item.code}</Text>
                        </View>
                        <Text style={styles.promoValidity}>
                            Valid: {new Date(item.validFrom).toLocaleDateString()} - {new Date(item.validUntil).toLocaleDateString()}
                        </Text>
                    </View>
                    <Ionicons name="pricetag" size={80} color="rgba(255,255,255,0.15)" style={styles.promoIcon} />
                </LinearGradient>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
                <Text style={styles.title}>Promotions</Text>
            </View>
            <FlatList
                data={promotions}
                keyExtractor={(item) => item._id}
                renderItem={renderPromo}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="pricetag-outline" size={60} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No active promotions</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    promoCard: { marginBottom: 16, borderRadius: 20, overflow: 'hidden', minHeight: 200 },
    imageErrorContainer: { width: imageWidth, height: 200, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    promoGradient: { padding: 24, position: 'relative', minHeight: 180 },
    promoGradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 16, minHeight: 'auto' },
    promoContent: {},
    promoDiscount: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    promoTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 4 },
    promoDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 20 },
    codeBox: {
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 8, marginTop: 14, alignSelf: 'flex-start',
    },
    codeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    codeValue: { fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
    promoValidity: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 10 },
    promoIcon: { position: 'absolute', right: 16, bottom: 20 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyText: { color: colors.textMuted, fontSize: 16, marginTop: 12 },
});
