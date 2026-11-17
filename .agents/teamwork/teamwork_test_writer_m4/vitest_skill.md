---
name: vitest-skill
description: 'Generates Vitest tests in JavaScript/TypeScript with Vite-native speed. Jest-compatible API with ESM support and HMR. Use when user mentions "Vitest", "vi.mock", "vitest.config". Triggers on: "Vitest", "vi.mock", "vi.fn", "Vite test", "vitest config".'
risk: critical
source: https://github.com/LambdaTest/agent-skills/tree/main/vitest-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Vitest Testing Skill
## When to Use

Use this skill when you need generates Vitest tests in JavaScript/TypeScript with Vite-native speed. Jest-compatible API with ESM support and HMR. Use when user mentions "Vitest", "vi.mock", "vitest.config". Triggers on: "Vitest", "vi.mock", "vi.fn", "Vite test", "vitest config".


## Core Patterns

### Basic Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Calculator } from './calculator';

describe('Calculator', () => {
  let calc: Calculator;
  beforeEach(() => { calc = new Calculator(); });

  it('adds two numbers', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  it('throws on divide by zero', () => {
    expect(() => calc.divide(10, 0)).toThrow();
  });
});
```

### Mocking (vi instead of jest)

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('./database', () => ({
  getUser: vi.fn().mockResolvedValue({ name: 'Alice' }),
  saveUser: vi.fn().mockResolvedValue(true),
}));

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'test' });

// Spy
const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
expect(spy).toHaveBeenCalledWith('message');
spy.mockRestore();

// Timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.runAllTimers();
vi.useRealTimers();
```

### Quick Reference

| Task | Command |
|------|---------|
| Run once | `npx vitest run` |
| Watch | `npx vitest` (default) |
| Coverage | `npx vitest --coverage` |
| Specific file | `npx vitest run src/math.test.ts` |
| Filter | `npx vitest run -t "adds"` |
