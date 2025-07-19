// src/components/RouteGuard.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B22020" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export default RouteGuard;