const { createProvider, createProviderFromEnv } = require('../../dist/llm/factory');

describe('LLM factory', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('createProvider returns correct provider type', () => {
    const claude = createProvider({ provider: 'claude', apiKey: 'x' });
    const openai = createProvider({ provider: 'openai', apiKey: 'x' });
    const gemini = createProvider({ provider: 'gemini', apiKey: 'x' });

    expect(claude.name).toBe('claude');
    expect(openai.name).toBe('openai');
    expect(gemini.name).toBe('gemini');
  });

  test('createProvider chooses default model when none provided', () => {
    const claude = createProvider({ provider: 'claude', apiKey: 'x' });
    const openai = createProvider({ provider: 'openai', apiKey: 'x' });
    const gemini = createProvider({ provider: 'gemini', apiKey: 'x' });

    expect(claude.model).toBe('claude-sonnet-4-20250514');
    expect(openai.model).toBe('gpt-4o');
    expect(gemini.model).toBe('gemini-1.5-pro');
  });

  test('createProviderFromEnv selects provider and model from env', () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'secret-key';
    process.env.LLM_MODEL = 'gpt-4.1-mini';

    const provider = createProviderFromEnv();

    expect(provider.name).toBe('openai');
    expect(provider.model).toBe('gpt-4.1-mini');
  });

  test('createProviderFromEnv throws on missing API key', () => {
    process.env.LLM_PROVIDER = 'claude';
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => createProviderFromEnv()).toThrow(/Missing API key/);
  });

  test('createProvider throws on unknown provider', () => {
    expect(() =>
      createProvider({ provider: 'unknown', apiKey: 'x' }),
    ).toThrow(/Unknown provider/);
  });
});

