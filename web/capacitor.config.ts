import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.worldcamera.dashboard',
  appName: 'World Camera Dashboard',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
}

export default config
