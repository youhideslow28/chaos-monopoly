import assert from 'node:assert';

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected, msg) {
    const pass = Object.is(this.actual, expected);
    if (this.isNot ? pass : !pass) {
      throw new Error(
        msg ||
          `Assertion failed: expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`
      );
    }
  }

  toEqual(expected, msg) {
    try {
      assert.deepStrictEqual(this.actual, expected);
      if (this.isNot) {
        throw new Error(`Assertion failed: expected values NOT to deeply equal`);
      }
    } catch (err) {
      if (!this.isNot) throw (msg ? new Error(msg) : err);
    }
  }

  toBeTruthy(msg) {
    const pass = Boolean(this.actual);
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be truthy' : 'to be truthy'}`);
    }
  }

  toBeFalsy(msg) {
    const pass = !Boolean(this.actual);
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be falsy' : 'to be falsy'}`);
    }
  }

  toBeNull(msg) {
    this.toBe(null, msg);
  }

  toBeDefined(msg) {
    const pass = this.actual !== undefined;
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'to be undefined' : 'to be defined'}`);
    }
  }

  toContain(expected, msg) {
    let pass = false;
    if (typeof this.actual === 'string') {
      pass = this.actual.includes(expected);
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.includes(expected);
    } else if (this.actual && typeof this.actual === 'object') {
      pass = expected in this.actual;
    }
    if (this.isNot ? pass : !pass) {
      throw new Error(
        msg ||
          `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(expected)}`
      );
    }
  }

  toBeGreaterThan(expected, msg) {
    const pass = this.actual > expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${this.actual} ${this.isNot ? 'not to be >' : 'to be >'} ${expected}`);
    }
  }

  toBeGreaterThanOrEqual(expected, msg) {
    const pass = this.actual >= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${this.actual} ${this.isNot ? 'not to be >=' : 'to be >='} ${expected}`);
    }
  }

  toBeLessThan(expected, msg) {
    const pass = this.actual < expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${this.actual} ${this.isNot ? 'not to be <' : 'to be <'} ${expected}`);
    }
  }

  toBeLessThanOrEqual(expected, msg) {
    const pass = this.actual <= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${this.actual} ${this.isNot ? 'not to be <=' : 'to be <='} ${expected}`);
    }
  }

  toMatch(regex, msg) {
    const pass = regex.test(String(this.actual));
    if (this.isNot ? pass : !pass) {
      throw new Error(msg || `Expected ${String(this.actual)} ${this.isNot ? 'not to match' : 'to match'} ${regex}`);
    }
  }
}

export function expect(actual) {
  return new Expectation(actual);
}
