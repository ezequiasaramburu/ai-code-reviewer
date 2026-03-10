jest.mock('../../dist/queue/queue', () => {
  return {
    createReviewQueue: jest.fn(() => ({})),
    enqueueReview: jest.fn(async () => {}),
  };
});

const { webhookHandler } = require('../../dist/webhook/handler');
const { enqueueReview } = require('../../dist/queue/queue');
const { GITHUB_EVENT_PULL_REQUEST } = require('../../dist/webhook/constants');

function makeReply() {
  const res = {
    statusCode: undefined,
    payload: undefined,
    code(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
  return res;
}

function makeRequest(overrides = {}) {
  return {
    headers: {},
    body: {},
    log: {
      info: jest.fn(),
      warn: jest.fn(),
    },
    ...overrides,
  };
}

describe('webhookHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ignores non-pull_request events', async () => {
    const request = makeRequest({
      headers: { 'x-github-event': 'push' },
    });
    const reply = makeReply();

    await webhookHandler(request, reply);

    expect(reply.statusCode).toBe(204);
    expect(enqueueReview).not.toHaveBeenCalled();
  });

  test('returns 400 when PR or installation is missing', async () => {
    const request = makeRequest({
      headers: { 'x-github-event': GITHUB_EVENT_PULL_REQUEST },
      body: {
        repository: { owner: { login: 'owner' }, name: 'repo' },
        // missing pull_request or installation
      },
    });
    const reply = makeReply();

    await webhookHandler(request, reply);

    expect(reply.statusCode).toBe(400);
    expect(enqueueReview).not.toHaveBeenCalled();
    expect(request.log.warn).toHaveBeenCalled();
  });

  test('enqueues review job for valid pull_request event', async () => {
    const request = makeRequest({
      headers: { 'x-github-event': GITHUB_EVENT_PULL_REQUEST },
      body: {
        installation: { id: 123 },
        repository: { owner: { login: 'owner' }, name: 'repo' },
        pull_request: {
          number: 42,
          head: { sha: 'abcdef1234567890' },
        },
      },
    });
    const reply = makeReply();

    await webhookHandler(request, reply);

    expect(reply.statusCode).toBe(202);
    expect(enqueueReview).toHaveBeenCalledTimes(1);
    const [, job] = enqueueReview.mock.calls[0];
    expect(job).toMatchObject({
      installationId: 123,
      owner: 'owner',
      repo: 'repo',
      pullNumber: 42,
      sha: 'abcdef1234567890',
    });
  });
});

