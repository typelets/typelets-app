/**
 * Public Notes API
 * Handles publishing and unpublishing notes as public web pages
 */

import { AuthTokenGetter, createHttpClient } from './client';
import { ApiPublicNote, Note } from './types';

export interface PublishNoteParams {
  noteId: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code' | 'sheets';
  authorName?: string;
}

export interface PublishNoteResponse {
  slug: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code' | 'sheets';
  authorName?: string;
  publishedAt: string;
  updatedAt: string;
}

export interface UpdatePublicNoteParams {
  title?: string;
  content?: string;
  authorName?: string;
}

/**
 * Creates the public notes API
 */
export function createPublicNotesApi(getToken: AuthTokenGetter) {
  const { makeRequest } = createHttpClient(getToken);

  return {
    /**
     * Publish a note as a public web page
     * Warning: This bypasses E2E encryption - an unencrypted copy is stored on the server
     */
    async publishNote(params: PublishNoteParams): Promise<PublishNoteResponse> {
      return makeRequest<PublishNoteResponse>('/public-notes', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Update a published note
     */
    async updatePublicNote(slug: string, params: UpdatePublicNoteParams): Promise<PublishNoteResponse> {
      return makeRequest<PublishNoteResponse>(`/public-notes/${slug}`, {
        method: 'PUT',
        body: JSON.stringify(params),
      });
    },

    /**
     * Unpublish a note (removes the public copy)
     */
    async unpublishNote(slug: string): Promise<{ message: string }> {
      return makeRequest<{ message: string }>(`/public-notes/${slug}`, {
        method: 'DELETE',
      });
    },

    /**
     * Get public note info for a note (authenticated - for owner)
     */
    async getPublicNoteInfo(noteId: string): Promise<ApiPublicNote | null> {
      try {
        return await makeRequest<ApiPublicNote>(`/public-notes/note/${noteId}`);
      } catch (error) {
        // Return null if note is not published (404)
        return null;
      }
    },

    /**
     * Get the public URL for a published note
     */
    getPublicUrl(slug: string): string {
      // The public URL is on the web app domain
      return `https://app.typelets.com/p/${slug}`;
    },
  };
}
