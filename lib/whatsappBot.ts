// @ts-nocheck
import WhatsAppWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const { Client, LocalAuth, Message, MessageMedia } = WhatsAppWeb as any;

export class WhatsappBot {
  client: any;

  constructor() {
    // Keep auth files in the home directory so Turbopack never scans them
    const authDir = `${os.homedir()}/.clearline-wwebjs/${process.env.WA_CLIENT_ID ?? 'clearline-whatsapp'}`;
    const hasSession = existsSync(authDir);

    if (hasSession) {
      console.log('[WA] Existing session found; reusing login.');
    } else {
      console.log('[WA] No session found; scan QR code to login.');
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: process.env.WA_CLIENT_ID ?? 'clearline-whatsapp',
        dataPath: `${os.homedir()}/.clearline-wwebjs`,
      }),
      puppeteer: { headless: true },
    });

    this.registerEvents();
    this.client.initialize();
  }

  registerEvents() {
    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
      console.log('[WA] QR code generated. Scan with your WhatsApp app.');
    });

    this.client.on('ready', () => {
      console.log('[WA] WhatsApp client is ready.');
    });

    this.client.on('authenticated', () => {
      console.log('[WA] Authenticated successfully.');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('[WA] Authentication failure:', msg);
    });

    this.client.on('disconnected', () => {
      console.warn('[WA] Disconnected.');
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  async handleMessage(message: any) {
    try {
      const from = message.from;
      const type = message.type;

      console.log(`[WA] Message from ${from}, type ${type}`);

      if (type === 'chat') {
        await this.handleText(message);
        return;
      }

      if (type === 'location') {
        await this.handleLocation(message);
        return;
      }

      if (type === 'audio' || type === 'ptt') {
        await this.handleAudio(message);
        return;
      }

      if (type === 'image' || type === 'video' || type === 'sticker') {
        await this.handleMedia(message);
        return;
      }

      await message.reply('Message type not supported yet. Send text/location/image/audio.');
    } catch (error) {
      console.error('[WA] handleMessage failed', error);
    }
  }

  // State machine per user phone number
  sessions = new Map<string, {
    step: 'idle' | 'awaiting_location';
    distressMessage?: string;
  }>();

  /** Reverse-geocode lat/lng → city slug using Mapbox. Falls back to 'pune'. */
  async detectCity(lat: number, lng: number): Promise<string> {
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return 'pune';
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return 'pune';
      const data = await res.json() as { features?: { text?: string }[] };
      const city = data.features?.[0]?.text?.toLowerCase().trim() ?? 'pune';
      // Normalise common aliases
      const aliases: Record<string, string> = {
        'mumbai': 'mumbai', 'bombay': 'mumbai',
        'pune': 'pune', 'poona': 'pune',
        'delhi': 'delhi', 'new delhi': 'delhi',
        'bengaluru': 'bengaluru', 'bangalore': 'bengaluru',
      };
      return aliases[city] ?? city;
    } catch {
      return 'pune';
    }
  }

  async handleText(message: any) {
    const text = message.body.trim();
    const lc = text.toLowerCase();
    const from = message.from;

    const session = this.sessions.get(from) || { step: 'idle' };

    // If they just say "cancel" or "stop", reset state
    if (['cancel', 'stop', 'reset'].includes(lc)) {
      this.sessions.delete(from);
      await message.reply('Triage cancelled. Send a new message if you need help.');
      return;
    }
    
    // Greeting
    if (lc === 'hi' || lc === 'hello' || lc === 'hey') {
      await message.reply(
        '👋 Welcome to *Clearline Emergency Triage*.\n\n' +
        'If you are in distress, please *describe your symptoms* in a single message (e.g. "My friend is having severe chest pain").\n\n' +
        '_For immediate life-threatening danger, always call 112._'
      );
      return;
    }

    // Otherwise, treat as distress message and ask for location
    this.sessions.set(from, { step: 'awaiting_location', distressMessage: text });
    await message.reply(
      'Got it. This sounds like an emergency.\n\n' + 
      'To find the nearest capable emergency room, please tap the 📎 attachment button and *Share your Current Location* 📍'
    );
  }

  async handleLocation(message: any) {
    const from = message.from;
    const loc = message.location;
    const session = this.sessions.get(from);

    if (!loc) {
      await message.reply('Location data was unreadable. Please try sending your location pin again.');
      return;
    }

    if (!session || session.step !== 'awaiting_location' || !session.distressMessage) {
      await message.reply('We received your location! However, we need to know your medical emergency. Please text us your symptoms first. 🚨');
      return;
    }

    // Hit the case API
    await message.reply('Location received. AI Triage is running to find the best hospital... 🏃‍♂️🚑');

    try {
      const baseUrl = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const city = await this.detectCity(loc.latitude, loc.longitude);
      const res = await fetch(`${baseUrl}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: session.distressMessage,
          userLat: loc.latitude,
          userLng: loc.longitude,
          city,
        }),
      });

      if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
      const caseData = await res.json();
      
      this.sessions.delete(from);
      const sevDesc = caseData.severity.toUpperCase();
      const emoji = caseData.severity === 'critical' ? '🚨' : caseData.severity === 'urgent' ? '⚠️' : '🏥';

      await message.reply(
        `${emoji} *${sevDesc} CASE DETECTED*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🏥 *Hospital:* ${caseData.hospital}\n` +
        `⏱️ *ETA:* ~${caseData.drivingTimeMinutes} min drive\n\n` +
        `📍 *Open your Live Tracking Dashboard:*\n` +
        `${caseData.caseUrl}\n\n` +
        `_Ambulance dispatch notified. Please stay calm and keep this link open._`
      );

    } catch (err: any) {
      console.error('[WA] Routing failed', err);
      await message.reply('Sorry, our routing engine is currently experiencing issues. Please call 112 immediately.');
    }
  }

  async handleAudio(message: any) {
    const from = message.from;
    try {
      const media = await message.downloadMedia();
      if (!media?.data) {
        await message.reply('Could not download your voice note. Please try again or type your symptoms instead.');
        return;
      }

      await message.reply('🎙️ Voice note received. Transcribing...');

      // Transcribe via /api/transcribe (ElevenLabs STT)
      const baseUrl = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const audioBuffer = Buffer.from(media.data, 'base64');
      const blob = new Blob([audioBuffer], { type: media.mimetype || 'audio/ogg' });
      const formData = new FormData();
      formData.append('audio', blob, 'recording.ogg');

      const transcribeRes = await fetch(`${baseUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error(`Transcription failed: ${transcribeRes.status}`);
      const { text } = await transcribeRes.json() as { text: string };

      if (!text?.trim()) {
        await message.reply('Could not understand the audio. Please type your symptoms instead.');
        return;
      }

      console.log(`[WA] Transcribed audio from ${from}: "${text}"`);

      // Treat the transcribed text exactly like a typed distress message
      this.sessions.set(from, { step: 'awaiting_location', distressMessage: text });
      await message.reply(
        `Got it — I heard: _"${text}"_\n\n` +
        'To find the nearest capable emergency room, tap the 📎 attachment button and *Share your Current Location* 📍'
      );
    } catch (err) {
      console.error('[WA] handleAudio error', err);
      await message.reply('Could not process your voice note. Please type your symptoms instead.');
    }
  }

  async handleMedia(message: any) {
    try {
      const media = await message.downloadMedia();
      if (!media) {
        await message.reply('Failed to download media.');
        return;
      }

      await message.reply('Media received. Processing not implemented yet.');

      if (media && media.data) {
        const ext = media.mimetype?.split('/')[1] || 'bin';
        const filename = `./tmp/whatsapp-media-${Date.now()}.${ext}`;
        await fs.mkdir('./tmp', { recursive: true });
        await fs.writeFile(filename, Buffer.from(media.data, 'base64'));
        console.log('[WA] Media saved to', filename);
      }
    } catch (err) {
      console.error('[WA] handleMedia error', err);
      await message.reply('Media handling failed.');
    }
  }

  async sendText(phone: string, text: string) {
    const id = this.normalizeNumber(phone);
    return this.client.sendMessage(`${id}@c.us`, text);
  }

  normalizeNumber(phone: string) {
    return phone.replace(/[^0-9]/g, '');
  }
}
