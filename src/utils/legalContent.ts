export const PRIVACY_POLICY_DATE = 'April 30, 2026';

export const PRIVACY_POLICY_SECTIONS = [
  {
    heading: '1. Introduction',
    body: 'Nexara ("we", "our", or "us") is committed to protecting your privacy and the confidentiality of your health information. This Privacy Policy explains how we collect, use, store, and protect your personal and health data when you use the Nexara Health Tracker application ("App").\n\nThis policy is designed to comply with the Health Insurance Portability and Accountability Act (HIPAA), the General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA). By using Nexara, you consent to the practices described in this policy.',
  },
  {
    heading: '2. Information We Collect',
    body: 'We collect the following categories of information:\n\n• Identity Data: Full name, date of birth, gender, phone number, and email address.\n\n• Health & Fitness Data (Protected Health Information / PHI): Water intake records, sleep duration and quality, step counts, workout logs, calorie estimates, body weight, height, BMI, blood type, and medical notes.\n\n• Device Data: Device type, operating system version, and app version for debugging and performance monitoring.\n\n• Usage Data: Feature usage patterns and error logs (no PHI is included in logs).\n\n• Authentication Data: Hashed refresh tokens and phone-based OTP verification records.',
  },
  {
    heading: '3. How We Use Your Information',
    body: "We use your information solely for the following purposes:\n\n• To provide, maintain, and improve the health tracking features of the App.\n• To authenticate your identity and secure your account.\n• To calculate health metrics such as BMI, calorie burn, and sleep quality scores.\n• To send you alarm and reminder notifications that you explicitly configure.\n• To generate your personal health data export upon request.\n• To comply with legal obligations and enforce our Terms of Service.\n\nWe do not use your health data for advertising, profiling, or any commercial purpose beyond providing the App's core functionality.",
  },
  {
    heading: '4. HIPAA Notice of Privacy Practices',
    body: 'Nexara handles Protected Health Information (PHI) in accordance with HIPAA requirements:\n\n• PHI is encrypted at rest using AES-256-GCM encryption.\n• PHI is transmitted exclusively over TLS-encrypted HTTPS connections.\n• Access to PHI is logged via audit trails recording the action, timestamp, and user ID.\n• PHI is never disclosed to third parties without your explicit consent, except as required by law.\n• You have the right to access, correct, and request deletion of your PHI at any time.\n• In the event of a data breach affecting your PHI, we will notify you within 60 days as required by the HIPAA Breach Notification Rule.',
  },
  {
    heading: '5. Data Storage & Security',
    body: 'Your data is stored on secured servers hosted on Neon (PostgreSQL), a SOC 2 Type II compliant cloud database provider located in the United States.\n\nSecurity measures include:\n\n• AES-256-GCM encryption for all PHI fields in the database (name, phone, email, DOB, blood type, medical notes).\n• HMAC-SHA256 hashing for all lookup fields to prevent plaintext exposure.\n• SHA-256 hashing for all authentication tokens stored in the database.\n• Auth tokens on your device are stored in the hardware-backed secure enclave (iOS Keychain / Android Keystore) via expo-secure-store.\n• Rate limiting on all API endpoints (100 requests/15min globally; 20/15min on auth routes).\n• Automatic deletion of expired OTP codes and refresh tokens every 24 hours.',
  },
  {
    heading: '6. Data Retention',
    body: "We retain your data for as long as your account is active or as necessary to provide the App's services. Specific retention periods:\n\n• Health metrics and logs: Retained indefinitely while your account is active; deleted within 30 days of account deletion request.\n• OTP codes: Automatically deleted within 24 hours of creation or immediately upon use.\n• Refresh tokens: Expire after 90 days and are automatically purged.\n• Audit logs: Retained for 7 years to comply with HIPAA record-keeping requirements.\n• Exported data files: Not retained on our servers; delivered directly to your device.",
  },
  {
    heading: '7. Third-Party Services',
    body: "Nexara uses the following third-party services, each with their own privacy policies:\n\n• Firebase (Google): Phone number authentication via OTP. Google's Privacy Policy applies to this service (policies.google.com/privacy).\n• Neon (database hosting): Your health data is stored on Neon's PostgreSQL infrastructure (neon.tech/privacy).\n• Ngrok (development only): Used during development for local testing tunnels. Not used in production.\n\nWe do not integrate any advertising SDKs, analytics SDKs, or session recording tools.",
  },
  {
    heading: '8. Your Rights (GDPR & CCPA)',
    body: 'Depending on your location, you may have the following rights:\n\n• Right to Access: Request a copy of all personal data we hold about you (available via the "Export Data" feature).\n• Right to Rectification: Correct inaccurate or incomplete personal data via the Edit Profile feature.\n• Right to Erasure ("Right to Be Forgotten"): Request deletion of your account and all associated data by contacting support@nexara.health.\n• Right to Portability: Export your health data in CSV format at any time.\n• Right to Restrict Processing: Request that we stop processing your data in specific ways.\n• Right to Object: Object to processing of your data for any purpose.\n• Right to Opt Out of Sale: We do not sell your personal data. This right is automatically satisfied.\n\nTo exercise any of these rights, contact us at support@nexara.health. We will respond within 30 days.',
  },
  {
    heading: "9. Children's Privacy",
    body: 'Nexara is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us immediately at support@nexara.health and we will delete the information promptly.',
  },
  {
    heading: '10. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of material changes by displaying a notice within the App at least 30 days before the changes take effect. Your continued use of Nexara after the effective date of the updated policy constitutes your acceptance of the changes.\n\nThe current version and effective date are always displayed at the top of this policy.',
  },
  {
    heading: '11. Contact Us',
    body: 'If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact:\n\nNexara Health\nEmail: support@nexara.health\nPrivacy Officer: privacy@nexara.health\n\nFor HIPAA-related inquiries, you may also file a complaint with the U.S. Department of Health and Human Services Office for Civil Rights at hhs.gov/ocr.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export const TERMS_DATE = 'April 30, 2026';

export const TERMS_SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By downloading, installing, or using the Nexara Health Tracker application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.\n\nThese Terms constitute a legally binding agreement between you ("User") and Nexara Health ("Company"). We reserve the right to update these Terms at any time with notice provided through the App.',
  },
  {
    heading: '2. Medical Disclaimer',
    body: 'IMPORTANT: Nexara is a personal health tracking tool and is NOT a medical device, medical service, or substitute for professional medical advice, diagnosis, or treatment.\n\n• Do not use Nexara to make medical decisions.\n• Always consult a qualified healthcare professional for medical advice.\n• The health metrics calculated by the App (BMI, calorie estimates, sleep scores) are approximations and may not be accurate for your individual situation.\n• In a medical emergency, call your local emergency services immediately.\n\nThe Company assumes no liability for health decisions made based on data provided by the App.',
  },
  {
    heading: '3. Account Registration & Security',
    body: 'To use Nexara you must register using a valid phone number. You are responsible for:\n\n• Maintaining the confidentiality of your account credentials.\n• All activity that occurs under your account.\n• Notifying us immediately of any unauthorized access at support@nexara.health.\n\nYou may not create accounts on behalf of others without authorization, share your account credentials, or use automated methods to create accounts.',
  },
  {
    heading: '4. Permitted Use',
    body: 'You may use Nexara solely for your own personal, non-commercial health tracking purposes. You agree not to:\n\n• Use the App for any unlawful purpose.\n• Attempt to reverse engineer, decompile, or extract source code from the App.\n• Attempt to gain unauthorized access to our servers or infrastructure.\n• Transmit malware, viruses, or malicious code.\n• Scrape, crawl, or systematically extract data from the App.\n• Use the App to harass, harm, or defraud any person.',
  },
  {
    heading: '5. Health Data & Privacy',
    body: "Your health data belongs to you. We act as a data processor on your behalf. Our full data practices are described in the Privacy Policy, which is incorporated into these Terms by reference.\n\nYou grant Nexara a limited, non-exclusive license to store and process your health data solely to provide the App's features. We do not claim ownership of your health data.",
  },
  {
    heading: '6. Intellectual Property',
    body: 'All content, features, and functionality of the App — including but not limited to the design, graphics, code, algorithms, and branding — are the exclusive property of Nexara Health and are protected by copyright, trademark, and other intellectual property laws.\n\nYou are granted a limited, non-exclusive, non-transferable license to use the App for personal purposes only. This license does not include any right to sublicense, sell, or transfer the App.',
  },
  {
    heading: '7. Service Availability',
    body: 'We strive to maintain high availability of the App but do not guarantee uninterrupted service. The App may be temporarily unavailable due to:\n\n• Scheduled maintenance (we will provide advance notice where possible).\n• Unplanned outages or technical issues.\n• Events outside our control (force majeure).\n\nWe are not liable for any loss or inconvenience caused by service interruptions.',
  },
  {
    heading: '8. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEXARA HEALTH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO:\n\n• Loss of data or health information.\n• Personal injury or health consequences from reliance on App data.\n• Unauthorized access to your account.\n• Service interruptions.\n\nOUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE APP SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE 12 MONTHS PRECEDING THE CLAIM.',
  },
  {
    heading: '9. Indemnification',
    body: 'You agree to indemnify, defend, and hold harmless Nexara Health and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:\n\n• Your use of the App in violation of these Terms.\n• Your violation of any applicable law or regulation.\n• Your infringement of any third-party rights.',
  },
  {
    heading: '10. Account Termination',
    body: 'You may delete your account at any time by contacting support@nexara.health. We will delete your data within 30 days of the request.\n\nWe may suspend or terminate your account immediately if you:\n• Violate these Terms.\n• Engage in fraudulent or illegal activity.\n• Pose a security risk to other users or our infrastructure.\n\nUpon termination, your right to use the App ceases immediately.',
  },
  {
    heading: '11. Governing Law & Disputes',
    body: 'These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles.\n\nAny dispute arising from these Terms or your use of the App shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be settled by binding arbitration under the rules of the American Arbitration Association.\n\nYou waive any right to participate in a class action lawsuit or class-wide arbitration.',
  },
  {
    heading: '12. Changes to Terms',
    body: "We reserve the right to modify these Terms at any time. We will provide at least 30 days' notice of material changes via in-app notification. Your continued use of the App after the effective date of updated Terms constitutes acceptance.\n\nIf you do not agree to the updated Terms, you must stop using the App and may request account deletion.",
  },
  {
    heading: '13. Contact',
    body: 'For questions about these Terms, contact:\n\nNexara Health\nEmail: legal@nexara.health\nSupport: support@nexara.health',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export const ABOUT_SECTIONS = [
  {
    heading: 'App Information',
    body: 'Nexara Health Tracker\nVersion 1.0.0 (Build 1)\nPlatform: iOS & Android\n\nA HIPAA-aligned personal health tracker for comprehensive wellness monitoring including steps, sleep, water intake, workouts, and nutrition.',
  },
  {
    heading: 'Technology Stack',
    body: 'Frontend: React Native 0.79 with Expo SDK 53\nBackend: Node.js with Express and TypeScript\nDatabase: PostgreSQL via Neon (serverless)\nAuthentication: Firebase Phone Auth + custom OTP\nNotifications: Expo Notifications\n\nSecurity: AES-256-GCM PHI encryption, HMAC-SHA256 lookup hashes, SHA-256 token hashing, expo-secure-store for device credentials.',
  },
  {
    heading: 'Open Source Acknowledgments',
    body: 'Nexara is built on top of the following open-source libraries:\n\n• React Native (MIT) — facebook.github.io/react-native\n• Expo (MIT) — expo.dev\n• React Navigation (MIT) — reactnavigation.org\n• Prisma (Apache 2.0) — prisma.io\n• Express.js (MIT) — expressjs.com\n• Zod (MIT) — zod.dev\n• bcryptjs (MIT)\n• jsonwebtoken (MIT)\n• axios (MIT)\n• react-native-svg (MIT)\n• expo-linear-gradient (MIT)\n• expo-secure-store (MIT)\n• @react-native-community/datetimepicker (MIT)\n\nFull license texts are available at: nexara.health/licenses',
  },
  {
    heading: 'Data & Privacy',
    body: 'Nexara takes your privacy seriously. All Protected Health Information (PHI) is encrypted at rest and in transit. We are committed to HIPAA compliance and do not sell or share your health data.\n\nFor the full Privacy Policy, tap "Privacy Policy" in the Legal section.',
  },
  {
    heading: 'Support & Feedback',
    body: "We'd love to hear from you!\n\nSupport: support@nexara.health\nFeedback: feedback@nexara.health\nPrivacy: privacy@nexara.health\nLegal: legal@nexara.health\n\nResponse time: within 2 business days.",
  },
  {
    heading: 'Legal',
    body: '© 2026 Nexara Health. All rights reserved.\n\nNexara is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional for medical advice.',
  },
];
