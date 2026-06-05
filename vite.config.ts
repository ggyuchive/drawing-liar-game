import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The Yorkie SDK is a single ~700 kB dependency that can't be
    // split further without dynamic-importing the whole real-time
    // layer (a post-v1.0 idea). Set the warning ceiling above it so
    // the build stays green; app + React code are split out below.
    chunkSizeWarningLimit: 720,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendor code into its own
        // chunks so the join screen doesn't drag the whole Yorkie SDK
        // in, and so a single 545 kB bundle stops tripping Vite's
        // size warning.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@yorkie-js')) return 'yorkie'
          if (id.includes('/react') || id.includes('/react-dom')) {
            return 'react'
          }
        },
      },
    },
  },
})
