import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh in development
      fastRefresh: true,
      // Optimize JSX for production
      jsxRuntime: 'automatic',
    }),
  ],
  
  // Build optimization
  build: {
    // Generate manifest for CDN integration
    manifest: true,
    
    // Output directory
    outDir: 'dist',
    
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Optimize chunks
    rollupOptions: {
      input: {
        main: resolve(__dirname, '../index.html'),
      },
      
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor libraries
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns'],
          
          // App-specific chunks
          'auth': ['src/contexts/AuthContext', 'src/pages/auth/LoginPage'],
          'recipe': ['src/components/AIRecipeGenerator', 'src/components/RecipeDisplay', 'src/hooks/useAIRecipeGeneration'],
          'video': ['src/components/RecipeVideo', 'src/hooks/useRecipeVideo'],
        },
        
        // Chunk file naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') : 'chunk';
          return `js/[name]-[hash].js`;
        },
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `media/[name]-[hash].${extType}`;
          }
          
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `img/[name]-[hash].${extType}`;
          }
          
          if (extType === 'css') {
            return `css/[name]-[hash].css`;
          }
          
          return `assets/[name]-[hash].${extType}`;
        },
      },
      
      // External dependencies (for CDN)
      external: process.env.USE_CDN ? ['react', 'react-dom'] : [],
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
      },
      mangle: {
        // Keep function names for better debugging
        keep_fnames: true,
      },
    },
    
    // Target modern browsers for smaller builds
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  
  // Development server optimization
  server: {
    // Enable GZIP compression
    middlewareMode: false,
    
    // CORS for development
    cors: true,
    
    // Proxy API calls
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // Preview server (production build testing)
  preview: {
    port: 4173,
    host: true,
    cors: true,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-hook-form',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  
  // CSS optimization
  css: {
    // CSS Modules configuration
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    
    // PostCSS plugins will be loaded automatically
    postcss: {
      plugins: [
        // Will be loaded from postcss.config.js
      ],
    },
    
    // CSS code splitting
    devSourcemap: true,
  },
  
  // Asset handling
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.hdr'],
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: process.env.NODE_ENV === 'development',
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@components': resolve(__dirname, '../src/components'),
      '@pages': resolve(__dirname, '../src/pages'),
      '@hooks': resolve(__dirname, '../src/hooks'),
      '@lib': resolve(__dirname, '../src/lib'),
      '@types': resolve(__dirname, '../src/types'),
    },
  },
  
  // Environment variables
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // Worker optimization
  worker: {
    format: 'es',
    plugins: [react()],
  },
  
  // Experimental features
  experimental: {
    // Enable build time analytics
    renderBuiltUrl(filename, { hostType, type, hostId }) {
      if (hostType === 'js') {
        // Enable CDN for JS files if configured
        if (process.env.CDN_URL) {
          return `${process.env.CDN_URL}/js/${filename}`;
        }
      }
      
      if (hostType === 'css') {
        // Enable CDN for CSS files if configured
        if (process.env.CDN_URL) {
          return `${process.env.CDN_URL}/css/${filename}`;
        }
      }
      
      return { relative: true };
    },
  },
});
