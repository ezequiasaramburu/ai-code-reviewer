import type { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';
import { RevelioConfigSchema, type RevelioConfig } from './schema';

export interface LoadConfigParams {
  client: Octokit;
  owner: string;
  repo: string;
  pathOverride?: string;
}

async function fetchFileContent(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: undefined,
    });

    if (!('content' in res.data)) return null;

    const encoded = res.data.content;
    const buff = Buffer.from(encoded, 'base64');
    return buff.toString('utf8');
  } catch (err: any) {
    // 404 → no config file, treat as "not found"
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function loadConfig(params: LoadConfigParams): Promise<RevelioConfig> {
  const { client, owner, repo, pathOverride } = params;

  const candidates = pathOverride
    ? [pathOverride]
    : ['.revelio.yml', '.revelio.yaml'];

  let raw: string | null = null;
  for (const path of candidates) {
    raw = await fetchFileContent(client, owner, repo, path);
    if (raw !== null) break;
  }

  if (raw === null) {
    // No config file present → use schema defaults.
    return RevelioConfigSchema.parse({});
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw) ?? {};
  } catch (e) {
    throw new Error('.revelio.yml is not valid YAML');
  }

  try {
    return RevelioConfigSchema.parse(parsed);
  } catch (e) {
    throw new Error(`.revelio.yml is invalid: ${(e as Error).message}`);
  }
}

