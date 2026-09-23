import 'server-only';
import { z } from 'zod';
export function whatsappConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.META_APP_SECRET || '',
    version: process.env.WHATSAPP_GRAPH_VERSION || 'v25.0',
  };
}
export function whatsappReady() {
  const c = whatsappConfig();
  return !!(
    c.token &&
    c.verifyToken &&
    c.appSecret &&
    /^\d+$/.test(c.phoneNumberId) &&
    /^\d+$/.test(c.businessAccountId) &&
    /^v\d+\.0$/.test(c.version)
  );
}
// This is only a public wa.me destination, never an API credential.
export function publicWhatsAppLink(project?: string) {
  const phone = process.env.WHATSAPP_PUBLIC_PHONE;
  if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) return null;
  const text = project
    ? `I'm interested in ${project}. Please help me explore the residences.`
    : 'I would like to speak with Aurelia about a residence.';
  return (
    'https://wa.me/' + phone.slice(1) + '?text=' + encodeURIComponent(text)
  );
}
export const graphId = z.string().regex(/^\d{1,40}$/);
