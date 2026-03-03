'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/providers/ToastProvider';
export function useOptimisticMutation(options) {
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    return useMutation({
        mutationFn: options.mutationFn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: options.queryKey });
            const entries = queryClient.getQueriesData({ queryKey: options.queryKey });
            queryClient.setQueriesData({ queryKey: options.queryKey }, current => {
                if (!current) {
                    return current;
                }
                return options.updater(current, variables);
            });
            return { entries };
        },
        onError: (_error, _variables, context) => {
            for (const [key, value] of context?.entries ?? []) {
                queryClient.setQueryData(key, value);
            }
            pushToast({
                title: 'Mutation failed',
                message: options.errorMessage,
                variant: 'error',
            });
        },
        onSuccess: (result, variables) => {
            options.onSuccess?.(result, variables);
        },
    });
}
//# sourceMappingURL=useOptimisticMutation.js.map