// @ts-nocheck
import WhatsAppWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

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

  // Simple state machine per user phone number
  sessions = new Map<string, { step: 'idle' | 'awaiting_location'; distressMessage?: string }>();

  async handleText(message: any) {
    const text = message.body.trim();
    const from = message.from;

    const session = this.sessions.get(from) || { step: 'idle' };

    // If they just say "cancel" or "stop", reset state
    if (['cancel', 'stop', 'reset'].includes(text.toLowerCase())) {
      this.sessions.delete(from);
      await message.reply('Triage cancelled. Send a new message if you need help.');
      return;
    }

    // Otherwise, treat any text as a distress message and ask for location
    this.sessions.set(from, { step: 'awaiting_location', distressMessage: text });
    await message.reply(
      'Got it. To find the nearest capable emergency room, please **Share your Live Location** or **Current Location** using the 📎 attachment button.'
    );
  }

  async handleLocation(message: any) {
    const from = message.from;
    const loc = message.location;
    const session = this.sessions.get(from);

    if (!loc) {
      await message.reply('Location data was unreadable. Please try sending your location again.');
      return;
    }

    if (!session || session.step !== 'awaiting_location' || !session.distressMessage) {
      // If we don't have a distress message but they sent a location, just hint them
      await message.reply('We received your location, but we need to know what the emergency is. Please describe the symptoms.');
      return;
    }

    // We have both message + location! Let's hit the case creation API
    await message.reply('Location received. Processing triage and finding the nearest hospital... 🚨');

    try {
      const res = await fetch('http://localhost:3000/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: session.distressMessage,
          userLat: loc.latitude,
          userLng: loc.longitude,
          city: 'pune', // Default to Pune for demo, or do reverse geocoding
        }),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${await res.text()}`);
      }

      const caseData = await res.json();

      // Clear session after successful route
      this.sessions.delete(from);

      const sevEmoji = caseData.severity === 'critical' ? '🚨' : caseData.severity === 'urgent' ? '⚠️' : 'ℹ️';

      await message.reply(
        `${sevEmoji} *${caseData.severity.toUpperCase()}* — Routing to ${caseData.hospital}\n\n` +
        `⏱️ Drive: ~${caseData.drivingTimeMinutes} min\n\n` +
        `📍 *View live route and ETA:* \n${caseData.caseUrl}\n\n` +
        `Ambulance support notified. Stay on the line.`
      );

    } catch (err: any) {
      console.error('[WA] Routing failed', err);
      // Don't delete session so they can try location again
      await message.reply('Sorry, our routing engine is experiencing issues. Please try sending your location again, or call 112 immediately if critical.');
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
