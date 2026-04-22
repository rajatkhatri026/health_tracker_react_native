module.exports = {
  expo: {
    name: 'Nexara',
    slug: 'nexara',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.rajatkhatri.nexara',
      googleServicesFile: './GoogleService-Info.plist',
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

    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            // Build React Native from source (required when use_frameworks!
            // + use_modular_headers! are combined with @react-native-firebase,
            // because the prebuilt React-Core xcframework cannot expose
            // modular headers).
            buildReactNativeFromSource: true,
          },
        },
      ],
      '@react-native-community/datetimepicker',
      // expo-notifications plugin temporarily disabled — personal Apple team
      // cannot sign the push notifications entitlement. Re-enable when you
      // have a paid Apple Developer account.
      // [
      //   'expo-notifications',
      //   {
      //     icon: './assets/icon.png',
      //     color: '#7C3AED',
      //     sounds: [],
      //     androidMode: 'default',
      //     androidCollapsedTitle: 'Nexara',
      //   },
      // ],
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
