import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { OpsDatasetSchema, createSeedDataset, type OpsDataset } from "../../../packages/core/src/index.ts";

const prisma = new PrismaClient();

async function ensureSnapshot(): Promise<OpsDataset> {
  const row = await prisma.opsSnapshot.findUnique({ where: { id: 1 } });
  if (row?.data) {
    return OpsDatasetSchema.parse(row.data);
  }
  const seed = createSeedDataset();
  await prisma.opsSnapshot.upsert({
    where: { id: 1 },
    create: { id: 1, data: JSON.parse(JSON.stringify(seed)) },
    update: { data: JSON.parse(JSON.stringify(seed)) },
  });
  return seed;
}

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL ?? "admin@local.test";
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, role: "admin" },
  });
  console.log(`Seeded admin user ${email} / ${password}`);
}

async function ensureLeaderUser() {
  const email = process.env.LEADER_EMAIL ?? "leader@local.test";
  const password = process.env.LEADER_PASSWORD ?? "viewonly";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, role: "leader" },
  });
  console.log(`Seeded leader (read-only) user ${email} / ${password}`);
}

async function auth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function buildServer() {
  await ensureAdminUser();
  await ensureLeaderUser();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  });

  app.post<{ Body: { email?: string; password?: string } }>("/api/auth/login", async (request, reply) => {
    const email = request.body?.email;
    const password = request.body?.password;
    if (!email || !password) {
      return reply.status(400).send({ error: "email and password required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const token = app.jwt.sign({ sub: user.id, role: user.role, email: user.email });
    return { token, role: user.role, email: user.email };
  });

  app.get("/api/ops", { preHandler: auth }, async () => {
    const dataset = await ensureSnapshot();
    return { dataset };
  });

  app.put<{ Body: unknown }>("/api/ops", { preHandler: auth }, async (request, reply) => {
    const user = request.user as { sub: string; role?: string };
    if (user.role !== "admin") {
      return reply.status(403).send({ error: "Forbidden — admin role required to save" });
    }
    const userId = user.sub;
    let body: OpsDataset;
    try {
      body = OpsDatasetSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: "Invalid dataset", detail: String(e) });
    }
    await prisma.$transaction([
      prisma.opsSnapshot.upsert({
        where: { id: 1 },
        create: { id: 1, data: JSON.parse(JSON.stringify(body)) },
        update: { data: JSON.parse(JSON.stringify(body)) },
      }),
      prisma.auditLog.create({
        data: {
          actorId: userId,
          action: "ops.put",
          details: { updatedAt: body.updatedAt },
        },
      }),
    ]);
    return { ok: true };
  });

  app.get("/api/audit", { preHandler: auth }, async () => {
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return { entries: rows };
  });

  app.get("/health", async () => ({ ok: true }));

  return app;
}

async function main() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
