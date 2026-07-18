/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
  },
  allowedDevOrigins: [
    'http://192.168.0.105',
    'http://192.168.0.109',
    'http://localhost',
    'http://127.0.0.1',
  ],
};

export default nextConfig;