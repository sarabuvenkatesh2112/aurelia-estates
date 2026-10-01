import { z } from 'zod';
import { getDb } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { readBody, errorResponse, PublicError } from '@/lib/http';
import {
  aiIdentity,
  guestCookie,
  ownedConversation,
  ownerWhere,
  limitAi,
} from '@/lib/ai/identity';
import { safeText, filtersSchema } from '@/lib/ai/contracts';
import { runConcierge, providerReady } from '@/lib/ai/provider';
import { confirmedAction } from '@/lib/ai/actions';
import { providerFailure } from '@/lib/ai/provider-errors';
import { secureApplicationCookie } from '@/lib/site-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ parts?: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const parts = (await context.params).parts || [];
    if (parts.length > 2) throw new PublicError('Not found.', 404);
    const identity = await aiIdentity(request.headers);
    const reply = (data: unknown, status = 200) => {
      const response = Response.json(data, {
        status,
        headers: { 'Cache-Control': 'private, no-store' },
      });
      if (identity.cookie)
        response.headers.set(
          'Set-Cookie',
          `${guestCookie}=${identity.cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secureApplicationCookie(request.url) ? '; Secure' : ''}`,
        );
      return response;
    };
    if (request.method === 'GET') {
      if (parts.length > 1) throw new PublicError('Not found.', 404);
      if (!parts.length)
        return reply({
          ready: providerReady(),
          signedIn: !!identity.customerId,
          conversations: await getDb().aiConversationReady.findMany({
            where: ownerWhere(identity),
            take: 30,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, updatedAt: true },
          }),
        });
      const id = z.uuid().parse(parts[0]);
      await ownedConversation(id, identity);
      return reply(
        await getDb().aiConversationReady.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            preferences: true,
            messages: {
              take: 80,
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                references: true,
                createdAt: true,
              },
            },
          },
        }),
      );
    }
    const body = await readBody(request);
    if (!parts.length && request.method === 'POST') {
      z.object({}).strict().parse(body);
      await limitAi(identity);
      return reply(
        await getDb().aiConversationReady.create({
          data: {
            customerId: identity.customerId,
            guestHash: identity.customerId ? null : identity.guestHash,
          },
          select: { id: true, title: true },
        }),
        201,
      );
    }
    const id = z.uuid().parse(parts[0]);
    if (parts[1] === 'claim' && request.method === 'POST') {
      z.object({}).strict().parse(body);
      if (!identity.customerId)
        throw new PublicError('Sign in to keep this conversation.', 401);
      const claimed = await getDb().aiConversationReady.updateMany({
        where: {
          id,
          customerId: null,
          guestHash: identity.guestHash,
          deletedAt: null,
          OR: [{ busyUntil: null }, { busyUntil: { lt: new Date() } }],
        },
        data: { customerId: identity.customerId, guestHash: null },
      });
      if (!claimed.count)
        throw new PublicError(
          'Conversation not found or still responding.',
          404,
        );
      return reply({ claimed: true });
    }
    const conversation = await ownedConversation(id, identity);
    if (parts[1] === 'actions' && request.method === 'POST')
      return reply(await confirmedAction(id, body, request.headers));
    if (request.method === 'PATCH') {
      const input = z
        .object({
          title: safeText.pipe(z.string().max(60)).optional(),
          clearPreferences: z.literal(true).optional(),
        })
        .strict()
        .parse(body);
      if (conversation.busyUntil && conversation.busyUntil > new Date())
        throw new PublicError('Wait for the response to finish.', 409);
      const updated = await getDb().aiConversationReady.updateMany({
        where: {
          id,
          ...ownerWhere(identity),
          OR: [{ busyUntil: null }, { busyUntil: { lt: new Date() } }],
        },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.clearPreferences ? { preferences: Prisma.DbNull } : {}),
        },
      });
      if (!updated.count)
        throw new PublicError('Wait for the response to finish.', 409);
      return reply({ updated: true });
    }
    if (request.method === 'DELETE') {
      z.object({}).strict().parse(body);
      if (conversation.busyUntil && conversation.busyUntil > new Date())
        throw new PublicError(
          'Stop the response before deleting this conversation.',
          409,
        );
      await getDb().$transaction(async (tx) => {
        const deleted = await tx.aiConversationReady.updateMany({
          where: {
            id,
            ...ownerWhere(identity),
            OR: [{ busyUntil: null }, { busyUntil: { lt: new Date() } }],
          },
          data: {
            deletedAt: new Date(),
            preferences: Prisma.DbNull,
            title: 'Deleted conversation',
          },
        });
        if (!deleted.count)
          throw new PublicError(
            'Stop the response before deleting this conversation.',
            409,
          );
        await tx.aiMessageReady.deleteMany({ where: { conversationId: id } });
      });
      return reply({ deleted: true });
    }
    if (parts[1] !== 'messages' || request.method !== 'POST')
      throw new PublicError('Not found.', 404);
    const input = z
      .object({
        message: safeText,
        context: z
          .string()
          .regex(/^[a-z0-9-]{1,100}$/)
          .nullable()
          .optional(),
      })
      .strict()
      .parse(body);
    if (!providerReady())
      throw new PublicError(
        'Aurelia AI is not connected yet. Browse the collection while the concierge is being prepared.',
        503,
      );
    await limitAi(identity);
    const lease = new Date(Date.now() + 90000);
    const locked = await getDb().aiConversationReady.updateMany({
      where: {
        id,
        ...ownerWhere(identity),
        turnCount: { lt: 30 },
        OR: [{ busyUntil: null }, { busyUntil: { lt: new Date() } }],
      },
      data: { busyUntil: lease, turnCount: { increment: 1 } },
    });
    if (!locked.count)
      throw new PublicError(
        'This conversation is responding or has reached its limit. Please wait or start a new conversation.',
        409,
      );
    const encoder = new TextEncoder();
    const disconnected = new AbortController();
    const responseSignal = AbortSignal.any([
      request.signal,
      disconnected.signal,
    ]);
    const stream = new ReadableStream({
      cancel() {
        disconnected.abort();
      },
      async start(controller) {
        const emit = (event: unknown) => {
          if (!responseSignal.aborted)
            try {
              controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            } catch {
              disconnected.abort();
            }
        };
        try {
          await getDb().aiMessageReady.create({
            data: { conversationId: id, role: 'user', content: input.message },
          });
          const history = (
            await getDb().aiMessageReady.findMany({
              where: { conversationId: id },
              orderBy: { createdAt: 'desc' },
              take: 12,
              select: { role: true, content: true, references: true },
            })
          ).reverse();
          const result = await runConcierge({
            history,
            preferences: conversation.preferences,
            headers: request.headers,
            context: input.context || null,
            signal: responseSignal,
            emit,
          });
          // Re-check the live session after generation, including an intervening sign-out.
          const current = await aiIdentity(request.headers);
          if (current.customerId !== identity.customerId)
            throw new PublicError(
              'Your session changed. Please sign in again.',
              401,
            );
          const latest = result.references.findLast((r) => r.filters)?.filters;
          responseSignal.throwIfAborted();
          await getDb().$transaction(async (tx) => {
            responseSignal.throwIfAborted();
            await tx.aiMessageReady.create({
              data: {
                conversationId: id,
                role: 'assistant',
                content: result.content,
                references: JSON.parse(JSON.stringify(result.references)),
              },
            });
            await tx.aiConversationReady.update({
              where: { id },
              data: {
                ...(latest ? { preferences: filtersSchema.parse(latest) } : {}),
                ...(conversation.turnCount === 0
                  ? { title: input.message.slice(0, 60) }
                  : {}),
              },
            });
            responseSignal.throwIfAborted();
          });
          emit({ type: 'done' });
        } catch (error) {
          emit({
            type: 'error',
            provider: providerFailure(error),
            text: 'The concierge could not finish this response. No request was submitted. Please try again.',
          });
        } finally {
          await getDb()
            .aiConversationReady.updateMany({
              where: { id, busyUntil: lease },
              data: { busyUntil: null },
            })
            .catch(() => {});
          try {
            controller.close();
          } catch {
            /* disconnected */
          }
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
