import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeSocket, closeSocket } from './src/services/socketService';
import { API_BASE_URL } from './src/api/axios';

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket when user is authenticated
      initializeSocket(API_BASE_URL);
    } else {
      closeSocket();
    }

    return () => {
      closeSocket();
    };
  }, [user]);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
