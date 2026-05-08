import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/pokemon',
      }),
    }),
    CommonModule,
    HealthModule,
    // PokemonModule and ListsModule are wired in their own tasks below.
  ],
})
export class AppModule {}
