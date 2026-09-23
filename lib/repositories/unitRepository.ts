import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
// Future authenticated admin callers must use this atomic price/history boundary.
// There is intentionally no public mutation route.
export async function changeUnitPrice(
  unitId: string,
  price: number,
  reason: string,
) {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 1e12 ||
    reason.trim().length < 3
  )
    throw new PublicError('Invalid price adjustment.');
  return getDb().$transaction(
    async (tx) => {
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId } });
      await tx.unitPriceHistory.create({
        data: {
          unitId,
          oldPrice: unit.currentPrice,
          newPrice: price,
          changeReason: reason,
        },
      });
      return tx.unit.update({
        where: { id: unitId },
        data: { currentPrice: price },
      });
    },
    { isolationLevel: 'Serializable' },
  );
}
