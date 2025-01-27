# nightcore.me

Web application that lets you nightcore/speed up any audio file or YouTube video. Audio processing happens directly in your browser - only YouTube metadata is fetched server-side.

[![nightcore.me](./public/screenshot.jpeg)](https://nightcore.me)

## Features

- Real-time audio playback with adjustable speed
- Responsive UI with dark/light mode support
- Client-side audio processing for maximum privacy
- Export as WAV (lossless) or MP3
- Multiple playback speeds (0.75x to 2x)

## How it works

1. **File Upload**
   - User uploads an audio file or enters a YouTube link
   - For YouTube links, metadata is fetched server-side to get title and thumbnail

2. **Audio Processing**
   - For direct uploads: File is read as ArrayBuffer
   - For YouTube: Audio stream is fetched and converted to ArrayBuffer
   - ArrayBuffer is decoded into AudioBuffer using Web Audio API

3. **Playback**
   - Tone.js Player creates an audio source from the AudioBuffer
   - Real-time playback rate adjustment using Tone.js

4. **Export Options**
   - WAV: Direct conversion of AudioBuffer to WAV format
   - MP3: Uses ffmpeg.audio.wasm for client-side MP3 encoding

## Run your own instance

1. **Prerequisites**
   - Node.js 18+
   - Bun

2. **Clone the repository**
```bash
git clone https://github.com/markie-dev/nightcore.me.git
cd nightcore.me
```

3. **Install dependencies**
```bash
bun i
```

4. **Set environment variables** - Create a `.env.local` file in the root of the project with the following variables:
```properties
YOUTUBE_COOKIE=<your-youtube-cookie>
YOUTUBE_POT=<your-potoken>
```
> [!WARNING]
> You can get your YoutTube cookies by following the guide [here](https://github.com/distubejs/ytdl-core/).

> [!WARNING]
> You can get your POToken by following the guide [here](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide/).

4. **Run the development server**
```bash
bun run dev
```

## Credits

- [ffmpeg.audio.wasm](https://github.com/JorenSix/ffmpeg.audio.wasm) by JorenSix at IPEM, Ghent University
- [Tone.js](https://github.com/Tonejs/Tone.js) by Yotam Mann
- [@distube/ytdl-core](https://github.com/distubejs/ytdl-core) by distubejs
