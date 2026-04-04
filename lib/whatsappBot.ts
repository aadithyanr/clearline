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
  caseMonitorInterval: NodeJS.Timeout | null = null;

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
      this.startCaseMonitorLoop();
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
    step: 'idle' | 'chatting' | 'awaiting_location';
    sessionId?: string;
    distressMessage?: string;
    imageSeverity?: 'high' | 'low';
    imageReasoning?: string;
    imageConfidence?: number;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    triage?: {
      severity?: 'critical' | 'urgent' | 'non-urgent';
      confidenceScore?: number;
      reasoning?: string;
    };
  }>();

  caseSubscriptions = new Map<string, {
    chatId: string;
    city?: string;
    lastStatus?: string;
    lastHospitalName?: string;
    lastTimelineCount?: number;
    hadActiveIncident?: boolean;
  }>();

  getBaseUrl() {
    return process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  }

  startCaseMonitorLoop() {
    if (this.caseMonitorInterval) return;
    this.caseMonitorInterval = setInterval(() => {
      void this.pollSubscribedCases();
    }, 15000);
  }

  async pollSubscribedCases() {
    const baseUrl = this.getBaseUrl();

    for (const [caseId, sub] of this.caseSubscriptions.entries()) {
      try {
        const res = await fetch(`${baseUrl}/api/cases?id=${encodeURIComponent(caseId)}`);
        if (!res.ok) continue;

        const c = await res.json();
        const status = String(c?.status || 'unknown');
        const city = String(c?.city || sub.city || 'pune');
        const hospitalName = String(c?.assignedHospital?.hospital?.name || 'Unknown Hospital');
        const timeline = Array.isArray(c?.timeline) ? c.timeline : [];
        const timelineCount = timeline.length;
        const lastEvent = timeline[timelineCount - 1];
        const incidentsRes = await fetch(
          `${baseUrl}/api/incidents?city=${encodeURIComponent(city)}&caseId=${encodeURIComponent(caseId)}`,
        );
        const incidentsPayload = incidentsRes.ok ? await incidentsRes.json() : { incidents: [] };
        const activeIncidents = Array.isArray(incidentsPayload?.incidents) ? incidentsPayload.incidents : [];
        const hasActiveIncident = activeIncidents.length > 0;

        const hospitalChanged = sub.lastHospitalName && sub.lastHospitalName !== hospitalName;
        const statusChanged = sub.lastStatus && sub.lastStatus !== status;
        const timelineChanged = typeof sub.lastTimelineCount === 'number' && timelineCount > sub.lastTimelineCount;
        const incidentResolved = sub.hadActiveIncident === true && hasActiveIncident === false;

        if (hospitalChanged || statusChanged || timelineChanged) {
          const reason = lastEvent?.reason || lastEvent?.event || 'Operational update from dispatch.';
          const caseLink = `${baseUrl}/case/${encodeURIComponent(caseId)}`;
          let body = `🚑 *Case Update: ${caseId}*\n`;

          if (hospitalChanged) {
            body += `🔁 Rerouted: *${sub.lastHospitalName}* → *${hospitalName}*\n`;
          } else {
            body += `🏥 Hospital: *${hospitalName}*\n`;
          }

          body += `📌 Status: *${status.replaceAll('_', ' ').toUpperCase()}*\n`;
          body += `🧠 Reason: ${reason}\n`;
          body += `🔗 Track Case: ${caseLink}\n`;
          body += `\nThis update is from live dispatch monitoring.`;

          await this.client.sendMessage(sub.chatId, body);
        }

        if (incidentResolved) {
          const caseLink = `${baseUrl}/case/${encodeURIComponent(caseId)}`;
          await this.client.sendMessage(
            sub.chatId,
            `✅ *Case Update: ${caseId}*\nIncident impact appears cleared and route conditions are stabilizing. ` +
              `Current destination remains *${hospitalName}* with status *${status.replaceAll('_', ' ').toUpperCase()}*.\n` +
              `🔗 Track Case: ${caseLink}`
          );
        }

        this.caseSubscriptions.set(caseId, {
          ...sub,
          city,
          lastStatus: status,
          lastHospitalName: hospitalName,
          lastTimelineCount: timelineCount,
          hadActiveIncident: hasActiveIncident,
        });

        if (status === 'arrived' || status === 'closed') {
          this.caseSubscriptions.delete(caseId);
        }
      } catch (err) {
        console.error('[WA] pollSubscribedCases failed', err);
      }
    }
  }

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

    const session = this.sessions.get(from) || { step: 'idle', messages: [] };

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
        'Please describe your symptoms naturally. I will ask follow-ups and guide you step by step.\n\n' +
        '_For immediate life-threatening danger, always call 112._'
      );
      return;
    }

    if (session.step === 'awaiting_location') {
      await message.reply('I am ready to route right now. Please share your current location so I can dispatch to the best hospital. 📍');
      return;
    }

    // Natural conversational triage via web AI chain
    const convo = session.messages ?? [];
    convo.push({ role: 'user', content: text });

    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/clearpath/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convo, sessionId: session.sessionId, channel: 'whatsapp' }),
      });

      if (!res.ok) {
        throw new Error(`Converse API ${res.status}`);
      }

      const payload = await res.json();
      const reply = String(payload?.reply || 'Please share what happened and your symptoms.');
      const triage = payload?.triage;
      const intentMode = String(payload?.intent?.mode || 'triage_and_route');
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : session.sessionId;

      convo.push({ role: 'assistant', content: reply });

      if (intentMode === 'assist_only') {
        this.sessions.set(from, {
          step: 'chatting',
          sessionId,
          distressMessage: session.distressMessage,
          imageSeverity: session.imageSeverity,
          imageReasoning: session.imageReasoning,
          imageConfidence: session.imageConfidence,
          messages: convo,
        });

        await message.reply(reply);
        return;
      }

      if (triage?.severity) {
        const mergedMessage = convo
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join(' | ')
          .slice(0, 600);

        this.sessions.set(from, {
          step: 'awaiting_location',
          sessionId,
          distressMessage: mergedMessage,
          imageSeverity: session.imageSeverity,
          imageReasoning: session.imageReasoning,
          imageConfidence: session.imageConfidence,
          messages: convo,
          triage,
        });

        await message.reply(
          `${reply}\n\n` +
          `Triage: *${String(triage.severity).toUpperCase()}*` +
          `${triage?.confidenceScore ? ` (confidence ${Math.round(Number(triage.confidenceScore) * 100)}%)` : ''}\n` +
          `Reason: ${triage?.reasoning || 'Emergency pattern detected.'}\n\n` +
          'Now please share your current location (📎 → Location) so I can route you to the best hospital immediately.'
        );
        return;
      }

      this.sessions.set(from, {
        step: 'chatting',
        sessionId,
        distressMessage: session.distressMessage,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
        messages: convo,
      });

      await message.reply(reply);
    } catch (err) {
      console.error('[WA] conversational triage failed', err);
      this.sessions.set(from, {
        step: 'awaiting_location',
        sessionId: session.sessionId,
        distressMessage: text,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
        messages: convo,
      });
      await message.reply('I understood enough to route emergency support. Please share your current location now. 📍');
    }
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
      const baseUrl = this.getBaseUrl();
      const city = await this.detectCity(loc.latitude, loc.longitude);
      const res = await fetch(`${baseUrl}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: session.distressMessage,
          userLat: loc.latitude,
          userLng: loc.longitude,
          city,
          imageSeverity: session.imageSeverity,
        }),
      });

      if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
      const caseData = await res.json();

      const fullCaseRes = await fetch(`${baseUrl}/api/cases?id=${encodeURIComponent(caseData.caseId)}`);
      const fullCase = fullCaseRes.ok ? await fullCaseRes.json() : null;
      const triageReason = String(fullCase?.triage?.reasoning || 'Live emergency triage and routing constraints selected this destination.');
      const status = String(fullCase?.status || 'awaiting_hospital_ack');
      let policeNotificationSent = false;

      // Police/traffic notification is only triggered for serious accident images.
      if (session.imageSeverity === 'high') {
        const baselineEtaMinutes = Math.max(8, Number(caseData?.drivingTimeMinutes || 15));
        const currentEtaMinutes = baselineEtaMinutes + 12;

        const policeRes = await fetch(`${baseUrl}/api/alerts/police-traffic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: caseData.caseId,
            roadClosureReported: true,
            baselineEtaMinutes,
            currentEtaMinutes,
          }),
        });

        const policePayload = policeRes.ok ? await policeRes.json().catch(() => ({})) : {};
        policeNotificationSent = Boolean(policePayload?.triggered);
      }
      
      this.sessions.delete(from);
      const sevDesc = caseData.severity.toUpperCase();
      const emoji = caseData.severity === 'critical' ? '🚨' : caseData.severity === 'urgent' ? '⚠️' : '🏥';

      await message.reply(
        `${emoji} *${sevDesc} CASE DETECTED*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🏥 *Hospital:* ${caseData.hospital}\n` +
        `⏱️ *ETA:* ~${caseData.drivingTimeMinutes} min drive\n\n` +
        `🧠 *Why this hospital:* ${triageReason}\n` +
        `📌 *Current status:* ${status.replaceAll('_', ' ')}\n\n` +
        (policeNotificationSent ? `🚓 *Police/traffic corridor support notified* for this severe scene.\n\n` : '') +
        `📍 *Open your Live Tracking Dashboard:*\n` +
        `${caseData.caseUrl}\n\n` +
        `_Ambulance dispatch notified. I will message you here if rerouted or status changes._`
      );

      this.caseSubscriptions.set(caseData.caseId, {
        chatId: from,
        city: String(fullCase?.city || city),
        lastStatus: status,
        lastHospitalName: String(fullCase?.assignedHospital?.hospital?.name || caseData.hospital),
        lastTimelineCount: Array.isArray(fullCase?.timeline) ? fullCase.timeline.length : 0,
        hadActiveIncident: false,
      });

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

      await message.reply(`Got it — I heard: _"${text}"_`);

      // Route voice through the same conversational/intent pipeline as text.
      await this.handleText({
        body: text,
        from,
        reply: (content: string) => message.reply(content),
      });
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

      // For images, attempt classification
      if (message.type === 'image') {
        await this.handleImageClassification(message, media);
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

  async handleImageClassification(message: any, media: any) {
    try {
      const from = message.from;
      await message.reply('🔍 Analyzing accident scene image for trauma severity...');

      // Send to classification API
      const baseUrl = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const formData = new FormData();
      formData.append('image', new Blob([Buffer.from(media.data, 'base64')], { type: media.mimetype }), 'scene.jpg');

      const response = await fetch(`${baseUrl}/api/clearpath/classify-scene`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        await message.reply('❌ Failed to analyze image. Please try again or describe the scene.');
        return;
      }

      const { severity, confidence, reasoning } = await response.json();

      // Update session with scene context
      const session = this.sessions.get(from) || { step: 'idle' };
      session.imageSeverity = severity;
      session.imageReasoning = String(reasoning || 'Scene indicates traumatic injury pattern.');
      session.imageConfidence = Number(confidence || 0);

      const highConfidenceScene = severity === 'high' && Number(confidence || 0) >= 0.72;
      if (highConfidenceScene) {
        session.step = 'awaiting_location';
        session.distressMessage = `Severe accident scene detected from image. ${String(reasoning || '')}`.trim();
      }

      this.sessions.set(from, session);

      const severityEmoji = severity === 'high' ? '🚨' : '✅';
      const reply = `${severityEmoji} *Scene Severity: ${severity.toUpperCase()}*\n\n` +
        `Confidence: ${(confidence * 100).toFixed(0)}%\n` +
        `Assessment: ${reasoning}\n\n` +
        `${severity === 'high' ? '⚠️ High severity detected. Fast emergency routing enabled.' : 'Standard routing will be used.'}\n\n` +
        (highConfidenceScene
          ? 'I can route immediately. Please share your current location now (📎 → Location).'
          : 'If this scene is severe, share location now for fastest routing. If unclear, tell me briefly what happened.');

      await message.reply(reply);

      // Save image
      const filename = `./tmp/whatsapp-scene-${Date.now()}.jpg`;
      await fs.mkdir('./tmp', { recursive: true });
      await fs.writeFile(filename, Buffer.from(media.data, 'base64'));
      console.log('[WA] Scene image saved to', filename);
    } catch (error) {
      console.error('[WA] Image classification error:', error);
      await message.reply('❌ Image analysis failed. Please describe the scene or try again.');
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
