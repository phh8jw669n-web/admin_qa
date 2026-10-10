export interface ApiResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export function apiSuccess<T>(message: string, data: T): ApiResponse<T> {
  return { success: true, message, data };
}

export function apiData<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function apiSuccessMessage(message: string): ApiResponse {
  return { success: true, message };
}

export function apiError(
  messageOrErrors?: string | string[],
  errors?: string[],
): Pick<ApiResponse, 'success' | 'message' | 'errors'> {
  if (Array.isArray(messageOrErrors)) {
    return { success: false, errors: messageOrErrors };
  }

  if (errors?.length) {
    return { success: false, errors };
  }

  return { success: false, message: messageOrErrors ?? 'Request failed' };
}

export function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse).success === 'boolean'
  );
}
