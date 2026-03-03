import { type QueryKey } from '@tanstack/react-query';
interface UseOptimisticMutationOptions<TData, TVariables, TResult> {
    queryKey: QueryKey;
    mutationFn: (variables: TVariables) => Promise<TResult>;
    updater: (current: TData, variables: TVariables) => TData;
    onSuccess?: (result: TResult, variables: TVariables) => void;
    errorMessage: string;
}
export declare function useOptimisticMutation<TData, TVariables, TResult>(options: UseOptimisticMutationOptions<TData, TVariables, TResult>): import("@tanstack/react-query").UseMutationResult<TResult, Error, TVariables, {
    entries: [readonly unknown[], TData | undefined][];
}>;
export {};
//# sourceMappingURL=useOptimisticMutation.d.ts.map