# VoiceTask — Frontend

React + Vite client for VoiceTask. See the [root README](../README.md) for full setup.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

In development, `/api` is proxied to the backend (see `vite.config.js`). For production builds set `VITE_API_URL` to the backend URL.

- `src/hooks/useVoice.js` — speech recognition (Web Speech API) and text-to-speech
- `src/App.jsx` — conversation flow, delete confirmation, API calls
- `src/components/` — auth screen, task sidebar, voice orb
