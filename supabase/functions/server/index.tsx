import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-owner-key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-da14cc3d/health", (c) => c.json({ status: "ok" }));

// --- Auth helpers ---
function makeEmail(username: string) {
  return `${username.toLowerCase().trim()}@cinetrack.local`;
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function anonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

async function getUserFromToken(token: string) {
  const { data, error } = await anonClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// POST /auth/signup
app.post("/make-server-da14cc3d/auth/signup", async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) return c.json({ error: "Usuario y contraseña requeridos" }, 400);
    if (username.length < 3) return c.json({ error: "El usuario debe tener al menos 3 caracteres" }, 400);
    if (password.length < 6) return c.json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);

    const email = makeEmail(username);
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true,
    });
    if (error) {
      if (error.message.includes("already registered")) {
        return c.json({ error: "Ese nombre de usuario ya está en uso" }, 409);
      }
      return c.json({ error: `Error al crear cuenta: ${error.message}` }, 400);
    }

    // Sign in immediately to return a token
    const { data: signInData, error: signInError } = await anonClient().auth.signInWithPassword({ email, password });
    if (signInError || !signInData.session) {
      return c.json({ error: "Cuenta creada pero error al iniciar sesión. Intenta iniciar sesión." }, 500);
    }

    return c.json({
      userId: data.user.id,
      username,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    });
  } catch (e) {
    console.log("Signup error:", e);
    return c.json({ error: `Error interno: ${e}` }, 500);
  }
});

// POST /auth/signin
app.post("/make-server-da14cc3d/auth/signin", async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) return c.json({ error: "Usuario y contraseña requeridos" }, 400);

    const email = makeEmail(username);
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return c.json({ error: "Usuario o contraseña incorrectos" }, 401);
    }

    return c.json({
      userId: data.user.id,
      username: data.user.user_metadata?.username ?? username,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (e) {
    console.log("Signin error:", e);
    return c.json({ error: `Error interno: ${e}` }, 500);
  }
});

// POST /auth/refresh
app.post("/make-server-da14cc3d/auth/refresh", async (c) => {
  try {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) return c.json({ error: "refreshToken requerido" }, 400);
    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return c.json({ error: "Sesión expirada" }, 401);
    return c.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (e) {
    return c.json({ error: `Error: ${e}` }, 500);
  }
});

// GET /auth/me
app.get("/make-server-da14cc3d/auth/me", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "No autorizado" }, 401);
    const user = await getUserFromToken(token);
    if (!user) return c.json({ error: "Token inválido o expirado" }, 401);
    return c.json({ userId: user.id, username: user.user_metadata?.username ?? "" });
  } catch (e) {
    return c.json({ error: `Error: ${e}` }, 500);
  }
});

// GET /auth/movies — load user's movies
app.get("/make-server-da14cc3d/auth/movies", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "No autorizado" }, 401);
    const user = await getUserFromToken(token);
    if (!user) return c.json({ error: "Token inválido o expirado" }, 401);
    const movies = await kv.get(`user:${user.id}:movies`) ?? [];
    return c.json({ movies });
  } catch (e) {
    console.log("Get movies error:", e);
    return c.json({ error: `Error: ${e}` }, 500);
  }
});

// PUT /auth/movies — save user's movies
app.put("/make-server-da14cc3d/auth/movies", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "No autorizado" }, 401);
    const user = await getUserFromToken(token);
    if (!user) return c.json({ error: "Token inválido o expirado" }, 401);
    const { movies } = await c.req.json();
    await kv.set(`user:${user.id}:movies`, movies);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Save movies error:", e);
    return c.json({ error: `Error: ${e}` }, 500);
  }
});

// --- Collaboration Rooms ---
function roomKey(id: string) { return `cinetrack:room:${id}`; }
function genId(len = 6) { return Math.random().toString(36).slice(2, 2 + len).toUpperCase(); }

app.post("/make-server-da14cc3d/rooms", async (c) => {
  try {
    const body = await c.req.json();
    const { name, movies, ownerKey, ownerName } = body;
    if (!name || !ownerKey) return c.json({ error: "name and ownerKey are required" }, 400);
    const roomId = genId(6);
    const room = { roomId, name, movies: movies ?? [], ownerKey, ownerName: ownerName ?? "Anónimo", members: [ownerName ?? "Anónimo"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(roomKey(roomId), room);
    return c.json({ roomId, room });
  } catch (e) {
    return c.json({ error: `Failed to create room: ${e}` }, 500);
  }
});

app.get("/make-server-da14cc3d/rooms/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const room = await kv.get(roomKey(id));
    if (!room) return c.json({ error: "Room not found" }, 404);
    const { ownerKey: _, ...safeRoom } = room as Record<string, unknown>;
    return c.json(safeRoom);
  } catch (e) {
    return c.json({ error: `Failed to get room: ${e}` }, 500);
  }
});

app.put("/make-server-da14cc3d/rooms/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { movies, memberName, ownerKey } = body;
    const existing = await kv.get(roomKey(id)) as Record<string, unknown> | null;
    if (!existing) return c.json({ error: "Room not found" }, 404);
    const members = existing.members as string[] ?? [];
    if (memberName && !members.includes(memberName)) members.push(memberName);
    const updated = { ...existing, movies: movies ?? existing.movies, members, updatedAt: new Date().toISOString() };
    await kv.set(roomKey(id), updated);
    const { ownerKey: _, ...safeRoom } = updated as Record<string, unknown>;
    return c.json(safeRoom);
  } catch (e) {
    return c.json({ error: `Failed to update room: ${e}` }, 500);
  }
});

app.delete("/make-server-da14cc3d/rooms/:id/movies/:movieId", async (c) => {
  try {
    const id = c.req.param("id");
    const movieId = c.req.param("movieId");
    const ownerKey = c.req.header("x-owner-key");
    const existing = await kv.get(roomKey(id)) as Record<string, unknown> | null;
    if (!existing) return c.json({ error: "Room not found" }, 404);
    if (ownerKey !== existing.ownerKey) return c.json({ error: "Solo el propietario puede eliminar películas" }, 403);
    const movies = (existing.movies as { id: string }[]).filter(m => m.id !== movieId);
    const updated = { ...existing, movies, updatedAt: new Date().toISOString() };
    await kv.set(roomKey(id), updated);
    const { ownerKey: _, ...safeRoom } = updated as Record<string, unknown>;
    return c.json(safeRoom);
  } catch (e) {
    return c.json({ error: `Failed to delete: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
