import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { usePremium } from '../../hooks/usePremium';
import { sendChatMessage, type ChatMessage } from '../../api/ai';
import Svg, { Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

const SUGGESTED_PROMPTS = [
  'Am I on track this week? 📊',
  'How can I sleep better? 😴',
  'Create a workout plan for me 💪',
  'What should I eat today? 🥗',
  'Analyze my progress 📈',
  'How much water should I drink? 💧',
];

// Typing indicator dots
const TypingIndicator: React.FC = () => {
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: '#A78BFA',
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
};

// Single message bubble
const MessageBubble: React.FC<{ msg: ChatMessage; fadeAnim: Animated.Value }> = ({
  msg,
  fadeAnim,
}) => {
  const isUser = msg.role === 'user';
  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: SW * 0.78,
        marginBottom: 12,
      }}
    >
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 11 }}>✦</Text>
          </LinearGradient>
          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5 }}>
            NEXARA AI
          </Text>
        </View>
      )}
      {isUser ? (
        <LinearGradient
          colors={['#7C3AED', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 20,
            borderBottomRightRadius: 6,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, fontWeight: '500' }}>
            {msg.content}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 20,
            borderBottomLeftRadius: 6,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#EDE9FE',
          }}
        >
          <Text style={{ color: '#0F0F1A', fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const AICoachScreen: React.FC = () => {
  const { user } = useAuth();
  const { sub } = useSubscription();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnims] = useState<Map<number, Animated.Value>>(new Map());
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Gate — navigate back if not premium
  useEffect(() => {
    if (!isPremium && !sub.isActive && !sub.isPaid) {
      navigation.goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, sub.isActive, sub.isPaid]);

  const getFadeAnim = useCallback(
    (index: number) => {
      if (!fadeAnims.has(index)) {
        const anim = new Animated.Value(0);
        fadeAnims.set(index, anim);
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }).start();
      }
      return fadeAnims.get(index)!;
    },
    [fadeAnims]
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user || loading) return;

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setShowSuggestions(false);
      setLoading(true);
      scrollToBottom();

      try {
        const reply = await sendChatMessage(user.user_id, newMessages);
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        scrollToBottom();
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status: number; data: { message?: string } };
          message?: string;
        };
        const status = axiosErr?.response?.status;
        const serverMsg = axiosErr?.response?.data?.message ?? '';
        const clientMsg = axiosErr?.message ?? '';
        console.error(
          '[AICoach] error status:',
          status,
          'server:',
          serverMsg,
          'client:',
          clientMsg
        );

        let errText = 'Something went wrong. Please try again.';
        if (
          status === 503 ||
          serverMsg.includes('not configured') ||
          serverMsg.includes('API key')
        ) {
          errText =
            'Nexara AI is not configured yet. Please add your OpenAI API key to the backend.';
        } else if (status === 429) {
          errText = 'Too many requests. Please wait a moment and try again.';
        } else if (status === 500) {
          errText = `Server error: ${serverMsg || 'Internal server error'}`;
        } else if (!status) {
          errText = `Network error: ${clientMsg}`;
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: errText }]);
        scrollToBottom();
      } finally {
        setLoading(false);
      }
    },
    [messages, user, loading, scrollToBottom]
  );

  // Welcome message on mount
  useEffect(() => {
    const welcome: ChatMessage = {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0] ?? 'there'} 👋 I'm Nexara AI, your personal health intelligence. I have access to your health data and can give you personalized advice.\n\nWhat would you like to know today?`,
    };
    setMessages([welcome]);
  }, [user?.name]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageBubble msg={item} fadeAnim={getFadeAnim(index)} />
    ),
    [getFadeAnim]
  );

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
      <StatusBar barStyle="dark-content" />

      {/* Background orbs */}
      <Svg width={SW} height={320} style={{ position: 'absolute', top: 0 }}>
        <Defs>
          <SvgGrad id="orb1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </SvgGrad>
          <SvgGrad id="orb2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </SvgGrad>
        </Defs>
        <Circle cx={SW * 0.1} cy={100} r={180} fill="url(#orb1)" />
        <Circle cx={SW * 0.9} cy={60} r={140} fill="url(#orb2)" />
      </Svg>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        onStartShouldSetResponder={() => {
          Keyboard.dismiss();
          return false;
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E4E7F0',
          }}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E4E7F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#0F0F1A', fontSize: 18, lineHeight: 20 }}>‹</Text>
          </TouchableOpacity>

          {/* AI Avatar */}
          <LinearGradient
            colors={['#7C3AED', '#4F46E5', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>✦</Text>
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 16, fontWeight: '800', color: '#0F0F1A', letterSpacing: -0.4 }}
            >
              Nexara AI
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                Powered by GPT-4o · Always learning
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          style={{ flex: 1 }}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 12,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            loading ? (
              <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#06B6D4']}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>✦</Text>
                  </LinearGradient>
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#9CA3AF',
                      fontWeight: '600',
                      letterSpacing: 0.5,
                    }}
                  >
                    NEXARA AI
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                    borderBottomLeftRadius: 6,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#EDE9FE',
                  }}
                >
                  <TypingIndicator />
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggested prompts */}
        {showSuggestions && messages.length <= 1 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                marginBottom: 10,
                letterSpacing: 0.5,
                fontWeight: '600',
              }}
            >
              SUGGESTED
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  onPress={() => sendMessage(prompt)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#EDE9FE',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '500' }}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#E4E7F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#F3F4F8',
              borderWidth: 1,
              borderColor: '#E4E7F0',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              minHeight: 50,
            }}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask me anything, ${firstName}...`}
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                color: '#0F0F1A',
                fontSize: 15,
                maxHeight: 100,
                textAlignVertical: 'center',
                paddingTop: 0,
                paddingBottom: 0,
              }}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={input.trim() && !loading ? ['#7C3AED', '#4F46E5'] : ['#E4E7F0', '#E4E7F0']}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size={14} color="rgba(255,255,255,0.5)" />
                ) : (
                  <Text style={{ fontSize: 16, color: input.trim() ? '#fff' : '#9CA3AF' }}>↑</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
            AI responses are not medical advice
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AICoachScreen;
