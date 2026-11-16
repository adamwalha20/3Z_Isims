/**
 * Custom Error Classes for Meeting BaaS API v2 Integration
 */

export class MeetingBaaSConfigurationError extends Error {
  constructor(message = 'Meeting BaaS API credentials are not configured. Please set MEETING_BAAS_API_KEY.') {
    super(message);
    this.name = 'MeetingBaaSConfigurationError';
  }
}

export class MeetingBaaSWebhookSecretError extends Error {
  constructor(message = 'Meeting BaaS Webhook Secret is not configured. Please set MEETING_BAAS_WEBHOOK_SECRET.') {
    super(message);
    this.name = 'MeetingBaaSWebhookSecretError';
  }
}

export class MeetingBaaSValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeetingBaaSValidationError';
  }
}

export class MeetingBaaSApiError extends Error {
  public statusCode: number;
  public responseData?: any;

  constructor(message: string, statusCode: number, responseData?: any) {
    super(message);
    this.name = 'MeetingBaaSApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

export class MeetingBaaSWebhookVerificationError extends Error {
  constructor(message = 'Invalid webhook cryptographic signature. Rejection mandated.') {
    super(message);
    this.name = 'MeetingBaaSWebhookVerificationError';
  }
}
