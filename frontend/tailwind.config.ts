import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05060b',
          card: 'rgba(13, 16, 28, 0.7)',
          primary: '#00f0ff',   // Neon Cyan
          secondary: '#bd00ff', // Neon Purple
          accent: '#ff007a',    // Neon Pink
          success: '#00ff66',   // Neon Green
          border: 'rgba(0, 240, 255, 0.15)',
          borderPurple: 'rgba(189, 0, 255, 0.25)',
          muted: '#8f9cae',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(0, 240, 255, 0.15)',
        'neon-pink': '0 0 10px rgba(255, 0, 122, 0.3), 0 0 20px rgba(255, 0, 122, 0.15)',
        'neon-purple': '0 0 10px rgba(189, 0, 255, 0.3), 0 0 20px rgba(189, 0, 255, 0.15)',
        'neon-green': '0 0 10px rgba(0, 255, 102, 0.3), 0 0 20px rgba(0, 255, 102, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-gradient': 'linear-gradient(135deg, #05060b 0%, #0d101c 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
