/**
 * Shared runtime types for Cloud Functions handlers used in this project.
 * Keep this minimal and expand as needed.
 */
export interface CallableAuth {
  uid?: string;
  token?: any;
}

export interface CallableContext {
  auth?: CallableAuth | null;
  instanceIdToken?: string;
  // Add other fields if needed in the future
}

export type AnyData = Record<string, any> | any;
