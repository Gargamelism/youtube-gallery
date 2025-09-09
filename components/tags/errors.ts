import { ApiResponse } from '@/services/ResponseHandler';

export class TagError extends Error {
  constructor(public translationKey: string, public code?: string, public params?: Record<string, unknown>) {
    super(translationKey);
    this.name = 'TagError';
  }
}

export function handleTagApiError<T>(response: ApiResponse<T>): void {
  if (response.error) {
    if (response.error.includes('already exists')) {
      throw new TagError('tags.errors.tagAlreadyExists', 'TAG_EXISTS');
    }
    
    if (response.error.includes('not found')) {
      throw new TagError('tags.errors.tagNotFound', 'TAG_NOT_FOUND');
    }
    
    if (response.error.includes('cannot be deleted') || response.error.includes('in use')) {
      throw new TagError('tags.errors.tagInUse', 'TAG_IN_USE');
    }
    
    if (response.error.includes('name') && response.error.includes('required')) {
      throw new TagError('tags.errors.nameRequired', 'NAME_REQUIRED');
    }
    
    if (response.error.includes('name') && response.error.includes('too long')) {
      throw new TagError('tags.errors.nameTooLong', 'NAME_TOO_LONG');
    }
    
    if (response.error.includes('color') && response.error.includes('invalid')) {
      throw new TagError('tags.errors.invalidColor', 'INVALID_COLOR');
    }
    
    throw new TagError('tags.errors.genericError', 'TAG_ERROR');
  }
}

export function getTagErrorKey(error: unknown): string {
  if (error instanceof TagError) {
    return error.translationKey;
  }
  
  return 'tags.errors.unexpectedError';
}

export function isTagError(error: unknown): error is TagError {
  return error instanceof TagError;
}