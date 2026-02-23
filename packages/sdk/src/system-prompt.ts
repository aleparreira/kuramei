import type { ExperiencePackage } from './experience-package.js';

/**
 * Composes a system prompt from a base string and a list of experience packages.
 *
 * Output format:
 * <base>
 *
 * == <package.name> ==
 * <package.systemPromptSection>
 *
 * == <package.name> ==
 * ...
 */
export function buildSystemPrompt(base: string, packages: ExperiencePackage[]): string {
  if (packages.length === 0) return base;

  const sections = packages
    .map((pkg) => `== ${pkg.name} ==\n${pkg.systemPromptSection}`)
    .join('\n\n');

  return `${base}\n\n${sections}`;
}
