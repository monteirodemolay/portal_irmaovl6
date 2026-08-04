import type { IClock } from '@vl6/domain';

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
