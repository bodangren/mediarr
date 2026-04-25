# Spec: Form Standardization

## Context

After the shadcn/ui migration, forms in the app fall into two incompatible patterns:

1. **Manual `useState` pattern** — each field has its own state variable, a `useEffect` to load
   initial values, and a manual save handler. Validation is ad-hoc or absent.
2. **react-hook-form + zod** — declarative schema-first validation, `useForm`, `Controller`.

Both `react-hook-form` and `zod` are already installed. shadcn/ui ships a `<Form>` component
that wraps react-hook-form with accessible labels, error messages, and description slots.

The current inconsistency means:
- Any new settings form requires a decision on which pattern to use (coin flip)
- Forms using manual state have no structured validation — errors surface as raw API failures
- The `EnhancedSelectInput` and `TagInput` in `Form.tsx` have no react-hook-form integration

## Standard Pattern (post-track)

All forms follow this structure:

```tsx
const schema = z.object({ fieldName: z.string().min(1, 'Required') });
type FormValues = z.infer<typeof schema>;

function MySettingsForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const onSubmit = form.handleSubmit(async (data) => { /* call API */ });
  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <FormField control={form.control} name="fieldName" render={({ field }) => (
          <FormItem>
            <FormLabel>Field Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
```

## Acceptance Criteria

- Every settings page form uses `useForm` + `zodResolver` + shadcn `<Form>`.
- Every modal form with user input uses the same pattern.
- No settings form uses raw `useState` per field for form state.
- `EnhancedSelectInput` and `TagInput` (if retained) expose a `react-hook-form`-compatible
  `Controller`-friendly API (`value` + `onChange`).
- `Form.tsx` `@deprecated` shim is deleted; all imports updated.
- `cd app && npm run build` succeeds. All tests pass.
