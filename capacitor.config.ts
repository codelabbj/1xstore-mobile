import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.onexstore.app",
  appName: "1XSTORE",
  webDir: "out",
  //bundledWebRuntime: false,
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: false
  //   }
  // },
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: true,
  //     server: "https://1xstore-mobile-app-1-p3ef20nbk-codelabbjgmailcoms-projects.vercel.app",
  //   }
  // },
  server: {
    // androidScheme: "https",
    url: "https://1xstore-mobile-app.vercel.app",
    cleartext: false
  },
}

export default config
