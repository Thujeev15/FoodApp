import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Animated, Easing, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';

const { width } = Dimensions.get('window');

const FOOD_IMAGES = {
    main: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
    left: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    right: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
};

const BACKDROP_IMAGE = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=80';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const floatAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const orbitAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const spinLoop = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        const orbitLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(orbitAnim, {
                    toValue: 1,
                    duration: 2600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(orbitAnim, {
                    toValue: 0,
                    duration: 2600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        floatLoop.start();
        spinLoop.start();
        orbitLoop.start();

        return () => {
            floatLoop.stop();
            spinLoop.stop();
            orbitLoop.stop();
        };
    }, [floatAnim, spinAnim, orbitAnim]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (!result.success) {
            Alert.alert('Login Failed', result.message);
        }
    };

    return (
        <LinearGradient colors={['#101015', '#1A1A22', '#23242D']} style={styles.container}>
            <ImageBackground source={{ uri: BACKDROP_IMAGE }} style={styles.backdropImage} />
            <LinearGradient colors={['rgba(10,10,14,0.32)', 'rgba(16,16,20,0.40)', 'rgba(24,24,28,0.52)']} style={styles.backdropTint} />
            <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.00)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lightBeam} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View style={styles.heroStage}>
                        <View style={styles.orbA} />
                        <View style={styles.orbB} />

                        <Animated.View
                            style={[
                                styles.foodCardMain,
                                {
                                    transform: [
                                        { perspective: 900 },
                                        {
                                            translateY: floatAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, -10],
                                            }),
                                        },
                                        {
                                            rotateY: floatAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['-6deg', '6deg'],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Image source={{ uri: FOOD_IMAGES.main }} style={styles.foodImageMain} />
                            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']} style={styles.cardShade}>
                                <Text style={styles.heroBadge}>SIGNATURE PLATE</Text>
                                <Text style={styles.heroTitle}>3D Flavor Experience</Text>
                            </LinearGradient>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.foodCardSideLeft,
                                {
                                    transform: [
                                        { perspective: 800 },
                                        {
                                            translateY: orbitAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [2, -14],
                                            }),
                                        },
                                        {
                                            rotate: spinAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', '360deg'],
                                            }),
                                        },
                                        { rotateX: '28deg' },
                                    ],
                                },
                            ]}
                        >
                            <Image source={{ uri: FOOD_IMAGES.left }} style={styles.foodImageSide} />
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.foodCardSideRight,
                                {
                                    transform: [
                                        { perspective: 800 },
                                        {
                                            translateY: orbitAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-12, 8],
                                            }),
                                        },
                                        {
                                            rotate: spinAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['360deg', '0deg'],
                                            }),
                                        },
                                        { rotateX: '28deg' },
                                    ],
                                },
                            ]}
                        >
                            <Image source={{ uri: FOOD_IMAGES.right }} style={styles.foodImageSide} />
                        </Animated.View>

                        <Text style={styles.heroSubtitle}>Login to track orders, save favorites, and unlock exclusive menu drops.</Text>
                    </View>

                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="restaurant" size={34} color="#FFFFFF" />
                        </View>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Sign In</Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <LinearGradient colors={colors.gradientPrimary} style={styles.buttonGradient}>
                                <Text style={styles.loginButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                                {!loading && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerText}>
                                Don't have an account?{' '}
                                <Text style={styles.registerHighlight}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backdropImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.34,
    },
    backdropTint: {
        ...StyleSheet.absoluteFillObject,
    },
    lightBeam: {
        position: 'absolute',
        top: 120,
        left: -40,
        width: width + 120,
        height: 220,
        transform: [{ rotate: '-12deg' }],
        opacity: 0.32,
    },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    heroStage: {
        height: 280,
        borderRadius: 28,
        marginBottom: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(32, 6, 12, 0.30)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        overflow: 'hidden',
    },
    orbA: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -35,
        right: -30,
    },
    orbB: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.07)',
        bottom: -25,
        left: -16,
    },
    foodCardMain: {
        width: width - 86,
        height: 170,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
    },
    foodImageMain: { width: '100%', height: '100%' },
    cardShade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 14,
        paddingBottom: 12,
        paddingTop: 20,
    },
    foodCardSideLeft: {
        position: 'absolute',
        left: 22,
        top: 34,
        width: 74,
        height: 74,
        borderRadius: 37,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
    },
    foodCardSideRight: {
        position: 'absolute',
        right: 24,
        top: 32,
        width: 84,
        height: 84,
        borderRadius: 42,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
    },
    foodImageSide: { width: '100%', height: '100%' },
    badgeRow: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
    heroBadge: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', lineHeight: 30 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 12, fontSize: 13, lineHeight: 18, paddingHorizontal: 20, textAlign: 'center' },
    header: { alignItems: 'center', marginBottom: 22 },
    iconCircle: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.42)',
        marginBottom: 12,
    },
    title: { fontSize: 33, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
    formCard: {
        backgroundColor: '#FFFFFF', borderWidth: 1,
        borderColor: '#E9D9DE', borderRadius: 28, padding: 24,
        shadowColor: '#200710',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 22,
        elevation: 8,
    },
    formTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAF7F8', borderWidth: 1,
        borderColor: '#E6DCE0', borderRadius: 14,
        paddingHorizontal: 16, marginBottom: 16, height: 56,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: colors.textPrimary, fontSize: 16 },
    loginButton: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    buttonGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, paddingHorizontal: 32, gap: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5DADD' },
    dividerText: { color: colors.textMuted, marginHorizontal: 16, fontSize: 12 },
    registerButton: { alignItems: 'center' },
    registerText: { color: colors.textSecondary, fontSize: 14 },
    registerHighlight: { color: colors.primary, fontWeight: '700' },
});
