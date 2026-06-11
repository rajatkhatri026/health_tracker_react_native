import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumGate from './PremiumGate';
import { COLORS } from '../../utils/theme';

export function withPremiumGate<P extends object>(
  WrappedScreen: React.ComponentType<P>,
  featureName: string
) {
  return function PremiumGatedScreen(props: P) {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { refresh } = useSubscription();
    const [checked, setChecked] = useState(false);
    const [isActive, setIsActive] = useState(false);

    useFocusEffect(
      useCallback(() => {
        // Wait until user is loaded before checking subscription
        if (!user) return;
        refresh().then((latest) => {
          setIsActive(latest.isActive || latest.isPaid);
          setChecked(true);
        });
      }, [refresh, user])
    );

    // Still loading user or subscription
    if (!user || !checked) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }

    if (!isActive) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <PremiumGate
            visible={true}
            featureName={featureName}
            onClose={() => setTimeout(() => navigation.goBack(), 320)}
          />
        </View>
      );
    }

    return <WrappedScreen {...props} />;
  };
}
