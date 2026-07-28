function readRequiredEnvironmentValue(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required frontend environment value: ${name}`);
  }

  return value.trim();
}

export const environment = {
  appName: readRequiredEnvironmentValue('VITE_APP_NAME'),
  apiBaseUrl: readRequiredEnvironmentValue('VITE_API_BASE_URL').replace(/\/$/, ''),
  apiOrigin: readRequiredEnvironmentValue('VITE_API_ORIGIN').replace(/\/$/, ''),
  supabaseUrl: readRequiredEnvironmentValue('VITE_SUPABASE_URL').replace(/\/$/, ''),
  supabasePublishableKey: readRequiredEnvironmentValue('VITE_SUPABASE_PUBLISHABLE_KEY'),
} as const;
