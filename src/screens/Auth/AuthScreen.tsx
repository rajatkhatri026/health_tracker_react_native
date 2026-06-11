import React, { useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  Dimensions,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import Svg, {
  Defs,
  LinearGradient as SvgGrad,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Ellipse,
  G,
  Line,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../context/AuthContext';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import LegalModal from '../../components/LegalModal/LegalModal';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_DATE,
  TERMS_SECTIONS,
  TERMS_DATE,
} from '../../utils/legalContent';

const { width, height } = Dimensions.get('window');
const HERO_H = height * 0.3;

// ── Hero decorative SVG ───────────────────────────────────────────────────────
const HeroDecor: React.FC = () => (
  <Svg width={width} height={HERO_H} style={{ position: 'absolute', top: 0 }}>
    <Defs>
      {/* Large soft orb top-right */}
      <RadialGradient id="h1" cx="85%" cy="10%" r="55%">
        <Stop offset="0%" stopColor="#7DD3E8" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
      </RadialGradient>
      {/* Cyan orb bottom-left */}
      <RadialGradient id="h2" cx="10%" cy="90%" r="50%">
        <Stop offset="0%" stopColor="#67E8F9" stopOpacity="0.35" />
        <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
      </RadialGradient>
      {/* Bottom shimmer line gradient */}
      <SvgGrad id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
        <Stop offset="30%" stopColor="rgba(255,255,255,0.35)" />
        <Stop offset="70%" stopColor="rgba(125,211,232,0.5)" />
        <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </SvgGrad>
    </Defs>
    {/* Orbs */}
    <Ellipse
      cx={width * 0.88}
      cy={HERO_H * 0.1}
      rx={width * 0.55}
      ry={HERO_H * 0.75}
      fill="url(#h1)"
    />
    <Ellipse
      cx={width * 0.08}
      cy={HERO_H * 0.95}
      rx={width * 0.45}
      ry={HERO_H * 0.65}
      fill="url(#h2)"
    />
    {/* Decorative rings — pushed to corners */}
    <Circle
      cx={width * 0.92}
      cy={HERO_H * 0.18}
      r={32}
      fill="none"
      stroke="rgba(255,255,255,0.12)"
      strokeWidth={1.5}
    />
    <Circle
      cx={width * 0.92}
      cy={HERO_H * 0.18}
      r={52}
      fill="none"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth={1}
    />
    <Circle
      cx={width * 0.06}
      cy={HERO_H * 0.82}
      r={24}
      fill="none"
      stroke="rgba(103,232,249,0.18)"
      strokeWidth={1}
    />
    {/* Bottom shimmer line */}
    <Path
      d={`M 0 ${HERO_H - 1} L ${width} ${HERO_H - 1}`}
      stroke="url(#shimmer)"
      strokeWidth={1.5}
    />
  </Svg>
);

// Google logo SVG
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path
      fill="#EA4335"
      d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.09-6.09C34.46 3.19 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.24l7.08 5.5C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <Path
      fill="#4285F4"
      d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v8.98h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.18 5.57C43.27 37.28 46.1 31.36 46.1 24.55z"
    />
    <Path
      fill="#FBBC05"
      d="M10.72 28.26A14.55 14.55 0 0 1 9.5 24c0-1.48.25-2.91.72-4.26l-7.08-5.5A23.93 23.93 0 0 0 0 24c0 3.87.93 7.53 2.58 10.76l7.14-5.5z"
    />
    <Path
      fill="#34A853"
      d="M24 47c5.5 0 10.12-1.82 13.49-4.95l-7.18-5.57c-1.82 1.22-4.15 1.95-6.31 1.95-6.26 0-11.57-4.22-13.28-9.93l-7.14 5.5C7.07 41.52 14.82 47 24 47z"
    />
  </Svg>
);

const AuthScreen: React.FC = () => {
  const [au0, au1, au2] = useEntranceAnimation(3, { initialDelay: 60, stagger: 120 });
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      const isCancel =
        e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5' || e?.message === 'SIGN_IN_CANCELLED';
      if (!isCancel) {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleApple = async () => {
    setError('');
    setLoadingApple(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoadingApple(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" />

      {/* Hero — 30% height, logo centered */}
      <Animated.View style={[entranceStyle(au0), { height: height * 0.3 }]}>
        <LinearGradient
          colors={['#0C2340', '#0891B2', '#0C4A6E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            paddingHorizontal: 28,
            paddingBottom: height * 0.3 * 0.18,
          }}
        >
          <HeroDecor />
          <View
            style={{
              shadowColor: '#38BDF8',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 28,
              elevation: 12,
              alignItems: 'flex-start',
            }}
          >
            <NexaraLogo size={52} variant="full" showText textSize={36} />
            <Text
              style={{
                fontSize: 13,
                color: 'rgba(186,230,253,0.8)',
                marginTop: -4,
                fontWeight: '500',
                letterSpacing: 0.4,
                marginLeft: 62,
              }}
            >
              Your Health, Your Way.
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Lower section — plain background, content naturally placed */}
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 32 }}>
        {/* Title */}
        <Animated.View style={[entranceStyle(au1), { marginBottom: 32 }]}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0F0F1A',
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            Sign in or Sign up
          </Text>
          <Text style={{ fontSize: 15, color: '#6B7280', lineHeight: 22 }}>
            One tap to get started. No password needed.
          </Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[entranceStyle(au2), { gap: 12 }]}>
          {/* Google */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loadingGoogle || loadingApple}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: '#E4E7F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
              opacity: loadingGoogle ? 0.6 : 1,
            }}
          >
            {loadingGoogle ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleLogo />}
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F0F1A' }}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleApple}
              disabled={loadingGoogle || loadingApple}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                height: 56,
                borderRadius: 16,
                backgroundColor: '#0F0F1A',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 3,
                opacity: loadingApple ? 0.6 : 1,
              }}
            >
              {loadingApple ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 814 1000">
                  <Path
                    fill="#fff"
                    d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-104.5C159.6 829.5 96 696.3 96 570.7c0-211.3 137.7-323.3 275.1-323.3 70.3 0 128.9 46.3 172.4 46.3 41.8 0 107.5-49 188.2-49 30.4 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
                  />
                </Svg>
              )}
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}

          {/* Error */}
          {error ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}

          {/* Terms */}
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#9CA3AF',
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            By continuing you agree to our{' '}
            <Text
              style={{ color: '#0891B2', fontWeight: '600' }}
              onPress={() => setShowTerms(true)}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: '#0891B2', fontWeight: '600' }}
              onPress={() => setShowPrivacy(true)}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </View>

      <LegalModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
        effectiveDate={TERMS_DATE}
        sections={TERMS_SECTIONS}
      />
      <LegalModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        effectiveDate={PRIVACY_POLICY_DATE}
        sections={PRIVACY_POLICY_SECTIONS}
      />
    </View>
  );
};

export default AuthScreen;
