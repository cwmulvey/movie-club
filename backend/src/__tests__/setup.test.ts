import request from 'supertest';
import app from '../app';

describe('Application Setup', () => {
  it('should respond to health check (may show degraded without DB)', async () => {
    const response = await request(app)
      .get('/api/health');

    // Accept either 200 (healthy) or 503 (unhealthy/degraded without DB)
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('checks');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown')
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should still serve TMDB test endpoint', async () => {
    const response = await request(app)
      .get('/api/test/tmdb/batman')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('query', 'batman');
  });
});