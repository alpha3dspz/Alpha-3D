import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alpha3d.studio',
  appName: 'Alpha 3D Studio',
  webDir: 'out',
  bundledWebRuntime: false,
  backgroundColor: '#050505',
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;