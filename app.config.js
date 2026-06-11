module.exports = {
  expo: {
    name: 'Nexara',
    slug: 'nexara',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    extra: {
      eas: {
        projectId: 'b3f116d2-5a4d-416e-8b91-78c9d560481f',
      },
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.rajatkhatri.nexara',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        UIBackgroundModes: ['audio', 'fetch', 'remote-notification'],
      },
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
      package: 'com.rajatkhatri.nexara',
      googleServicesFile: './google-services.json',
    },
    web: {
      favicon: './assets/favicon.png',
    },

    scheme: 'nexara',
    plugins: [
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.947492576252-id2kb9qn728o7mnlfemt439psbr11qt1',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            buildReactNativeFromSource: true,
          },
          android: {
            minSdkVersion: 26,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#7C3AED',
          sounds: ['./assets/sounds/alarm.wav', './assets/sounds/bedtime.wav'],
          androidMode: 'default',
          androidCollapsedTitle: 'Nexara',
        },
      ],
      'react-native-health-connect',
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
