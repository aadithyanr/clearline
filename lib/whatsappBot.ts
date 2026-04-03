import WhatsAppWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const { Client, LocalAuth, Message, MessageMedia } = WhatsAppWeb as any;

export class WhatsappBot {
  client: Client;

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

  async handleMessage(message: Message) {
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

  async handleText(message: Message) {
    const text = message.body.trim();
    const lc = text.toLowerCase();

    if (lc === 'status') {
      await message.reply('Clearline WhatsApp bot is online.');
      return;
    }

    if (lc === 'help') {
      await message.reply(
        'Commands:\n- status\n- help\n- locate <postal code>\n- triage <symptoms>\n- send location (via WhatsApp location)'
      );
      return;
    }

    if (lc.startsWith('locate ') || lc.startsWith('location ')) {
      const query = text.split(' ').slice(1).join(' ');
      await message.reply(`Received location keyword: ${query}. (Geocode integration placeholder.)`);
      return;
    }

    if (lc.startsWith('triage ')) {
      const symptoms = text.slice(7).trim();
      await message.reply('Understood, triaging symptoms: ' + symptoms + '.\nPlease wait for results.');
      // TODO: call local /api/clearpath/converse or triage flow with symptoms
      return;
    }

    if (lc.includes('chest pain') || lc.includes('breath')) {
      await message.reply('Urgent red flag detected. Please call 102 ambulance immediately and get to nearest ER.');
      return;
    }

    await message.reply(`Received: "${text}". Reply with help for options, or send location/image/audio.`);
  }

  async handleLocation(message: Message) {
    const loc = message.location;
    if (!loc) {
      await message.reply('Location data is missing.');
      return;
    }

    const response = `Location received: ${loc.latitude}, ${loc.longitude}.`;
    await message.reply(response);

    // This is where you would call your route API, e.g.:
    // await fetch('http://localhost:3000/api/clearpath/route', ...);
  }

  async handleAudio(message: Message) {
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

  async handleMedia(message: Message) {
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
