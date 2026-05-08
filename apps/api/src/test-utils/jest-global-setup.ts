import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup(): Promise<void> {
  const server = await MongoMemoryServer.create();
  await server.stop();
}
