import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyConfig = {
  '/proxy/klccc': {
    target: 'https://klccc.dbkl.gov.my',
    changeOrigin: true,
    secure: true,
    headers: {
      origin: 'https://klccc.dbkl.gov.my',
      referer: 'https://klccc.dbkl.gov.my/ms/cctv-images/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/klccc/, ''),
  },
  '/proxy/jalanow': {
    target: 'https://www.jalanow.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/proxy\/jalanow/, ''),
  },
  '/proxy/mysgroad': {
    target: 'https://www.mysgroad.com',
    changeOrigin: true,
    secure: true,
    headers: {
      referer: 'https://www.mysgroad.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/mysgroad/, ''),
  },
  '/proxy/fujigoko': {
    target: 'https://cam.fujigoko.tv',
    changeOrigin: true,
    secure: true,
    headers: {
      origin: 'https://live.fujigoko.tv',
      referer: 'https://live.fujigoko.tv/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/fujigoko/, ''),
  },
  '/proxy/fujinomiya': {
    target: 'https://www.fujinomiya-camera.jp',
    changeOrigin: true,
    secure: true,
    headers: {
      referer: 'https://www.fujinomiya-camera.jp/livecam.htm',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/fujinomiya/, ''),
  },
  '/proxy/fujisabo': {
    target: 'https://www.cbr.mlit.go.jp',
    changeOrigin: true,
    secure: true,
    headers: {
      referer: 'https://www.cbr.mlit.go.jp/fujisabo/camera/camera.html',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/fujisabo/, ''),
  },
  '/proxy/jcv': {
    target: 'https://www.jcv.co.jp',
    changeOrigin: true,
    secure: true,
    headers: {
      referer: 'https://www.yukiguni-journey.jp/en/1213/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/jcv/, ''),
  },
  '/proxy/matsumoto': {
    target: 'https://www.city.matsumoto.nagano.jp',
    changeOrigin: true,
    secure: true,
    headers: {
      referer: 'https://visitmatsumoto.com/en/livecamera/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    rewrite: (path: string) => path.replace(/^\/proxy\/matsumoto/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: proxyConfig,
  },
  preview: {
    proxy: proxyConfig,
  },
})
