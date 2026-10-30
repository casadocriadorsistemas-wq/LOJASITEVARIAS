export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export interface ParseResult {
  success: boolean;
  config?: FirebaseAppletConfig;
  formattedJson?: string;
  error?: string;
}

/**
 * Extracts a value from a JS/JSON configuration string by key name.
 * Handles single or double quotes, with or without quotes around keys,
 * and with or without trailing commas or semicolons.
 */
function extractValue(input: string, key: string): string {
  // Pattern matches: key: "value" or 'key': 'value' or "key": "value"
  const regex = new RegExp(`['"]?${key}['"]?\\s*[:=]\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
  const match = input.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Parses any Firebase configuration string (JS snippet or JSON format)
 * and normalizes it to the standard firebase-applet-config.json format.
 */
export function parseFirebaseConfigInput(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { success: false, error: 'O texto de configuração está vazio.' };
  }

  let projectId = '';
  let appId = '';
  let apiKey = '';
  let authDomain = '';
  let storageBucket = '';
  let messagingSenderId = '';
  let measurementId = '';
  let firestoreDatabaseId = '';
  let oAuthClientId = '';
  let recaptchaSiteKey = '';

  // 1. First attempt: standard JSON.parse
  let jsonSuccess = false;
  try {
    // If it starts with const or var, strip variable declaration
    let cleanJson = trimmed;
    if (cleanJson.includes('=')) {
      cleanJson = cleanJson.substring(cleanJson.indexOf('=') + 1).trim();
    }
    if (cleanJson.endsWith(';')) {
      cleanJson = cleanJson.slice(0, -1).trim();
    }
    const parsed = JSON.parse(cleanJson);
    if (typeof parsed === 'object' && parsed !== null) {
      projectId = parsed.projectId || '';
      appId = parsed.appId || '';
      apiKey = parsed.apiKey || '';
      authDomain = parsed.authDomain || '';
      storageBucket = parsed.storageBucket || '';
      messagingSenderId = parsed.messagingSenderId || '';
      measurementId = parsed.measurementId || '';
      firestoreDatabaseId = parsed.firestoreDatabaseId || '';
      oAuthClientId = parsed.oAuthClientId || '';
      recaptchaSiteKey = parsed.recaptchaSiteKey || '';
      jsonSuccess = true;
    }
  } catch {
    // Continue to regex extractor
  }

  // 2. Second attempt: Regex extraction if JSON.parse didn't get core fields
  if (!jsonSuccess || !apiKey || !projectId) {
    projectId = extractValue(trimmed, 'projectId');
    appId = extractValue(trimmed, 'appId');
    apiKey = extractValue(trimmed, 'apiKey');
    authDomain = extractValue(trimmed, 'authDomain');
    storageBucket = extractValue(trimmed, 'storageBucket');
    messagingSenderId = extractValue(trimmed, 'messagingSenderId');
    measurementId = extractValue(trimmed, 'measurementId');
    firestoreDatabaseId = extractValue(trimmed, 'firestoreDatabaseId');
    oAuthClientId = extractValue(trimmed, 'oAuthClientId');
    recaptchaSiteKey = extractValue(trimmed, 'recaptchaSiteKey');
  }

  // 3. Validation
  const missing: string[] = [];
  if (!apiKey) missing.push('apiKey');
  if (!projectId) missing.push('projectId');
  if (!appId) missing.push('appId');

  if (missing.length > 0) {
    return {
      success: false,
      error: `Campos obrigatórios não encontrados: ${missing.join(', ')}. Verifique o formato inserido.`
    };
  }

  // Default fallbacks
  if (!authDomain) {
    authDomain = `${projectId}.firebaseapp.com`;
  }
  if (!storageBucket) {
    storageBucket = `${projectId}.firebasestorage.app`;
  }
  if (!firestoreDatabaseId) {
    firestoreDatabaseId = '(default)';
  }

  const normalizedConfig: FirebaseAppletConfig = {
    projectId,
    appId,
    apiKey,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
    measurementId,
    oAuthClientId: oAuthClientId || '',
    recaptchaSiteKey: recaptchaSiteKey || ''
  };

  return {
    success: true,
    config: normalizedConfig,
    formattedJson: JSON.stringify(normalizedConfig, null, 2)
  };
}
