import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingModule } from './scheduling.module';

describe('SchedulingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });
});
