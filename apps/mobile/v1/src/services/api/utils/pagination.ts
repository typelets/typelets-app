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
    totalPages?: number;
    pages?: number; // Some APIs use 'pages' instead of 'totalPages'
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
    const { page, totalPages, pages } = resp.pagination;
    // API uses 'pages' not 'totalPages', so check both
    const total = totalPages ?? pages;
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
 * Fetches all pages in parallel (after fetching page 1 to determine total)
 * Much faster than sequential pagination - eliminates artificial delays and waits
 * @param fetchPage - Function that fetches a single page of data
 * @param extractData - Function that extracts the data array from the response
 * @returns Array of all items across all pages
 */
export async function fetchAllPagesParallel<TResponse, TItem>(
  fetchPage: (page: number) => Promise<TResponse>,
  extractData: (response: TResponse) => TItem[]
): Promise<TItem[]> {
  // Step 1: Fetch first page to get metadata
  const firstPageResponse = await fetchPage(1);
  const firstPageItems = extractData(firstPageResponse);

  // Step 2: Determine how many total pages exist
  const resp = firstPageResponse as PaginationResponse<unknown>;
  let totalPages = 1;

  if (resp.pagination) {
    totalPages = resp.pagination.totalPages ?? resp.pagination.pages ?? 1;
  } else if (resp.total !== undefined && resp.limit !== undefined) {
    totalPages = Math.ceil(resp.total / resp.limit);
  } else if (firstPageItems.length >= DEFAULT_PAGE_LIMIT) {
    // Got a full page, assume there might be more
    // But we can't know for sure, so we'll just return what we got
    return firstPageItems;
  }

  // Step 3: If only one page, return immediately
  if (totalPages <= 1) {
    return firstPageItems;
  }

  // Step 4: Create promises for ALL remaining pages (in parallel!)
  const remainingPagePromises: Promise<TItem[]>[] = [];
  for (let page = 2; page <= Math.min(totalPages, MAX_PAGES); page++) {
    remainingPagePromises.push(
      fetchPage(page).then(response => extractData(response))
    );
  }

  // Step 5: Execute ALL requests in parallel
  const remainingPages = await Promise.all(remainingPagePromises);

  // Step 6: Flatten and combine with first page
  return [
    ...firstPageItems,
    ...remainingPages.flat()
  ];
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
