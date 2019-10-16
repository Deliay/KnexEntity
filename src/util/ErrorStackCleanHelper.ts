
/**
 * Call to replace 
 * @param promise old promise
 * @param error error
 */
export function ReplaceCallStack<T extends PromiseLike<any>>(promise: T, error: Error = new Error()): T {
  return new Promise((res, rej) => promise.then(res, (err) => {
    error.message = err.message;
    rej(error);
  })) as any as T;
}