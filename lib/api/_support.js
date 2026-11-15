// Support threads, one per tracking number. Stored in Supabase (support_threads / support_messages)
// so conversations survive restarts; falls back to memory when no database is configured.
const { supabase } = require("./_supabase");

const memory = [];

function nowIso() {
  return new Date().toISOString();
}

function normalizeTracking(value) {
  return String(value || "").trim().toUpperCase();
}

function toMessage(trackingNumber, row) {
  return {
    id: String(row.id),
    trackingNumber,
    from: row.from_role === "admin" ? "admin" : "user",
    body: row.message,
    timestamp: row.created_at
  };
}

async function findOrCreateThread(tracking) {
  const { data: found, error: findError } = await supabase.from("support_threads").select("id").eq("tracking_number", tracking).limit(1);
  if (findError) throw findError;
  if (found && found[0]) return found[0].id;

  const { data: created, error: createError } = await supabase.from("support_threads").insert({ tracking_number: tracking }).select("id").limit(1);
  if (createError) throw createError;
  return created[0].id;
}

async function addMessage({ trackingNumber, from, body }) {
  const tracking = normalizeTracking(trackingNumber);
  if (!tracking) throw new Error("trackingNumber is required.");
  const text = String(body || "").trim();
  if (!text) throw new Error("message body is required.");
  const role = from === "admin" ? "admin" : "user";

  if (supabase) {
    try {
      const threadId = await findOrCreateThread(tracking);
      const { data, error } = await supabase
        .from("support_messages")
        .insert({ thread_id: threadId, from_role: role, message: text })
        .select("id,from_role,message,created_at")
        .limit(1);
      if (error) throw error;
      return toMessage(tracking, data[0]);
    } catch (error) {
      console.error("Supabase addMessage failed, using memory:", error.message || error);
    }
  }

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trackingNumber: tracking,
    from: role,
    body: text,
    timestamp: nowIso()
  };
  memory.push(message);
  return message;
}

async function listMessages(trackingNumber) {
  const tracking = normalizeTracking(trackingNumber);

  if (supabase) {
    try {
      const { data: thread, error: threadError } = await supabase.from("support_threads").select("id").eq("tracking_number", tracking).limit(1);
      if (threadError) throw threadError;
      if (!thread || !thread[0]) return [];

      const { data, error } = await supabase
        .from("support_messages")
        .select("id,from_role,message,created_at")
        .eq("thread_id", thread[0].id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => toMessage(tracking, row));
    } catch (error) {
      console.error("Supabase listMessages failed, using memory:", error.message || error);
    }
  }

  return memory.filter((m) => m.trackingNumber === tracking).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function listThreads(limit = 30) {
  let messages = memory;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id,from_role,message,created_at,support_threads!inner(tracking_number)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      messages = (data || []).map((row) => toMessage(normalizeTracking(row.support_threads.tracking_number), row));
    } catch (error) {
      console.error("Supabase listThreads failed, using memory:", error.message || error);
    }
  }

  const threads = new Map();
  for (const msg of messages) {
    const existing = threads.get(msg.trackingNumber);
    if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
      threads.set(msg.trackingNumber, msg);
    }
  }

  return Array.from(threads.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map((msg) => ({
      trackingNumber: msg.trackingNumber,
      lastMessage: msg.body,
      from: msg.from,
      timestamp: msg.timestamp
    }));
}

module.exports = { addMessage, listMessages, listThreads };
