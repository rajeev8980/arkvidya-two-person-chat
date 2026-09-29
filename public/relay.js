// Used when the page is hosted without the Node server (e.g. GitHub Pages).
// Talks to a public MQTT relay and exposes the same events as the Socket.IO
// server, so app.js works unchanged in both modes.
function createRelay() {
  const MQTT_LIB = "https://unpkg.com/mqtt@5.16.0/dist/mqtt.min.js";
  const BROKER = "wss://broker.emqx.io:8084/mqtt";
  const ROOM = "arkvidya-chat/ams1c7z4wejr3o0ihntuflbk";
  const MAX_MEMBERS = 4;
  const HISTORY_LIMIT = 100;
  const SETTLE_MS = 1500;
  const STORAGE_KEY = "arkvidya-history";

  const clientId = `ark-${Math.random().toString(36).slice(2, 12)}`;
  const presenceTopic = `${ROOM}/presence/${clientId}`;
  const handlers = {};
  const presence = new Map();
  const history = [];
  const seen = new Set();

  let client = null;
  let myMember = null;
  let lastMember = null;
  let claimedAt = 0;
  let assigned = false;

  function fire(event, data) {
    (handlers[event] || []).forEach((cb) => cb(data));
  }

  function isValidMessage(m) {
    return m && typeof m.id === "string" && typeof m.text === "string" &&
      Number.isInteger(m.member) && m.member >= 1 && m.member <= MAX_MEMBERS &&
      typeof m.time === "string";
  }

  function remember(m) {
    if (!isValidMessage(m) || seen.has(m.id)) return false;
    seen.add(m.id);
    history.push({ id: m.id, member: m.member, text: m.text.slice(0, 1000), time: m.time });
    history.sort((a, b) => a.time.localeCompare(b.time));
    while (history.length > HISTORY_LIMIT) seen.delete(history.shift().id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (_) {}
    return true;
  }

  try {
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").forEach(remember);
  } catch (_) {}

  function memberCount() {
    return [...presence.values()].filter((p) => p.member >= 1 && p.member <= MAX_MEMBERS).length;
  }

  function publishPresence() {
    client.publish(presenceTopic, JSON.stringify({ member: myMember, ts: claimedAt }), { qos: 1, retain: true });
  }

  function claimSeat() {
    const taken = new Set();
    presence.forEach((p, id) => {
      if (id !== clientId) taken.add(p.member);
    });

    let seat = null;
    if (lastMember && !taken.has(lastMember)) {
      seat = lastMember;
    } else {
      for (let n = 1; n <= MAX_MEMBERS; n++) {
        if (!taken.has(n)) {
          seat = n;
          break;
        }
      }
    }

    if (seat === null) {
      fire("room-full", { max: MAX_MEMBERS });
      client.end(true);
      return;
    }

    myMember = lastMember = seat;
    claimedAt = Date.now();
    presence.set(clientId, { member: seat, ts: claimedAt });
    publishPresence();
    fire("member-assigned", { memberNumber: seat, max: MAX_MEMBERS });
    if (!assigned) {
      assigned = true;
      fire("chat-history", history.slice());
    }
    fire("members", { count: memberCount(), max: MAX_MEMBERS });
  }

  // Two people can grab the same seat at the same moment; whoever claimed it
  // first keeps it and the other picks again.
  function resolveSeatConflict() {
    if (myMember === null) return;
    for (const [id, p] of presence) {
      if (id === clientId || p.member !== myMember) continue;
      if (p.ts < claimedAt || (p.ts === claimedAt && id < clientId)) {
        lastMember = null;
        claimSeat();
        return;
      }
    }
  }

  function onMessage(topic, buffer) {
    const raw = buffer.toString();

    if (topic.startsWith(`${ROOM}/presence/`)) {
      const id = topic.slice(`${ROOM}/presence/`.length);
      if (!raw) {
        presence.delete(id);
      } else {
        try {
          const p = JSON.parse(raw);
          if (Number.isInteger(p.member)) presence.set(id, p);
        } catch (_) {}
      }
      resolveSeatConflict();
      if (assigned) fire("members", { count: memberCount(), max: MAX_MEMBERS });
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (topic === `${ROOM}/msg`) {
      if (remember(data) && assigned) fire("new-message", data);
    } else if (topic === `${ROOM}/history-request`) {
      if (myMember !== null && data.from !== clientId && history.length) {
        client.publish(`${ROOM}/history/${data.from}`, JSON.stringify(history));
      }
    } else if (topic === `${ROOM}/history/${clientId}` && Array.isArray(data) && !assigned) {
      data.forEach(remember);
    }
  }

  function connect() {
    client = window.mqtt.connect(BROKER, {
      clientId,
      clean: true,
      keepalive: 20,
      reconnectPeriod: 3000,
      will: { topic: presenceTopic, payload: "", qos: 1, retain: true }
    });

    client.on("connect", () => {
      myMember = null;
      presence.delete(clientId);
      client.subscribe(
        [`${ROOM}/presence/+`, `${ROOM}/msg`, `${ROOM}/history-request`, `${ROOM}/history/${clientId}`],
        { qos: 1 },
        () => {
          if (!assigned) client.publish(`${ROOM}/history-request`, JSON.stringify({ from: clientId }));
          setTimeout(claimSeat, SETTLE_MS);
        }
      );
    });

    client.on("message", onMessage);
  }

  window.addEventListener("pagehide", () => {
    if (client && client.connected && myMember !== null) {
      client.publish(presenceTopic, "", { qos: 1, retain: true });
      client.end();
    }
  });

  const script = document.createElement("script");
  script.src = MQTT_LIB;
  script.onload = connect;
  document.head.appendChild(script);

  return {
    on(event, cb) {
      (handlers[event] = handlers[event] || []).push(cb);
    },
    emit(event, payload) {
      if (event !== "send-message" || typeof payload !== "string" || myMember === null) return;
      const text = payload.trim().slice(0, 1000);
      if (!text) return;
      client.publish(`${ROOM}/msg`, JSON.stringify({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        member: myMember,
        text,
        time: new Date().toISOString()
      }), { qos: 1 });
    }
  };
}
