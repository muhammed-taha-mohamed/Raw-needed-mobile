import { describe, it, expect } from 'vitest';
import { setAlertService, Alerts } from '../services/alerts';

describe('Alerts service', () => {
  it('delegates to alert service', () => {
    const calls: any[] = [];
    setAlertService((opts) => calls.push(opts));
    Alerts.success('Saved!', { title: 'Done', duration: 1000 });
    expect(calls.length).toBe(1);
    expect(calls[0].message).toBe('Saved!');
    expect(calls[0].type).toBe('success');
    expect(calls[0].title).toBe('Done');
  });
});
