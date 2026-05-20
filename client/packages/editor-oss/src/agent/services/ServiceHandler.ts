/**
 * Generic async service handler contract.
 * Keeps client classes thin and delegates operational logic to dedicated services.
 */
export interface ServiceHandler<TInput, TResult = void> {
    execute(input: TInput): Promise<TResult>;
}
