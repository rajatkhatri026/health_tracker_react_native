module.exports = {
  expo: {
    name: 'Nexara',
    slug: 'nexara',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.health.READ_STEPS',
      ],
      package: 'com.anonymous.nexara',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      apiBaseUrl: process.env.API_BASE_URL,
    },
    plugins: [
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#7C3AED',
          sounds: [],
          androidMode: 'default',
          androidCollapsedTitle: 'Nexara',
        },
      ],
      [
        'react-native-health-connect',
        {
          package: 'com.nexara',
        },
      ],
      [
        'react-native-health',
        {
          healthSharePermission: 'Allow Nexara to read your step count',
          healthUpdatePermission: 'Allow Nexara to update your health data',
        },
      ],
    ],
  },
};
