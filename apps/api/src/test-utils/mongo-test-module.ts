import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

export const startInMemoryMongo = async (): Promise<string> => {
  mongod = await MongoMemoryServer.create();
  return mongod.getUri();
};

export const stopInMemoryMongo = async (): Promise<void> => {
  await mongod?.stop();
  mongod = undefined;
};

export const inMemoryMongoModule = (uri: string): ReturnType<typeof MongooseModule.forRoot> => {
  return MongooseModule.forRoot(uri);
};
