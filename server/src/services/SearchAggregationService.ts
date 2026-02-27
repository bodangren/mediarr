import { MediaSearchService } from './MediaSearchService';

/**
 * Monolith-native search aggregation service used by domain controllers.
 *
 * This currently extends MediaSearchService to preserve existing behavior
 * while exposing an explicit domain-level dependency.
 */
export class SearchAggregationService extends MediaSearchService {}
