import 'server-only';
import { z } from 'zod';
import { whatsappConfig, whatsappReady, graphId } from './config';
import { PublicError } from '@/lib/http';
export type SendInput = {
  to: string;
  correlationId: string;
  text: string;
  template?: { name: string; language: string; parameters: string[] };
};
export type Template = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  parameterCount: number;
  supported: boolean;
};
export interface WhatsAppProvider {
  send(input: SendInput): Promise<{ id: string }>;
  templates(): Promise<Template[]>;
}
export class TransportError extends Error {
  constructor(
    public code: string,
    public uncertain = false,
    public retryable = false,
  ) {
    super('WhatsApp provider request could not be completed.');
  }
}
const templateSchema = z.object({
  id: graphId,
  name: z.string().regex(/^[a-z0-9_]+$/),
  language: z.string().max(25),
  status: z.string().max(40),
  category: z.string().max(40),
  components: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().max(4096).optional(),
        format: z.string().optional(),
      }),
    )
    .max(10),
});
export class MetaCloudProvider implements WhatsAppProvider {
  constructor(
    private transport: typeof fetch = fetch,
    private config = whatsappConfig(),
  ) {}
  private async request(path: string, body?: unknown) {
    if (!this.config.token || !/^v\d+\.0$/.test(this.config.version))
      throw new PublicError(
        'WhatsApp is not configured. No message was sent.',
        503,
      );
    let response: Response;
    try {
      response = await this.transport(
        `https://graph.facebook.com/${this.config.version}/${path}`,
        {
          method: body ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(15000),
          redirect: 'error',
          cache: 'no-store',
        },
      );
    } catch {
      throw new TransportError('TRANSPORT_UNCERTAIN', !!body);
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new TransportError('INVALID_RESPONSE', !!body);
    }
    if (!response.ok) {
      const code = z
        .object({ error: z.object({ code: z.number().int() }) })
        .safeParse(data);
      throw new TransportError(
        code.success
          ? 'META_' + code.data.error.code
          : 'HTTP_' + response.status,
        response.status >= 500,
        response.status === 429,
      );
    }
    return data;
  }
  async send(input: SendInput) {
    graphId.parse(this.config.phoneNumberId);
    const data = await this.request(this.config.phoneNumberId + '/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to.replace(/^\+/, ''),
      biz_opaque_callback_data: input.correlationId,
      ...(input.template
        ? {
            type: 'template',
            template: {
              name: input.template.name,
              language: { code: input.template.language },
              ...(input.template.parameters.length
                ? {
                    components: [
                      {
                        type: 'body',
                        parameters: input.template.parameters.map((text) => ({
                          type: 'text',
                          text,
                        })),
                      },
                    ],
                  }
                : {}),
            },
          }
        : { type: 'text', text: { body: input.text, preview_url: false } }),
    });
    const parsed = z
      .object({
        messages: z.array(z.object({ id: z.string().min(1).max(300) })).min(1),
      })
      .safeParse(data);
    if (!parsed.success) throw new TransportError('INVALID_RESPONSE', true);
    return { id: parsed.data.messages[0].id };
  }
  async templates() {
    graphId.parse(this.config.businessAccountId);
    const data = z
      .object({ data: z.array(templateSchema).max(100) })
      .parse(
        await this.request(
          this.config.businessAccountId +
            '/message_templates?fields=id,name,language,status,category,components&limit=100',
        ),
      );
    return data.data.map((t) => {
      const body = t.components.find((c) => c.type === 'BODY')?.text || '';
      const placeholders = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) =>
        Number(m[1]),
      );
      const count = Math.max(0, ...placeholders);
      return {
        id: t.id,
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category,
        body,
        parameterCount: count,
        supported:
          !!body &&
          t.category === 'UTILITY' &&
          count <= 8 &&
          Array.from({ length: count }, (_, i) => i + 1).every((n) =>
            placeholders.includes(n),
          ) &&
          !/\{\{[^\d]/.test(body) &&
          t.components.every((c) => c.type === 'BODY' || c.type === 'FOOTER'),
      };
    });
  }
}
export function liveProvider() {
  if (!whatsappReady())
    throw new PublicError(
      'WhatsApp is not configured. No message was sent.',
      503,
    );
  return new MetaCloudProvider();
}
