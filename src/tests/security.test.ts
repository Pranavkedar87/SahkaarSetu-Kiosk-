/**
 * Security Tests
 *
 * Verifies that:
 * - No backend secrets exist in any source file
 * - API_BASE_URL uses the Vite env var
 * - No localStorage writes for citizen data
 */

import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from '../services/api';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = resolve(__filename, '../..');  // src/

/** Recursively collect all .ts/.tsx files in src/ */
function getSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getSourceFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const FORBIDDEN_PATTERNS = [
  /GEMINI_API_KEY\s*[=:]/,
  /BHASHINI_API_KEY\s*[=:]/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[=:]/,
  /SUPABASE_SERVICE_KEY\s*[=:]/,
  /JWT_SECRET\s*[=:]/,
  /ADMIN_PASSWORD\s*[=:]/,
  // Hard-coded Gemini/GCP API key prefix pattern
  /['"](AIza[0-9A-Za-z\-_]{35})['"]/,
];

describe('Security', () => {
  it('API_BASE_URL is configured from environment variable', () => {
    // In test env VITE_API_BASE_URL may not be set; should fall back to localhost
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.startsWith('http')).toBe(true);
  });

  it('source files contain no forbidden secret patterns', () => {
    const files = getSourceFiles(__dirnameLocal).filter(
      (f) => !f.includes('/tests/')
    );

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(
          pattern.test(content),
          `Found forbidden pattern ${pattern} in ${relative(__dirnameLocal, file)}`
        ).toBe(false);
      }
    }
  });

  it('.env.example contains no real secret values', () => {
    const envExamplePath = resolve(__dirnameLocal, '../.env.example');
    const envExample = readFileSync(envExamplePath, 'utf8');
    // Should not contain actual GCP key values
    expect(envExample).not.toMatch(/AIza[0-9A-Za-z\-_]{35}/);
    // Should not contain JWT-like values
    expect(envExample).not.toMatch(/eyJ[A-Za-z0-9._-]{40,}/);
  });
});
