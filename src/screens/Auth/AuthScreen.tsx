import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
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
import { useAuth } from '../../context/AuthContext';
import { getDefaultCountry, validatePhone } from '../../utils/countryCodes';
import { RADIUS } from '../../utils/theme';
import { IconPhone, IconCheck } from '../../components/icons/Icons';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import LegalModal from '../../components/LegalModal/LegalModal';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_DATE,
  TERMS_SECTIONS,
  TERMS_DATE,
} from '../../utils/legalContent';

const { width, height } = Dimensions.get('window');
const DEFAULT_COUNTRY = getDefaultCountry();
const HERO_H = height * 0.3;

// ── Google logo ──────────────────────────────────────────────────────────────
const GoogleLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#EA4335"
      d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 6.9 6.4 3.2 14.3l7 5.4C12 13.6 17.5 9.5 24 9.5z"
    />
    <Path
      fill="#4285F4"
      d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.9-2.2 5.4-4.7 7l7.3 5.7c4.3-4 6.7-9.9 7.2-16.7z"
    />
    <Path
      fill="#FBBC05"
      d="M10.2 28.6A14.8 14.8 0 019.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.9 23.9 0 000 24c0 3.9.9 7.5 2.6 10.7l7.6-6.1z"
    />
    <Path
      fill="#34A853"
      d="M24 47c5.6 0 10.3-1.8 13.7-5l-7.3-5.7c-1.9 1.3-4.4 2.1-6.4 2.1-6.5 0-12-4.1-14-9.8l-7.6 6.1C6.9 41.6 14.8 47 24 47z"
    />
  </Svg>
);

// ── Facebook logo ────────────────────────────────────────────────────────────
const FacebookLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#1877F2"
      d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24c0 12 8.8 21.9 20.2 23.7V30.9h-6.1V24h6.1v-5.3c0-6 3.6-9.3 9-9.3 2.6 0 5.4.5 5.4.5v5.9h-3c-3 0-3.9 1.8-3.9 3.7V24h6.6l-1.1 6.9h-5.6v16.8C39.2 45.9 48 36 48 24z"
    />
    <Path
      fill="#fff"
      d="M33.3 30.9l1.1-6.9h-6.6v-4.5c0-1.9.9-3.7 3.9-3.7h3v-5.9s-2.7-.5-5.4-.5c-5.4 0-9 3.3-9 9.3V24h-6.1v6.9h6.1v16.8a24.1 24.1 0 007.5 0V30.9h5.5z"
    />
  </Svg>
);

// ── Hero decorative SVG ───────────────────────────────────────────────────────
const HeroDecor: React.FC = () => (
  <Svg width={width} height={HERO_H} style={{ position: 'absolute', top: 0 }}>
    <Defs>
      {/* Large soft orb top-right */}
      <RadialGradient id="h1" cx="85%" cy="10%" r="55%">
        <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
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
        <Stop offset="70%" stopColor="rgba(167,139,250,0.5)" />
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

const AuthScreen: React.FC = () => {
  const [au0, au1, au2, au3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 100 });
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [phoneFocused, setPhoneFocused] = useState(false);

  const fullPhone = `${DEFAULT_COUNTRY.code}${phoneNumber.trim()}`;

  const handleSendOtp = async () => {
    const digits = phoneNumber.trim().replace(/\s|-/g, '');
    const phoneError = validatePhone(digits, DEFAULT_COUNTRY);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { devOtp: d } = await sendOtp(fullPhone);
      setDevOtp(d);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setError('Enter the 4-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(fullPhone, otp);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          (e?.message?.includes('Network')
            ? 'Cannot reach server. Check your connection.'
            : null) ??
          e?.message ??
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Shared hero section ────────────────────────────────────────────────────
  const Hero = (
    <LinearGradient
      colors={['#1E0B3E', '#5B21B6', '#0C4A6E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: HERO_H,
        width: '100%',
        justifyContent: 'flex-end',
        paddingHorizontal: 28,
        paddingBottom: 28,
      }}
    >
      <HeroDecor />
      {/* Logo with glow shadow */}
      <View
        style={{
          shadowColor: '#A78BFA',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 24,
          elevation: 10,
        }}
      >
        <NexaraLogo size={46} variant="full" showText />
      </View>
      {/* Tagline — aligned to start of wordmark (icon 46 + gap ~10) */}
      <Text
        style={{
          fontSize: 13,
          color: 'rgba(196,181,253,0.85)',
          marginTop: -4,
          marginLeft: 56,
          fontWeight: '500',
          letterSpacing: 0.4,
        }}
      >
        Your intelligent health companion
      </Text>
    </LinearGradient>
  );

  // ── OTP Step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F4F5FA' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />
        {Hero}

        {/* Form card */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: '#EDE9FE',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <Text
                style={{ color: '#7C3AED', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}
              >
                STEP 2 OF 2
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#0F0F1A',
              letterSpacing: -0.4,
              marginBottom: 6,
            }}
          >
            Verify your number
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              lineHeight: 22,
              marginBottom: devOtp ? 16 : 28,
            }}
          >
            We sent a 4-digit code to{' '}
            <Text style={{ color: '#7C3AED', fontWeight: '700' }}>{fullPhone}</Text>
          </Text>

          {devOtp && (
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                borderRadius: 14,
                padding: 14,
                marginBottom: 24,
              }}
            >
              <Text style={{ color: '#15803D', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                DEV MODE — Your OTP
              </Text>
              <Text style={{ color: '#14532D', fontSize: 28, fontWeight: '900', letterSpacing: 8 }}>
                {devOtp}
              </Text>
            </View>
          )}

          {/* OTP boxes */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: otp[i] ? '#EDE9FE' : '#fff',
                  borderWidth: 2,
                  borderColor: otp[i] ? '#7C3AED' : '#E4E7F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: otp[i] ? '#7C3AED' : '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: otp[i] ? 0.15 : 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text style={{ color: '#0F0F1A', fontSize: 24, fontWeight: '800' }}>
                  {otp[i] ?? ''}
                </Text>
              </View>
            ))}
          </View>

          <TextInput
            style={{ position: 'absolute', opacity: 0, height: 64, top: 280, left: 0, right: 0 }}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/\D/g, '').slice(0, 4));
              setError('');
            }}
            keyboardType="numeric"
            maxLength={4}
            autoFocus
          />

          <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
            Didn&apos;t receive the code?{' '}
            <Text
              style={{ color: loading ? '#9CA3AF' : '#7C3AED', fontWeight: '700' }}
              onPress={loading ? undefined : handleSendOtp}
            >
              Resend
            </Text>
          </Text>

          {error ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <LinearGradient
            colors={['#7C3AED', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading}
              style={{
                height: 58,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              {!loading && <IconCheck size={18} color="#fff" />}
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            onPress={() => {
              setStep('phone');
              setOtp('');
              setError('');
            }}
            disabled={loading}
            style={{ marginTop: 18, alignItems: 'center', opacity: loading ? 0.4 : 1 }}
          >
            <Text style={{ color: '#6B7280', fontSize: 14 }}>← Change Number</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Phone Step ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F5FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <Animated.View style={entranceStyle(au0)}>{Hero}</Animated.View>

      {/* Form area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <Animated.View style={[entranceStyle(au1), { marginBottom: 28 }]}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#7C3AED',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            WELCOME TO NEXARA
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0F0F1A',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Sign in or Sign up
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22 }}>
            Enter your phone number to get started.{'\n'}New? We&apos;ll create your account
            automatically.
          </Text>
        </Animated.View>

        {/* Phone input */}
        <Animated.View style={entranceStyle(au2)}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#6B7280',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            PHONE NUMBER
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderWidth: 2,
              borderColor: phoneFocused ? '#7C3AED' : '#E4E7F0',
              borderRadius: 16,
              paddingHorizontal: 16,
              height: 58,
              marginBottom: 8,
              shadowColor: phoneFocused ? '#7C3AED' : '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: phoneFocused ? 0.12 : 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>{DEFAULT_COUNTRY.flag}</Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#0F0F1A',
                marginRight: 12,
                paddingRight: 12,
                borderRightWidth: 1.5,
                borderRightColor: '#E4E7F0',
              }}
            >
              {DEFAULT_COUNTRY.code}
            </Text>
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#0F0F1A', marginLeft: 8 }}
              value={phoneNumber}
              onChangeText={(v) => {
                setPhoneNumber(v.replace(/[^\d\s-]/g, ''));
                setError('');
              }}
              placeholder="Phone number"
              placeholderTextColor="#C4C9D4"
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={DEFAULT_COUNTRY.maxDigits + 2}
              onSubmitEditing={handleSendOtp}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
            />
          </View>

          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 20, lineHeight: 18 }}>
            {DEFAULT_COUNTRY.minDigits === DEFAULT_COUNTRY.maxDigits
              ? `${DEFAULT_COUNTRY.name} numbers are ${DEFAULT_COUNTRY.minDigits} digits.`
              : `${DEFAULT_COUNTRY.name} numbers are ${DEFAULT_COUNTRY.minDigits}–${DEFAULT_COUNTRY.maxDigits} digits.`}
          </Text>

          {error ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* CTA + social */}
        <Animated.View style={entranceStyle(au3)}>
          <LinearGradient
            colors={['#7C3AED', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading}
              style={{
                height: 58,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <IconPhone size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {loading ? 'Sending…' : 'Continue with Phone'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E4E7F0' }} />
            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5 }}>
              OR
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E4E7F0' }} />
          </View>

          {/* Social buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#E4E7F0',
                backgroundColor: '#fff',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
              activeOpacity={0.75}
            >
              <GoogleLogo size={20} />
              <Text style={{ color: '#0F0F1A', fontSize: 14, fontWeight: '600' }}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#E4E7F0',
                backgroundColor: '#fff',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
              activeOpacity={0.75}
            >
              <FacebookLogo size={20} />
              <Text style={{ color: '#0F0F1A', fontSize: 14, fontWeight: '600' }}>Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', lineHeight: 18 }}>
            By continuing you agree to our{' '}
            <Text
              style={{ color: '#7C3AED', fontWeight: '600' }}
              onPress={() => setShowTerms(true)}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: '#7C3AED', fontWeight: '600' }}
              onPress={() => setShowPrivacy(true)}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;
