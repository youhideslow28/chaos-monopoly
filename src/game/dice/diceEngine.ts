export interface DiceResult {
  dice: [number, number];
  sum: number;
  isDouble: boolean;
}

export function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollTwoDice(customValues?: [number, number]): DiceResult {
  const d1 = customValues ? customValues[0] : rollSingleDie();
  const d2 = customValues ? customValues[1] : rollSingleDie();
  return {
    dice: [d1, d2],
    sum: d1 + d2,
    isDouble: d1 === d2,
  };
}

export function calculateNewPosition(
  currentPos: number,
  steps: number,
  boardSize: number = 40
): {
  newPosition: number;
  passedStart: boolean;
} {
  const rawTarget = currentPos + steps;
  let passedStart = false;

  if (steps > 0) {
    passedStart = rawTarget >= boardSize;
  }

  const newPosition = ((rawTarget % boardSize) + boardSize) % boardSize;

  return {
    newPosition,
    passedStart,
  };
}
