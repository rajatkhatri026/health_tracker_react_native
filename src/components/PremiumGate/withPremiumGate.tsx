import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPremiumStatus } from '../../hooks/usePremium';
import PremiumGate from './PremiumGate';
import { COLORS } from '../../utils/theme';

/**
 * HOC that wraps a screen with a premium gate.
 * If the user is not premium, shows the PremiumGate bottom sheet
 * and navigates back when dismissed.
 */
export function withPremiumGate<P extends object>(
  WrappedScreen: React.ComponentType<P>,
  featureName: string
) {
  return function PremiumGatedScreen(props: P) {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [gateVisible, setGateVisible] = useState(false);

    useEffect(() => {
      getPremiumStatus().then((v) => {
        setIsPremium(v);
        setLoading(false);
        if (!v) setGateVisible(true);
      });
    }, []);

    if (loading) {
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

    if (!isPremium) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <PremiumGate
            visible={gateVisible}
            featureName={featureName}
            onClose={() => {
              setGateVisible(false);
              setTimeout(() => navigation.goBack(), 320);
            }}
          />
        </View>
      );
    }

    return <WrappedScreen {...props} />;
  };
}
