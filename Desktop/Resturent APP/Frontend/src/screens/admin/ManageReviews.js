import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import colors from '../../styles/colors';

export default function ManageReviews() {
    const [reviews, setReviews] = useState([]);
    const [riderReviews, setRiderReviews] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [activeTab, setActiveTab] = useState('food');

    useEffect(() => {
        fetchReviews();
        fetchRiderReviews();
    }, []);

    const fetchReviews = async () => {
        try { const res = await api.get('/api/reviews'); setReviews(res.data.data || []); }
        catch (e) { console.error(e); }
    };

    const fetchRiderReviews = async () => {
        try { const res = await api.get('/api/rider-reviews'); setRiderReviews(res.data.data || []); }
        catch (e) { console.error(e); }
    };

    const handleReply = async (reviewId) => {
        if (!replyText.trim()) { Alert.alert('Error', 'Please enter a reply'); return; }
        try {
            const endpoint = activeTab === 'rider' ? `/api/rider-reviews/${reviewId}/reply` : `/api/reviews/${reviewId}/reply`;
            await api.put(endpoint, { adminReply: replyText });
            setReplyingTo(null); setReplyText('');
            if (activeTab === 'rider') {
                fetchRiderReviews();
            } else {
                fetchReviews();
            }
            Alert.alert('Success', 'Reply sent!');
        } catch (e) { Alert.alert('Error', 'Failed to send reply'); }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Review', 'Delete this review?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/api/reviews/${id}`); fetchReviews(); }
                    catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            },
        ]);
    };

    const handleDeleteRiderReview = (id) => {
        Alert.alert('Delete Review', 'Delete this rider review?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/api/rider-reviews/${id}`); fetchRiderReviews(); }
                    catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            },
        ]);
    };

    const activeReviews = activeTab === 'rider' ? riderReviews : reviews;
    const emptyLabel = activeTab === 'rider' ? 'No rider complaints yet' : 'No reviews yet';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Reviews</Text>
                <Text style={styles.count}>{activeReviews.length} reviews</Text>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'food' && styles.tabButtonActive]}
                    onPress={() => { setActiveTab('food'); setReplyingTo(null); setReplyText(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'food' && styles.tabTextActive]}>Food Reviews</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'rider' && styles.tabButtonActive]}
                    onPress={() => { setActiveTab('rider'); setReplyingTo(null); setReplyText(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'rider' && styles.tabTextActive]}>Rider Complaints</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeReviews}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.reviewCard}>
                        <View style={styles.reviewTop}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.user?.name?.[0] || 'U'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.reviewerName}>{item.user?.name}</Text>
                                {activeTab === 'rider' ? (
                                    <Text style={styles.reviewFood}>{item.rider?.name || 'Rider'}</Text>
                                ) : (
                                    <Text style={styles.reviewFood}>{item.food?.name || 'Food Item'}</Text>
                                )}
                            </View>
                            <View style={styles.ratingBadge}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={12} color={colors.gold} />
                                ))}
                            </View>
                        </View>
                        <Text style={styles.comment}>{item.comment}</Text>
                        <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>

                        {item.adminReply && (
                            <View style={styles.replyBox}>
                                <Text style={styles.replyLabel}>🏪 Your Reply:</Text>
                                <Text style={styles.replyText}>{item.adminReply}</Text>
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.replyBtn}
                                onPress={() => { setReplyingTo(replyingTo === item._id ? null : item._id); setReplyText(item.adminReply || ''); }}
                            >
                                <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                                <Text style={styles.replyBtnText}>{item.adminReply ? 'Edit Reply' : 'Reply'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteAction}
                                onPress={() => {
                                    if (activeTab === 'rider') {
                                        handleDeleteRiderReview(item._id);
                                        return;
                                    }
                                    handleDelete(item._id);
                                }}
                            >
                                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            </TouchableOpacity>
                        </View>

                        {replyingTo === item._id && (
                            <View style={styles.replyForm}>
                                <TextInput
                                    style={styles.replyInput}
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    placeholder="Write your reply..."
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                />
                                <TouchableOpacity style={styles.sendBtn} onPress={() => handleReply(item._id)}>
                                    <Ionicons name="send" size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}><Ionicons name="chatbubbles-outline" size={50} color={colors.textMuted} /><Text style={styles.emptyText}>{emptyLabel}</Text></View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    count: { fontSize: 13, color: colors.textMuted },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    reviewCard: { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, marginBottom: 12 },
    tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
    tabButton: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: colors.glassBg,
    },
    tabButtonActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,53,0.1)' },
    tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
    tabTextActive: { color: colors.primary },
    reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    reviewerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    reviewFood: { fontSize: 11, color: colors.textMuted },
    ratingBadge: { flexDirection: 'row', gap: 2 },
    comment: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 10 },
    reviewDate: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
    replyBox: { backgroundColor: 'rgba(255,107,53,0.08)', borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
    replyLabel: { fontSize: 11, color: colors.primary, fontWeight: '700', marginBottom: 4 },
    replyText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    replyBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    deleteAction: { padding: 4 },
    replyForm: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-end' },
    replyInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 12, color: colors.textPrimary, fontSize: 13, maxHeight: 80 },
    sendBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 10 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: colors.textMuted, marginTop: 8 },
});
