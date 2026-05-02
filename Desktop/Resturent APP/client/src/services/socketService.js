import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

export const initializeSocket = async (serverUrl) => {
    if (socket) return socket;

    try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        const userData = user ? JSON.parse(user) : null;

        socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket'],
            auth: {
                token: token,
            },
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected:', socket.id);
            if (userData) {
                socket.emit('joinRoom', userData._id);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });

        return socket;
    } catch (error) {
        console.error('Error initializing socket:', error);
        return null;
    }
};

export const getSocket = () => socket;

export const closeSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

// Event listeners
export const onRiderLocationUpdated = (callback) => {
    if (socket) {
        socket.on('riderLocationUpdated', callback);
    }
};

export const onOrderStatusUpdate = (callback) => {
    if (socket) {
        socket.on('orderStatusUpdate', callback);
    }
};

export const onOrderAssignedToRider = (callback) => {
    if (socket) {
        socket.on('orderAssignedToRider', callback);
    }
};

export const onOrderDelivered = (callback) => {
    if (socket) {
        socket.on('orderDelivered', callback);
    }
};

// Remove listeners
export const offRiderLocationUpdated = () => {
    if (socket) {
        socket.off('riderLocationUpdated');
    }
};

export const offOrderStatusUpdate = () => {
    if (socket) {
        socket.off('orderStatusUpdate');
    }
};

export const offOrderAssignedToRider = () => {
    if (socket) {
        socket.off('orderAssignedToRider');
    }
};

export const offOrderDelivered = () => {
    if (socket) {
        socket.off('orderDelivered');
    }
};
