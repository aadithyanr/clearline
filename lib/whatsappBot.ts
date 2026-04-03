// @ts-nocheck
import WhatsAppWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as os from 'os';

const { Client, LocalAuth, Message, MessageMedia } = WhatsAppWeb as any;

export class WhatsappBot {
  client: any;

  constructor() {
    const authDir = './.wwebjs_auth/clearline-whatsapp';
    const hasSession = existsSync(authDir);

    if (hasSession) {
      console.log('[WA] Existing session found; reusing login.');
    } else {
      console.log('[WA] No session found; scan QR code to login.');
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'clearline-whatsapp' }),
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
  sessions = new Map<string, { step: 'idle' | 'awaiting_location'; distressMessage?: string }>();

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
      const res = await fetch('http://localhost:3000/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: session.distressMessage,
          userLat: loc.latitude,
          userLng: loc.longitude,
          city: 'pune',
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
    try {
      const media = await message.downloadMedia();
      if (!media) {
        await message.reply('Failed to download audio.');
        return;
      }

      await message.reply('Audio received. Sending for transcription (not yet implemented).');
      // TODO: decode and send to /api/transcribe or external service.

      // Example placeholder: save to disk if needed.
      if (media && media.data) {
        const filename = `./tmp/whatsapp-audio-${Date.now()}.ogg`;
        const buffer = Buffer.from(media.data, 'base64');
        await fs.mkdir('./tmp', { recursive: true });
        await fs.writeFile(filename, buffer);
        console.log('[WA] Audio saved to', filename);
      }
    } catch (err) {
      console.error('[WA] handleAudio error', err);
      await message.reply('Audio handling failed.');
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
