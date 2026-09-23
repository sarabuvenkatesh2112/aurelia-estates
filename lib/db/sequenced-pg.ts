import { PrismaPg } from '@prisma/adapter-pg';

type Adapter = Awaited<ReturnType<PrismaPg['connect']>>;
type Transaction = Awaited<ReturnType<Adapter['startTransaction']>>;

// Prisma can fan out relation reads inside one awaited findMany(). A transaction
// owns one pg client, so sequence its operations before they reach client.query.
// Root adapter queries still use the pool concurrently; every transaction has
// its own queue. Keep failed operations rejected to callers without poisoning
// the queue needed for rollback and connection release.
export function sequenceTransaction(transaction: Transaction): Transaction {
  let tail: Promise<unknown> = Promise.resolve();
  let closing: Promise<void> | undefined;
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
  const run = <T>(operation: () => Promise<T>): Promise<T> =>
    closing
      ? Promise.reject(new Error('Transaction has already finished'))
      : enqueue(operation);
  const finish = (operation: () => Promise<void>) =>
    (closing ??= enqueue(operation));

  return {
    provider: transaction.provider,
    adapterName: transaction.adapterName,
    options: transaction.options,
    queryRaw: (query) => run(() => transaction.queryRaw(query)),
    executeRaw: (query) => run(() => transaction.executeRaw(query)),
    commit: () => finish(() => transaction.commit()),
    rollback: () => finish(() => transaction.rollback()),
    ...(transaction.createSavepoint && {
      createSavepoint: (name: string) =>
        run(() => transaction.createSavepoint!(name)),
    }),
    ...(transaction.rollbackToSavepoint && {
      rollbackToSavepoint: (name: string) =>
        run(() => transaction.rollbackToSavepoint!(name)),
    }),
    ...(transaction.releaseSavepoint && {
      releaseSavepoint: (name: string) =>
        run(() => transaction.releaseSavepoint!(name)),
    }),
  };
}

export class SequencedPrismaPg extends PrismaPg {
  override async connect() {
    const adapter = await super.connect();
    const startTransaction = adapter.startTransaction.bind(adapter);
    adapter.startTransaction = async (isolationLevel) =>
      sequenceTransaction(await startTransaction(isolationLevel));
    return adapter;
  }
}
