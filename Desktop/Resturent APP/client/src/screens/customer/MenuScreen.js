import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api/axios';
import colors from '../../styles/colors';

const { width } = Dimensions.get('window');

export default function MenuScreen({ navigation, route }) {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(route?.params?.categoryId || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchCategories();
        fetchFoods();
    }, []);

    useEffect(() => {
        fetchFoods();
    }, [selectedCategory, searchQuery]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/api/categories');
            setCategories(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchFoods = async () => {
        setErrorMessage('');
        try {
            const params = {};
            if (selectedCategory) params.category = selectedCategory;
            if (searchQuery) params.search = searchQuery;

            const res = await api.get('/api/foods', { params });
            setFoods(res.data.data || []);
        } catch (e) {
            console.error(e);
            setFoods([]);
            setErrorMessage('Could not load food items. Please check backend connection.');
        }
        finally { setLoading(false); }
    };

    const renderFoodItem = ({ item }) => (
        <TouchableOpacity style={styles.foodCard} onPress={() => navigation.navigate('FoodDetail', { foodId: item._id })}>
            <View style={styles.foodImageWrap}>
                {item.image ? (
                    <Image source={{ uri: `${API_BASE_URL}${item.image}` }} style={styles.foodImage} />
                ) : (
                    <View style={styles.foodImagePlaceholder}>
                        <Ionicons name="restaurant" size={30} color={colors.textMuted} />
                    </View>
                )}
            </View>
            <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.foodDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.foodMeta}>
                    <Text style={styles.foodPrice}>Rs. {item.price}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.gold} />
                        <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
                    </View>
                </View>
                <View style={styles.tagRow}>
                    {item.isVegetarian && (
                        <View style={[styles.tag, { backgroundColor: 'rgba(76,175,80,0.2)' }]}>
                            <Text style={[styles.tagText, { color: colors.mild }]}>🌿 Veg</Text>
                        </View>
                    )}
                    <View style={[styles.tag, { backgroundColor: `rgba(${item.spiceLevel === 'hot' ? '244,67,54' : '255,152,0'},0.15)` }]}>
                        <Text style={styles.tagText}>🌶 {item.spiceLevel}</Text>
                    </View>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>⏱ {item.preparationTime}min</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Menu</Text>
                <Text style={styles.subtitle}>{foods.length} dishes available</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search dishes..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Category Filters */}
            <FlatList
                horizontal
                data={[{ _id: null, name: 'All' }, ...categories]}
                keyExtractor={(item) => item._id || 'all'}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryChip, selectedCategory === item._id && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(item._id)}
                    >
                        <Text style={[styles.categoryText, selectedCategory === item._id && styles.categoryTextActive]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Food List */}
            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            <FlatList
                data={foods}
                keyExtractor={(item) => item._id}
                renderItem={renderFoodItem}
                contentContainerStyle={styles.foodList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="restaurant-outline" size={60} color={colors.textMuted} />
                        <Text style={styles.emptyText}>{loading ? 'Loading dishes...' : 'No dishes found'}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 10 },
    title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14,
        marginHorizontal: 20, marginTop: 16, paddingHorizontal: 16, height: 50,
    },
    searchInput: { flex: 1, marginLeft: 10, color: colors.textPrimary, fontSize: 15 },
    categoryList: { paddingHorizontal: 16, paddingVertical: 16 },
    categoryChip: {
        paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        marginRight: 10,
    },
    categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    categoryTextActive: { color: '#FFF' },
    foodList: { paddingHorizontal: 16, paddingBottom: 100 },
    errorText: { fontSize: 13, color: colors.danger || '#E74C3C', marginHorizontal: 20, marginBottom: 8 },
    foodCard: {
        flexDirection: 'row', backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 18,
        marginBottom: 14, overflow: 'hidden',
    },
    foodImageWrap: { width: 120, height: 130 },
    foodImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    foodImagePlaceholder: {
        width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.backgroundElevated,
    },
    foodInfo: { flex: 1, padding: 12 },
    foodName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    foodDesc: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    foodMeta: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
    },
    foodPrice: { fontSize: 17, fontWeight: '800', color: colors.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingText: { fontSize: 12, color: colors.gold, fontWeight: '600' },
    tagRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    tag: {
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    tagText: { fontSize: 10, color: colors.textSecondary },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: colors.textMuted, fontSize: 16, marginTop: 12 },
});
