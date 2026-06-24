/**
 * Waits for a condition to be true, checking at a specified interval.
 * @param conditionFn - A function that returns a boolean indicating whether the condition is met.
 * @param interval - The interval in milliseconds to check the condition (default is 500ms).
 * @returns A promise that resolves when the condition is met.
 */
export function waitForCondition(conditionFn: () => boolean, interval = 500): Promise<void> {
  return new Promise((resolve) => {
    if (conditionFn()) {
      resolve();

      return;
    }

    const checkInterval = setInterval(() => {
      if (conditionFn()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, interval);
  });
}
