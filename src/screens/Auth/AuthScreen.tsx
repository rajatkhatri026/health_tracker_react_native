import React, { useState, useId } from 'react';
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
} from 'react-native';
import Svg, {
  Ellipse,
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Path,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import CountryPicker from '../../components/CountryPicker/CountryPicker';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconPhone, IconCheck } from '../../components/icons/Icons';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';

const { width, height } = Dimensions.get('window');
const DEFAULT_COUNTRY = COUNTRY_CODES.find((c) => c.name === 'United States')!;

// ── Colorful Google logo (SVG) ───────────────────────────────────────────────
const GoogleLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
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

// ── Colorful Facebook logo (SVG) ─────────────────────────────────────────────
const FacebookLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
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

// ── Background decoration ────────────────────────────────────────────────────
const BgDecor: React.FC = () => (
  <Svg width={width} height={height} style={{ position: 'absolute' }}>
    <Defs>
      <SvgGrad id="authGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
        <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
      </SvgGrad>
    </Defs>
    <Ellipse cx={width * 0.5} cy={-80} rx={width * 0.9} ry={260} fill="url(#authGrad)" />
    <Circle cx={width * 0.9} cy={height * 0.72} r={100} fill="#7C3AED" fillOpacity="0.05" />
    <Circle cx={0} cy={height * 0.55} r={70} fill="#06B6D4" fillOpacity="0.04" />
  </Svg>
);

const AuthScreen: React.FC = () => {
  const { sendOtp, verifyOtp } = useAuth();
  const recaptchaId = useId().replace(/:/g, '');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState(0);

  const fullPhone = `${country.code}${phoneNumber.trim()}`;

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Enter your phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(fullPhone, recaptchaId);
      setStep('otp');
    } catch (e: any) {
      setRecaptchaKey((k) => k + 1);
      setError(e?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(otp);
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />
        <BgDecor />
        <div key={recaptchaKey} id={recaptchaId} />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 30,
            paddingTop: 90,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ marginBottom: 48 }}>
            <NexaraLogo size={42} variant="full" showText />
          </View>

          <Text
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              fontWeight: '600',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            STEP 2 OF 2
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#fff',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Verify your number
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 22, marginBottom: 36 }}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: '#fff', fontWeight: '600' }}>{fullPhone}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: otp[i] ? 'rgba(124,58,237,0.18)' : COLORS.bgInput,
                  borderWidth: 1.5,
                  borderColor: otp[i] ? '#7C3AED' : COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
                  {otp[i] ?? ''}
                </Text>
              </View>
            ))}
          </View>

          {/* Hidden actual input — sits invisibly over the boxes */}
          <TextInput
            style={{ position: 'absolute', opacity: 0, height: 56, top: 310, left: 0, right: 0 }}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 28 }}>
            Didn&apos;t receive the code?{' '}
            <Text style={{ color: '#A78BFA', fontWeight: '700' }} onPress={handleSendOtp}>
              Resend
            </Text>
          </Text>

          {error ? (
            <View
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.3)',
                borderRadius: RADIUS.sm,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: RADIUS.full,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
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
            style={{ marginTop: 20, alignItems: 'center' }}
          >
            <Text style={{ color: COLORS.textSub, fontSize: 14 }}>← Change Number</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Phone Step (new & returning users both start here) ────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <BgDecor />
      <div key={recaptchaKey} id={recaptchaId} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 30,
          paddingTop: 90,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ marginBottom: 48 }}>
          <NexaraLogo size={42} variant="full" showText />
        </View>

        <Text
          style={{
            fontSize: 13,
            color: COLORS.textMuted,
            fontWeight: '600',
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          WELCOME
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: '#fff',
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          Sign in or Sign up
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 22, marginBottom: 36 }}>
          Enter your phone number to get started.{'\n'}New? We&apos;ll create your account
          automatically.
        </Text>

        {/* Phone input */}
        <Text
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            fontWeight: '700',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          PHONE NUMBER
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
          <CountryPicker selected={country} onSelect={setCountry} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.bgInput,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: RADIUS.md,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <IconPhone size={17} color={COLORS.textMuted} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#fff', marginLeft: 12 }}
              value={phoneNumber}
              onChangeText={(v) => {
                setPhoneNumber(v);
                setError('');
              }}
              placeholder="Phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>
        </View>

        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 28, lineHeight: 18 }}>
          We&apos;ll send a one-time verification code to this number.
        </Text>

        {error ? (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
              borderRadius: RADIUS.sm,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <LinearGradient
          colors={['#7C3AED', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: RADIUS.full,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
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
              {loading ? 'Sending…' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 30 }}>
          <View style={{ flex: 1, height: 0.8, backgroundColor: COLORS.border }} />
          <Text
            style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 }}
          >
            OR CONTINUE WITH
          </Text>
          <View style={{ flex: 1, height: 0.8, backgroundColor: COLORS.border }} />
        </View>

        {/* Social buttons — colorful logos */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 36 }}>
          {/* Google */}
          <TouchableOpacity
            style={{
              flex: 1,
              height: 54,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: 'rgba(234,67,53,0.35)',
              backgroundColor: 'rgba(234,67,53,0.08)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            activeOpacity={0.75}
          >
            <GoogleLogo size={20} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Google</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={{
              flex: 1,
              height: 54,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: 'rgba(24,119,242,0.35)',
              backgroundColor: 'rgba(24,119,242,0.08)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            activeOpacity={0.75}
          >
            <FacebookLogo size={20} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Terms note */}
        <Text
          style={{ textAlign: 'center', fontSize: 12, color: COLORS.textMuted, lineHeight: 18 }}
        >
          By continuing you agree to our <Text style={{ color: '#A78BFA' }}>Terms of Service</Text>{' '}
          and <Text style={{ color: '#A78BFA' }}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;
