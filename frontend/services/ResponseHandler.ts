import { useAuthStore } from '@/stores/authStore';

export interface ApiResponse<T> {
  data: T;
  error?: string;
  youtubeAuthRequired?: boolean;
}

export class ResponseHandler {
  static async handle<T>(response: Response, shouldThrowOnError = false): Promise<ApiResponse<T>> {
    if (!response.ok) {
      return this.handleErrorResponse<T>(response, shouldThrowOnError);
    }

    return this.handleSuccessResponse<T>(response);
  }

  private static async handleErrorResponse<T>(
    response: Response,
    shouldThrowOnError: boolean
  ): Promise<ApiResponse<T>> {
    switch (response.status) {
      case 401:
        return this.handleUnauthorizedResponse<T>();

      default:
        const errorContent = await this.extractErrorContent(response);

        if (errorContent.youtubeAuthRequired) {
          window.dispatchEvent(
            new CustomEvent('youtube-auth-required', {
              detail: { message: errorContent.message },
            })
          );
        }

        if (shouldThrowOnError) {
          throw new Error(errorContent.message);
        }

        return {
          data: [] as unknown as T,
          error: errorContent.message,
          youtubeAuthRequired: errorContent.youtubeAuthRequired,
        };
    }
  }

  private static async handleSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await this.extractResponseData<T>(response);
      return { data };
    } catch (error) {
      return {
        data: [] as unknown as T,
        error: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static handleUnauthorizedResponse<T>(): ApiResponse<T> {
    const authStore = useAuthStore.getState();
    authStore.logout();

    window.dispatchEvent(new CustomEvent('auth-required'));
    window.dispatchEvent(new CustomEvent('clear-react-query-cache'));

    return {
      data: null as unknown as T,
      error: 'Authentication required',
    };
  }

  private static async extractErrorContent(
    response: Response
  ): Promise<{ message: string; youtubeAuthRequired: boolean }> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return this.extractJsonError(response);
    } else {
      return this.extractTextError(response);
    }
  }

  private static async extractJsonError(
    response: Response
  ): Promise<{ message: string; youtubeAuthRequired: boolean }> {
    try {
      const errorData = await response.json();
      const youtubeAuthRequired = errorData.youtube_auth_required === true;
      const message =
        errorData.message ||
        errorData.error ||
        errorData.detail ||
        (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));

      return { message, youtubeAuthRequired };
    } catch {
      const errorText = await response.text();
      return {
        message: errorText || 'An error occurred while fetching the data.',
        youtubeAuthRequired: false,
      };
    }
  }

  private static async extractTextError(
    response: Response
  ): Promise<{ message: string; youtubeAuthRequired: boolean }> {
    const errorText = await response.text();
    return {
      message: errorText || 'An error occurred while fetching the data.',
      youtubeAuthRequired: false,
    };
  }

  private static async extractResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    } else if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    } else {
      return response.blob() as unknown as T;
    }
  }
}
