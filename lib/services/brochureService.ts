import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { projectDetail } from './projectService';
import { randomUUID } from 'node:crypto';
// Minimal text PDF: server-generated from current project records, no remote service.
export async function brochure(slug: string) {
  const detail = await projectDetail(slug);
  if (!detail) return null;
  const p = detail.property;
  const lines = [
    'AURELIA ESTATES',
    p.name,
    `${p.neighbourhood}, ${p.city}`,
    `Fictional developer: ${p.developer}`,
    `Price: INR ${(p.price * 1e7).toLocaleString('en-IN')} onwards`,
    `${p.area} - ${p.maxArea} sq.ft. | ${p.status}`,
    `Possession: ${p.possession}`,
    '',
    ...p.amenities,
    '',
    'Fictional collection brochure. Not an offer for sale.',
    'All inventory, pricing, dates and distances are illustrative.',
    'Contact details and visit requests are stored when submitted.',
    'Visit requests are not confirmed appointments.',
  ];
  const escaped = lines.map((l) =>
    l.replace(/[^\x20-\x7E]/g, ' ').replace(/[\\()]/g, '\\$&'),
  );
  const stream = `BT /F1 12 Tf 50 780 Td 19 TL ${escaped.map((l, i) => `${i ? 'T* ' : ''}(${l}) Tj`).join('\n')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, obj] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  await getDb().$transaction([
    getDb().brochureDownload.create({ data: { projectId: p.id } }),
    getDb().userEvent.create({
      data: {
        eventKey: randomUUID(),
        kind: 'BROCHURE_CLICKED',
        projectId: p.id,
      },
    }),
  ]);
  return new Uint8Array(Buffer.from(pdf));
}
