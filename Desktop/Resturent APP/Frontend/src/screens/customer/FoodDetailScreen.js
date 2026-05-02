import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';

const { width } = Dimensions.get('window');

export default function FoodDetailScreen({ navigation, route }) {
    const { foodId } = route.params;
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [food, setFood] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        fetchFood();
        fetchReviews();
    }, []);

    const fetchFood = async () => {
        try {
            const res = await api.get(`/api/foods/${foodId}`);
            setFood(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/api/reviews/food/${foodId}`);
            setReviews(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addToCart(food);
        }
        Alert.alert('Added to Cart', `${quantity}x ${food.name} added to your cart!`, [
            { text: 'Continue Shopping', style: 'cancel' },
            { text: 'View Cart', onPress: () => navigation.navigate('CustomerMain', { screen: 'Cart' }) },
        ]);
    };

    const openReviewModal = () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to write a review.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Login', onPress: () => navigation.navigate('Login') },
            ]);
            return;
        }
        setReviewRating(5);
        setReviewComment('');
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async () => {
        if (!reviewComment.trim()) {
            Alert.alert('Missing Comment', 'Please add a comment for your review.');
            return;
        }

        try {
            setSubmittingReview(true);
            await api.post('/api/reviews', {
                food: foodId,
                rating: reviewRating,
                comment: reviewComment.trim(),
            });
            setReviewModalVisible(false);
            await fetchReviews();
            await fetchFood();
            Alert.alert('Thank you!', 'Your review was submitted.');
        } catch (error) {
            Alert.alert('Review Failed', error?.response?.data?.message || 'Could not submit review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        if (user?.role === 'admin') {
            navigation.navigate('AdminMain');
            return;
        }

        navigation.navigate('CustomerMain');
    };

    if (loading || !food) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="restaurant" size={40} color={colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <>
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    {food.image ? (
                        <Image source={{ uri: `${API_BASE_URL}${food.image}` }} style={styles.heroImage} />
                    ) : (
                        <View style={styles.heroPlaceholder}>
                            <Ionicons name="restaurant" size={80} color={colors.textMuted} />
                        </View>
                    )}
                    <LinearGradient colors={['transparent', colors.background]} style={styles.heroOverlay} />
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        {food.isVegetarian && (
                            <View style={styles.vegBadge}>
                                <Text style={styles.vegText}>🌿 Veg</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.category}>{food.category?.name || 'Uncategorized'}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaCard}>
                            <Ionicons name="star" size={18} color={colors.gold} />
                            <Text style={styles.metaValue}>{food.rating?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.metaLabel}>{food.numReviews} reviews</Text>
                        </View>
                        <View style={styles.metaCard}>
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <Text style={styles.metaValue}>{food.preparationTime}min</Text>
                            <Text style={styles.metaLabel}>Prep Time</Text>
                        </View>
                        <View style={styles.metaCard}>
                            <Ionicons name="flame-outline" size={18} color={colors[food.spiceLevel] || colors.medium} />
                            <Text style={styles.metaValue}>{food.spiceLevel}</Text>
                            <Text style={styles.metaLabel}>Spice</Text>
                        </View>
                    </View>

                    <Text style={styles.descTitle}>Description</Text>
                    <Text style={styles.description}>{food.description}</Text>

                    {food.ingredients?.length > 0 && (
                        <>
                            <Text style={styles.descTitle}>Ingredients</Text>
                            <View style={styles.ingredientRow}>
                                {food.ingredients.map((ing, i) => (
                                    <View key={i} style={styles.ingredientChip}>
                                        <Text style={styles.ingredientText}>{ing}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Reviews */}
                    <View style={styles.reviewSection}>
                        <View style={styles.reviewHeaderRow}>
                            <Text style={styles.descTitle}>Reviews ({reviews.length})</Text>
                            <TouchableOpacity style={styles.addReviewButton} onPress={openReviewModal}>
                                <Ionicons name="create-outline" size={14} color={colors.primary} />
                                <Text style={styles.addReviewText}>Write Review</Text>
                            </TouchableOpacity>
                        </View>
                        {reviews.slice(0, 3).map((review) => (
                            <View key={review._id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAvatar}>
                                        <Text style={styles.avatarText}>{review.user?.name?.[0] || 'U'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reviewerName}>{review.user?.name}</Text>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={12} color={colors.gold} />
                                            ))}
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.reviewComment}>{review.comment}</Text>
                                {review.adminReply && (
                                    <View style={styles.adminReply}>
                                        <Text style={styles.adminReplyLabel}>🏪 Restaurant Reply:</Text>
                                        <Text style={styles.adminReplyText}>{review.adminReply}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>Total Price</Text>
                    <Text style={styles.price}>Rs. {(food.price * quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.quantitySection}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Ionicons name="remove" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                        <Ionicons name="add" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
                    <LinearGradient colors={colors.gradientPrimary} style={styles.addButtonGradient}>
                        <Ionicons name="cart" size={22} color="#FFF" />
                        <Text style={styles.addButtonText}>Add</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
        <Modal visible={reviewModalVisible} transparent animationType="fade" onRequestClose={() => setReviewModalVisible(false)}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Review {food.name}</Text>
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
                        placeholder="Share your experience"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={4}
                    />
                    <View style={styles.modalActionRow}>
                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setReviewModalVisible(false)} disabled={submittingReview}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalSaveButton} onPress={handleSubmitReview} disabled={submittingReview}>
                            <Text style={styles.modalSaveText}>{submittingReview ? 'Submitting...' : 'Submit'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    loadingText: { color: colors.textMuted, marginTop: 12 },
    heroContainer: { height: 300, position: 'relative' },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundElevated },
    heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
    backButton: {
        position: 'absolute', top: 16, left: 16,
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 8,
    },
    infoSection: { paddingHorizontal: 20, paddingBottom: 120 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -10 },
    foodName: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, flex: 1 },
    vegBadge: { backgroundColor: 'rgba(76,175,80,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    vegText: { color: colors.mild, fontSize: 12, fontWeight: '600' },
    category: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    metaCard: {
        flex: 1, alignItems: 'center', backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14,
    },
    metaValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 6 },
    metaLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    descTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 24, marginBottom: 10 },
    description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    ingredientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ingredientChip: {
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    },
    ingredientText: { color: colors.textSecondary, fontSize: 12 },
    reviewSection: { marginTop: 10 },
    reviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    addReviewButton: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    addReviewText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    reviewCard: {
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        borderRadius: 14, padding: 14, marginBottom: 10,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    reviewerName: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { width: '100%', backgroundColor: colors.backgroundLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    modalLabel: { fontSize: 12, color: colors.textMuted, marginTop: 12, marginBottom: 6 },
    starRow: { flexDirection: 'row', gap: 8 },
    modalInput: { borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, padding: 10, color: colors.textPrimary, minHeight: 90 },
    modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    modalCancelButton: { flex: 1, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    modalCancelText: { color: colors.textMuted, fontWeight: '700' },
    modalSaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    modalSaveText: { color: '#FFF', fontWeight: '700' },
    starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    reviewComment: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    adminReply: {
        marginTop: 10, padding: 10, backgroundColor: 'rgba(255,107,53,0.08)', borderRadius: 10,
        borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    adminReplyLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    adminReplyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.backgroundLight, borderTopWidth: 1, borderTopColor: colors.glassBorder,
        padding: 16, paddingBottom: 32,
    },
    priceSection: {},
    priceLabel: { fontSize: 11, color: colors.textMuted },
    price: { fontSize: 22, fontWeight: '900', color: colors.primary },
    quantitySection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
        justifyContent: 'center', alignItems: 'center',
    },
    qtyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    addButton: { borderRadius: 14, overflow: 'hidden' },
    addButtonGradient: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 14, paddingHorizontal: 24,
    },
    addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
