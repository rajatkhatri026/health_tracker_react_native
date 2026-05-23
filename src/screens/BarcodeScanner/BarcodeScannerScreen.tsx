/* eslint-disable react-hooks/refs */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');
const FRAME = W * 0.72;

interface FoodProduct {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving: string;
  imageUrl: string;
  barcode: string;
}

async function fetchProduct(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,image_url`,
      { headers: { 'User-Agent': 'Nexara/1.0' } }
    );
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const n = p.nutriments ?? {};
    return {
      name: p.product_name || 'Unknown Product',
      brand: p.brands || '',
      calories: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
      protein: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
      carbs: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fat: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
      fiber: Math.round((n['fiber_100g'] ?? 0) * 10) / 10,
      sugar: Math.round((n['sugars_100g'] ?? 0) * 10) / 10,
      sodium: Math.round((n['sodium_100g'] ?? 0) * 1000 * 10) / 10,
      serving: p.serving_size || '100g',
      imageUrl: p.image_url || '',
      barcode,
    };
  } catch {
    return null;
  }
}

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#EF4444', bg: '#FEF2F2' },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#06B6D4', bg: '#ECFEFF' },
  { key: 'fiber', label: 'Fiber', unit: 'g', color: '#10B981', bg: '#ECFDF5' },
  { key: 'sugar', label: 'Sugar', unit: 'g', color: '#EC4899', bg: '#FCE7F3' },
];

export default function BarcodeScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
  const scanCooldown = useRef(false);

  // Scan frame pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const showResult = () => {
    setScanning(false);
    Animated.spring(slideUp, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const resetScan = () => {
    setProduct(null);
    setError('');
    setLastCode('');
    scanCooldown.current = false;
    slideUp.setValue(300);
    setScanning(true);
  };

  const onBarcode = async ({ data }: { data: string }) => {
    if (scanCooldown.current || data === lastCode) return;
    scanCooldown.current = true;
    setLastCode(data);
    setLoading(true);
    setError('');

    const found = await fetchProduct(data);
    setLoading(false);

    if (found) {
      setProduct(found);
      showResult();
    } else {
      setError(`No data found for barcode ${data}`);
      setTimeout(() => {
        scanCooldown.current = false;
        setError('');
      }, 2500);
    }
  };

  // Permission states
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permWrap, { paddingTop: insets.top + 20 }]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>
          Nexara needs your camera to scan food barcodes and log nutrition instantly.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.88}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.permBtnGrad}
          >
            <Text style={styles.permBtnTxt}>Allow Camera</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      {/* ── Camera ── */}
      {scanning && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={loading ? undefined : onBarcode}
        />
      )}

      {/* ── Dark overlay with cutout ── */}
      {scanning && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Top overlay */}
          <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', height: (H - FRAME) / 2 - 20 }} />
          {/* Middle row */}
          <View style={{ flexDirection: 'row', height: FRAME + 40 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            {/* Scan frame */}
            <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulse }] }]}>
              {/* Corner accents */}
              {[
                { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
                { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
                { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
                { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
              ].map((st, i) => (
                <View key={i} style={[styles.corner, st]} />
              ))}
              {/* Scan line */}
              <Animated.View style={styles.scanLine} />
            </Animated.View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
          </View>
          {/* Bottom overlay */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        </View>
      )}

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backCircle}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18, color: '#fff', lineHeight: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.topTitle}>Scan Food</Text>
          <Text style={styles.topSub}>Point at a barcode</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Scan hint ── */}
      {scanning && (
        <View style={styles.hintWrap}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : error ? (
            <Text style={styles.errorTxt}>{error}</Text>
          ) : (
            <Text style={styles.hintTxt}>Align barcode within the frame</Text>
          )}
        </View>
      )}

      {/* ── Result Sheet ── */}
      {product && (
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideUp }], paddingBottom: insets.bottom + 20 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Product header */}
          <View style={styles.productHeader}>
            <LinearGradient colors={['#7C3AED22', '#4F46E511']} style={styles.productIconBg}>
              <Text style={{ fontSize: 36 }}>🍎</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              {!!product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
              <View style={styles.servingPill}>
                <Text style={styles.servingTxt}>per {product.serving}</Text>
              </View>
            </View>
          </View>

          {/* Macros grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.macroScroll}
          >
            {MACROS.map((m) => (
              <View key={m.key} style={[styles.macroCard, { backgroundColor: m.bg }]}>
                <Text style={[styles.macroVal, { color: m.color }]}>{(product as any)[m.key]}</Text>
                <Text style={styles.macroUnit}>{m.unit}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Extra info row */}
          <View style={styles.extraRow}>
            <View style={styles.extraItem}>
              <Text style={styles.extraLabel}>Sodium</Text>
              <Text style={styles.extraVal}>{product.sodium}mg</Text>
            </View>
            <View style={styles.extraDivider} />
            <View style={styles.extraItem}>
              <Text style={styles.extraLabel}>Barcode</Text>
              <Text style={styles.extraVal}>{product.barcode}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.logBtn}
              activeOpacity={0.88}
              onPress={() => {
                Alert.alert('Logged!', `${product.name} added to today\'s calories.`);
                navigation.goBack();
              }}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logBtnGrad}
              >
                <Text style={styles.logBtnTxt}>+ Log to Today</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rescanBtn} onPress={resetScan} activeOpacity={0.88}>
              <Text style={styles.rescanTxt}>↩ Scan Again</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Permission
  permWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permEmoji: { fontSize: 64, marginBottom: 20 },
  permTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  permSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  permBtn: { marginTop: 32, width: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  permBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  permBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  // Scan frame
  scanFrame: {
    width: FRAME,
    height: FRAME + 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#7C3AED' },
  scanLine: {
    width: FRAME - 20,
    height: 2,
    backgroundColor: '#7C3AED',
    opacity: 0.8,
    borderRadius: 1,
  },

  // Hints
  hintWrap: { position: 'absolute', bottom: '22%', left: 0, right: 0, alignItems: 'center' },
  hintTxt: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorTxt: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Result sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Product
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  productIconBg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  productName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  productBrand: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  servingPill: {
    marginTop: 6,
    backgroundColor: '#F3F4F8',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  servingTxt: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // Macros
  macroScroll: { paddingBottom: 4, gap: 10, paddingHorizontal: 2 },
  macroCard: { width: 76, borderRadius: 16, padding: 12, alignItems: 'center' },
  macroVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  macroUnit: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginTop: 1 },
  macroLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Extra
  extraRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgInput,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
  },
  extraItem: { flex: 1, alignItems: 'center' },
  extraLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  extraVal: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  extraDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },

  // Actions
  actions: { gap: 10 },
  logBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  logBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  logBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  rescanBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
  },
  rescanTxt: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
});
