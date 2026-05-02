import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            const storedUser = await AsyncStorage.getItem('user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Error loading auth:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const res = await api.post('/api/auth/login', { email, password });
            if (res.data.success) {
                const { token: newToken, ...userData } = res.data.data;
                await AsyncStorage.setItem('token', newToken);
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);
                return { success: true };
            }
        } catch (error) {
            const isNetworkError = !error.response;
            const isInvalidCredentials = error.response?.status === 401;
            return {
                success: false,
                message: isNetworkError
                    ? 'Cannot connect to server. Make sure backend is running and your phone and computer are on the same network.'
                    : isInvalidCredentials
                        ? 'Invalid username or password.'
                        : error.response?.data?.message || 'Login failed',
            };
        }
    };

    const register = async (name, email, password, phone) => {
        try {
            const res = await api.post('/api/auth/register', { name, email, password, phone });
            if (res.data.success) {
                const { token: newToken, ...userData } = res.data.data;
                await AsyncStorage.setItem('token', newToken);
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed',
            };
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedData) => {
        setUser((prev) => ({ ...prev, ...updatedData }));
        AsyncStorage.setItem('user', JSON.stringify({ ...user, ...updatedData }));
    };

    return (
        <AuthContext.Provider
            value={{ 
                user, 
                token, 
                loading, 
                login, 
                register, 
                logout, 
                updateUser, 
                isAdmin: user?.role === 'admin',
                isRider: user?.role === 'rider',
                isCustomer: user?.role === 'customer',
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
