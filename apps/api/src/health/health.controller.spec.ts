import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const buildModule = async (readyState: number) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getConnectionToken(), useValue: { readyState } },
      ],
    }).compile();
    return moduleRef.get(HealthController);
  };

  it('returns ok when the connection is connected (readyState=1)', async () => {
    const controller = await buildModule(1);
    expect(controller.check()).toEqual({ status: 'ok' });
  });

  it('returns down when the connection is not connected', async () => {
    const controller = await buildModule(0);
    expect(controller.check()).toEqual({ status: 'down' });
  });
});
