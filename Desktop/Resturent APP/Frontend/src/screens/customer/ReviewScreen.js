import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../styles/colors';

export default function ReviewScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reviews</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, color: colors.textPrimary },
});
