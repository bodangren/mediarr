
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/providers/ToastProvider';

interface UseOptimisticMutationOptions<TData, TVariables, TResult> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TResult>;
  updater: (current: TData, variables: TVariables) => TData;
  onSuccess?: (result: TResult, variables: TVariables) => void;
  errorMessage: string;
}

interface Snapshot<TData> {
  entries: Array<[QueryKey, TData | undefined]>;
}

export function useOptimisticMutation<TData, TVariables, TResult>(
  options: UseOptimisticMutationOptions<TData, TVariables, TResult>,
) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      const entries = queryClient.getQueriesData<TData>({ queryKey: options.queryKey });
      queryClient.setQueriesData<TData>({ queryKey: options.queryKey }, current => {
        if (!current) {
          return current;
        }

        return options.updater(current, variables);
      });

      return { entries } satisfies Snapshot<TData>;
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
