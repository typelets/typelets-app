/**
 * Pagination Utilities
 * Reusable pagination logic for API requests
 */

import { DEFAULT_PAGE_LIMIT, MAX_PAGES, PAGINATION_DELAY_MS } from './constants';

interface PaginationResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
  total?: number;
  limit?: number;
}

/**
 * Fetches all pages of data using pagination
 * @param fetchPage - Function that fetches a single page of data
 * @param extractData - Function that extracts the data array from the response
 * @returns Array of all items across all pages
 */
export async function fetchAllPages<TResponse, TItem>(
  fetchPage: (page: number) => Promise<TResponse>,
  extractData: (response: TResponse) => TItem[]
): Promise<TItem[]> {
  const allItems: TItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const response = await fetchPage(page);
    const pageItems = extractData(response);
    allItems.push(...pageItems);

    // Determine if there are more pages
    hasMore = determineHasMorePages(response, pageItems.length);

    if (hasMore) {
      page++;
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, PAGINATION_DELAY_MS));
    } else {
      break;
    }
  }

  if (page > MAX_PAGES) {
    if (__DEV__) {
      console.warn(`Reached maximum page limit (${MAX_PAGES})`);
    }
  }

  return allItems;
}

/**
 * Determines if there are more pages based on the response structure
 */
function determineHasMorePages<T>(
  response: T,
  pageItemsCount: number
): boolean {
  const resp = response as PaginationResponse<unknown>;

  // Check for pagination object
  if (resp.pagination) {
    const { page, totalPages, pages } = resp.pagination as any;
    // API uses 'pages' not 'totalPages'
    const total = totalPages || pages;
    if (total !== undefined) {
      return page < total;
    }
  }

  // Check for total/limit properties
  if (resp.total !== undefined && resp.limit !== undefined) {
    // Assuming current page can be inferred from items fetched
    return pageItemsCount >= resp.limit;
  }

  // Fallback: assume more pages if we got a full page
  return pageItemsCount >= DEFAULT_PAGE_LIMIT;
}

/**
 * Creates URL search params with pagination
 */
export function createPaginationParams(
  page: number,
  additionalParams?: Record<string, string | boolean | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', DEFAULT_PAGE_LIMIT.toString());
  params.append('_t', Date.now().toString()); // Cache busting

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }

  return params;
}
