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

  buildCareMessage(severity: 'critical' | 'urgent' | 'non-urgent' | string, reasoning?: string) {
    const sev = String(severity || 'urgent').toLowerCase();
    if (sev === 'critical') {
      return (
        'Immediate care while ambulance is en-route: keep patient lying flat (or recovery position if unconscious but breathing), ' +
        'control heavy bleeding with firm pressure, and do not give food/water. ' +
        (reasoning ? `Focus risk: ${reasoning}` : '')
      ).trim();
    }

    if (sev === 'urgent') {
      return (
        'Immediate care: keep patient calm, avoid physical exertion, monitor breathing and consciousness continuously, ' +
        'and be ready to share any change in symptoms. ' +
        (reasoning ? `Observed risk: ${reasoning}` : '')
      ).trim();
    }

    return (
      'Supportive care: keep hydrated if safe, monitor symptoms, avoid self-medication beyond basic first aid, ' +
      'and escalate immediately if pain, breathing, or consciousness worsens. ' +
      (reasoning ? `Current guidance based on: ${reasoning}` : '')
    ).trim();
  }

  detectLikelyEmergency(text: string) {
    const t = text.toLowerCase();
    const criticalSignals = [
      'chest pain', 'can\'t breathe', 'cannot breathe', 'breathing problem', 'shortness of breath',
      'unconscious', 'not responding', 'seizure', 'stroke', 'bleeding heavily', 'severe bleeding',
      'head injury', 'heart attack', 'heartattack', 'hartattack',
      'not able to breath', 'not able to breathe', 'breath problem',
      'collapsed', 'critical',
    ];
    return criticalSignals.some((s) => t.includes(s));
  }

  detectAssistanceIntent(text: string) {
    const t = text.toLowerCase();
    const assistSignals = [
      'what should i do', 'what to do', 'how to', 'can i', 'should i', 'is it normal', 'advice', 'guidance',
      'precaution', 'home care', 'general question', 'tips', 'help with',
    ];
    return assistSignals.some((s) => t.includes(s));
  }

  detectHospitalIntent(text: string) {
    const t = text.toLowerCase();
    const hospitalSignals = [
      'hospital', 'ambulance', 'admit', 'admission', 'er', 'emergency room',
      'take me hospital', 'need hospital', 'find hospital', 'nearest hospital',
    ];
    return hospitalSignals.some((s) => t.includes(s));
  }

  detectSeriousIssue(text: string) {
    const t = text.toLowerCase();
    // Keep this focused to avoid asking hospital/location for normal queries.
    const seriousSignals = [
      'severe pain', 'very high fever', 'fainting', 'passed out', 'confusion',
      'persistent vomiting', 'blood in vomit', 'numbness one side', 'slurred speech',
      'accident', 'fell down', 'injured badly', 'fracture',
    ];
    return seriousSignals.some((s) => t.includes(s));
  }

  getLatestUserMessage(messages?: Array<{ role: 'user' | 'assistant'; content: string }>) {
    if (!Array.isArray(messages) || messages.length === 0) return '';
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user' && messages[i]?.content) return String(messages[i].content).trim();
    }
    return '';
  }

  parseLocationFromText(text: string): { lat: number; lng: number } | null {
    if (!text?.trim()) return null;

    try {
      const maybe = JSON.parse(text);
      const lat = Number(maybe?.lat);
      const lng = Number(maybe?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    } catch {
      // ignore non-JSON
    }

    const matches = text.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    const lat = Number(matches[0]);
    const lng = Number(matches[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  formatHospitalAlternatives(alternatives: any[]) {
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      return 'No strong alternate hospitals available right now.';
    }

    return alternatives
      .slice(0, 4)
      .map((alt, idx) => {
        const name = String(alt?.hospital?.name || `Alternative ${idx + 1}`);
        const eta = typeof alt?.totalEstimatedMinutes === 'number' ? `${alt.totalEstimatedMinutes} min` : 'ETA pending';
        const occ = typeof alt?.occupancyPct === 'number' ? `${alt.occupancyPct}% occupancy` : 'load unknown';
        return `${idx + 1}. ${name} (${eta}, ${occ})`;
      })
      .join('\n');
  }

  async routeCaseFromCoordinates(
    from: string,
    lat: number,
    lng: number,
    session: {
      imageSeverity?: 'high' | 'low';
      distressMessage?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
    reply: (content: string) => Promise<any>,
  ) {
    const inferredDistressMessage =
      session?.distressMessage ||
      this.getLatestUserMessage(session?.messages) ||
      'Emergency case reported via WhatsApp location pin.';

    await reply('Location received. Finding best hospital now...');

    const baseUrl = this.getBaseUrl();
    const city = await this.detectCity(lat, lng);
    const res = await fetch(`${baseUrl}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: inferredDistressMessage,
        userLat: lat,
        userLng: lng,
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
    const primaryHospital = fullCase?.assignedHospital?.hospital || {};
    const severity = String(fullCase?.triage?.severity || caseData?.severity || 'urgent');
    const careMessage = this.buildCareMessage(severity, triageReason);
    const alternatives = Array.isArray(fullCase?.alternatives) ? fullCase.alternatives : [];
    const alternativesText = this.formatHospitalAlternatives(alternatives);
    let policeNotificationSent = false;

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
    const sevDesc = String(severity).toUpperCase();
    const emoji = severity === 'critical' ? '🚨' : severity === 'urgent' ? '⚠️' : '🏥';

    await reply(
      `${emoji} *${sevDesc} CASE DETECTED*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `🏥 *Hospital:* ${caseData.hospital}\n` +
      `⏱️ *ETA:* ~${caseData.drivingTimeMinutes} min drive\n\n` +
      `🧠 *Why this hospital:* ${triageReason}\n` +
      `📌 *Current status:* ${status.replaceAll('_', ' ')}\n\n` +
      `🩺 *Immediate care:* ${careMessage}\n\n` +
      (policeNotificationSent ? `🚓 *Police/traffic corridor support notified* for this severe scene.\n\n` : '') +
      `_Ambulance dispatch notified. I will now send destination location and alternates in the next message._`
    );

    await reply(
      `📍 *Hospital location and route details*\n` +
      `Primary: *${String(primaryHospital?.name || caseData.hospital)}*\n` +
      `🏥 *Alternate hospitals (by name + speed + load):*\n${alternativesText}`
    );

    // Send case map link as separate message for better WhatsApp linkification
    await reply(`🗺️ *Live Case Map:*\n${caseData.caseUrl}`);

    this.caseSubscriptions.set(caseData.caseId, {
      chatId: from,
      city: String(fullCase?.city || city),
      lastStatus: status,
      lastHospitalName: String(fullCase?.assignedHospital?.hospital?.name || caseData.hospital),
      lastTimelineCount: Array.isArray(fullCase?.timeline) ? fullCase.timeline.length : 0,
      hadActiveIncident: false,
    });
  }

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
    step: 'idle' | 'chatting' | 'awaiting_location' | 'awaiting_hospital_decision';
    sessionId?: string;
    locationPromptSent?: boolean;
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
          let body = `🚑 *Case Update: ${caseId}*\n`;

          if (hospitalChanged) {
            body += `🔁 Rerouted: *${sub.lastHospitalName}* → *${hospitalName}*\n`;
          } else {
            body += `🏥 Hospital: *${hospitalName}*\n`;
          }

          body += `📌 Status: *${status.replaceAll('_', ' ').toUpperCase()}*\n`;
          body += `🧠 Reason: ${reason}\n`;
          body += `\nThis update is from live dispatch monitoring.`;

          await this.client.sendMessage(sub.chatId, body);
        }

        if (incidentResolved) {
          await this.client.sendMessage(
            sub.chatId,
            `✅ *Case Update: ${caseId}*\nIncident impact appears cleared and route conditions are stabilizing. ` +
              `Current destination remains *${hospitalName}* with status *${status.replaceAll('_', ' ').toUpperCase()}*.`
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

  async runConverseAndHandle(
    from: string,
    convo: Array<{ role: 'user' | 'assistant'; content: string }>,
    session: any,
    reply: (content: string) => Promise<any>,
  ) {
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
    const assistantReply = String(payload?.reply || 'I am here with you. Tell me what happened.');
    const intentMode = String(payload?.intent?.mode || 'assist_only');
    const triage = payload?.triage;
    const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : session.sessionId;

    convo.push({ role: 'assistant', content: assistantReply });

    const triageSeverity = String(triage?.severity || '').toLowerCase();
    const latestUserText = this.getLatestUserMessage(convo) || '';
    const wantsHospital = this.detectHospitalIntent(latestUserText);
    const shouldRouteNow =
      triageSeverity === 'critical' || triageSeverity === 'urgent' || (intentMode === 'triage_and_route' && wantsHospital);

    if (shouldRouteNow) {
      const mergedMessage = convo
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' | ')
        .slice(0, 600);

      this.sessions.set(from, {
        step: 'awaiting_location',
        sessionId,
        locationPromptSent: true,
        distressMessage: mergedMessage,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
        messages: convo,
        triage,
      });

      await reply(
        `${assistantReply}\n\n` +
          'I can find the best hospital now. Please share your live location (📎 → Location), or send {"lat":18.5204,"lng":73.8567}.',
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
      triage,
    });

    await reply(assistantReply);
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
        '👋 Clearline here. Send your problem in one short line, then share your live location pin.\n' +
        'I will route to the best hospital immediately.'
      );
      return;
    }

    if (session.step === 'awaiting_location') {
      const textLocation = this.parseLocationFromText(text);
      if (textLocation) {
        try {
          await this.routeCaseFromCoordinates(from, textLocation.lat, textLocation.lng, session, (content) => message.reply(content));
        } catch (err) {
          console.error('[WA] route from text location failed', err);
          await message.reply('Routing failed. Please send live location pin again or call 112 if critical.');
        }
        return;
      }

      if (!session.locationPromptSent) {
        this.sessions.set(from, {
          ...session,
          locationPromptSent: true,
        });
        await message.reply(
          'Please share live location pin now (📎 → Location). If pin is not possible, send JSON like {"lat":18.5204,"lng":73.8567}.',
        );
      } else {
        await message.reply('Waiting for location. Share pin, or send JSON: {"lat":18.5204,"lng":73.8567}.');
      }
      return;
    }

    // Handle hospital confirmation response
    if (session.step === 'awaiting_hospital_decision') {
      const yesAnswers = ['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'true', 'go', 'hospital'];
      const noAnswers = ['no', 'nope', 'not', 'dont', 'don\'t', 'false', 'help', 'help me', 'advice'];
      const isYes = yesAnswers.some((word) => lc.includes(word));
      const isNo = noAnswers.some((word) => lc.includes(word));

      if (isYes) {
        // User wants to go to hospital
        this.sessions.set(from, {
          ...session,
          step: 'awaiting_location',
          locationPromptSent: true,
          distressMessage: session.distressMessage || text,
        });
        await message.reply(
          '✅ Understood. I can find you the best hospital nearby.\n\n' +
          'Please share your live location pin now (📎 → Location). If pin is not possible, send JSON like {"lat":18.5204,"lng":73.8567}.'
        );
        return;
      }

      if (isNo) {
        // User doesn't want hospital, ask what kind of help they need
        this.sessions.set(from, {
          ...session,
          step: 'chatting',
          messages: [...(session.messages ?? []), { role: 'user', content: text }],
        });
        await message.reply(
          'Okay, no problem. 🙏 What kind of help do you need? I can provide:\n' +
          '• First aid/home care guidance\n' +
          '• Symptom advice\n' +
          '• When to see a doctor tips\n\nJust tell me what you\'re experiencing.'
        );
        return;
      }

      // If unclear, re-ask
      await message.reply('Do you want to go to hospital? Please reply "yes" or "no".');
      return;
    }

    // Fast-path for obviously serious incidents to reduce chat delay.
    if (this.detectLikelyEmergency(text) && session.step !== 'awaiting_location') {
      this.sessions.set(from, {
        step: 'awaiting_location',
        sessionId: session.sessionId,
        locationPromptSent: true,
        distressMessage: text,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
        messages: [...(session.messages ?? []), { role: 'user', content: text }],
        triage: {
          severity: 'urgent',
          confidenceScore: 0.72,
          reasoning: 'Emergency red-flag pattern detected from message.',
        },
      });

      await message.reply(
        '🚨 Emergency detected. Share live location pin now (📎 → Location). ' +
        'If pin fails, send {"lat":18.5204,"lng":73.8567}.',
      );
      return;
    }

    // If it's an assistance/question intent, go straight to conversational mode
    if (session.step === 'idle' && this.detectAssistanceIntent(text)) {
      const convo = [...(session.messages ?? []), { role: 'user', content: text }];
      this.sessions.set(from, {
        step: 'chatting',
        sessionId: session.sessionId,
        messages: convo,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
      });

      try {
        await this.runConverseAndHandle(from, convo, session, (content) => message.reply(content));
      } catch (err) {
        console.error('[WA] assistance intent converse failed', err);
        await message.reply('Sure, I\'m here to help! What do you need assistance with?');
      }
      return;
    }

    // If it's a serious issue but not emergency, ask about hospital
    if (session.step === 'idle' && this.detectSeriousIssue(text)) {
      this.sessions.set(from, {
        step: 'awaiting_hospital_decision',
        sessionId: session.sessionId,
        distressMessage: text,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
        messages: [...(session.messages ?? []), { role: 'user', content: text }],
      });

      await message.reply(
        `I understand you're experiencing: ${text}\n\n` +
        'Does this feel like something that needs immediate hospital care? Reply "yes" or "no".'
      );
      return;
    }

    // Default: general query → conversational mode
    if (session.step === 'idle') {
      const convo = [...(session.messages ?? []), { role: 'user', content: text }];
      this.sessions.set(from, {
        step: 'chatting',
        sessionId: session.sessionId,
        messages: convo,
        imageSeverity: session.imageSeverity,
        imageReasoning: session.imageReasoning,
        imageConfidence: session.imageConfidence,
      });

      try {
        await this.runConverseAndHandle(from, convo, session, (content) => message.reply(content));
      } catch (err) {
        console.error('[WA] general query converse failed', err);
        await message.reply('I\'m here to help. What can I do for you?');
      }
      return;
    }

    // Handle continuing conversation in 'chatting' state
    if (session.step === 'chatting') {
      const convo = session.messages ?? [];
      convo.push({ role: 'user', content: text });

      try {
        await this.runConverseAndHandle(from, convo, session, (content) => message.reply(content));
      } catch (err) {
        console.error('[WA] continuing chat failed', err);
        await message.reply('Let me help. Tell me more.');
      }
      return;
    }

    // Fallback: if somehow we get here, treat as general query
    const fallbackConvo = session.messages ?? [];
    fallbackConvo.push({ role: 'user', content: text });

    try {
      await this.runConverseAndHandle(from, fallbackConvo, session, (content) => message.reply(content));
    } catch (err) {
      console.error('[WA] fallback converse failed', err);
      await message.reply('Tell me what you need.');
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

    try {
      const safeSession = session?.step === 'awaiting_location'
        ? session
        : {
            step: 'awaiting_location',
            distressMessage: this.getLatestUserMessage(session?.messages) || 'Emergency case reported via WhatsApp location pin.',
            imageSeverity: session?.imageSeverity,
            messages: session?.messages,
          };

      await this.routeCaseFromCoordinates(from, loc.latitude, loc.longitude, safeSession, (content) => message.reply(content));
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
        session.locationPromptSent = true;
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
