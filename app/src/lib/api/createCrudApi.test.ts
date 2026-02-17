import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createCrudApi } from './createCrudApi';
import { ApiHttpClient } from './httpClient';

// Mock the ApiHttpClient
vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
  }

  return {
    ApiHttpClient: MockHttpClient,
  };
});

describe('createCrudApi', () => {
  const mockHttpClient = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
  };

  // Define test schemas
  const itemSchema = z.object({
    id: z.number(),
    name: z.string(),
    value: z.string(),
    enabled: z.boolean(),
  });

  const createSchema = z.object({
    name: z.string(),
    value: z.string(),
    enabled: z.boolean(),
  });

  type TestItem = z.infer<typeof itemSchema>;
  type TestCreate = z.infer<typeof createSchema>;

  const crudApi = createCrudApi<TestItem, TestCreate>(mockHttpClient, {
    basePath: '/api/test-items',
    itemSchema,
  });

  it('should list all items', async () => {
    const mockItems: TestItem[] = [
      { id: 1, name: 'Item 1', value: 'value1', enabled: true },
      { id: 2, name: 'Item 2', value: 'value2', enabled: false },
    ];

    mockHttpClient.request.mockResolvedValue(mockItems);

    const result = await crudApi.list();

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items',
      },
      expect.anything(),
    );
    expect(result).toEqual(mockItems);
  });

  it('should create a new item', async () => {
    const mockCreatedItem: TestItem = {
      id: 3,
      name: 'New Item',
      value: 'newvalue',
      enabled: true,
    };

    mockHttpClient.request.mockResolvedValue(mockCreatedItem);

    const input: TestCreate = {
      name: 'New Item',
      value: 'newvalue',
      enabled: true,
    };

    const result = await crudApi.create(input);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items',
        method: 'POST',
        body: input,
      },
      itemSchema,
    );
    expect(result).toEqual(mockCreatedItem);
  });

  it('should update an item', async () => {
    const mockUpdatedItem: TestItem = {
      id: 1,
      name: 'Updated Item',
      value: 'updatedvalue',
      enabled: false,
    };

    mockHttpClient.request.mockResolvedValue(mockUpdatedItem);

    const updates: Partial<TestCreate> = {
      name: 'Updated Item',
      enabled: false,
    };

    const result = await crudApi.update(1, updates);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items/1',
        method: 'PUT',
        body: updates,
      },
      itemSchema,
    );
    expect(result).toEqual(mockUpdatedItem);
  });

  it('should remove an item', async () => {
    mockHttpClient.request.mockResolvedValue({ id: 1 });

    const result = await crudApi.remove(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items/1',
        method: 'DELETE',
      },
      expect.anything(),
    );
    expect(result).toEqual({ id: 1 });
  });

  it('should test an existing item', async () => {
    const mockTestResult = {
      success: true,
      message: 'Test successful',
      diagnostics: {
        remediationHints: [],
      },
    };

    mockHttpClient.request.mockResolvedValue(mockTestResult);

    const result = await crudApi.test(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items/1/test',
        method: 'POST',
      },
      expect.anything(),
    );
    expect(result).toEqual(mockTestResult);
  });

  it('should test a draft item configuration', async () => {
    const mockTestResult = {
      success: false,
      message: 'Test failed',
      diagnostics: {
        remediationHints: ['Check configuration'],
      },
    };

    mockHttpClient.request.mockResolvedValue(mockTestResult);

    const draft: TestCreate = {
      name: 'Draft Item',
      value: 'draftvalue',
      enabled: true,
    };

    const result = await crudApi.testDraft(draft);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/test-items/test',
        method: 'POST',
        body: draft,
      },
      expect.anything(),
    );
    expect(result).toEqual(mockTestResult);
  });

  it('should use custom listSchema if provided', async () => {
    const customListSchema = z.array(
      itemSchema.extend({
        extraField: z.string(),
      })
    );

    const customCrudApi = createCrudApi<TestItem & { extraField: string }, TestCreate>(mockHttpClient, {
      basePath: '/api/custom-items',
      itemSchema,
      listSchema: customListSchema,
    });

    const mockItems: (TestItem & { extraField: string })[] = [
      { id: 1, name: 'Item 1', value: 'value1', enabled: true, extraField: 'extra' },
    ];

    mockHttpClient.request.mockResolvedValue(mockItems);

    const result = await customCrudApi.list();

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/custom-items',
      },
      customListSchema,
    );
    expect(result).toEqual(mockItems);
  });
});
