import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase, initializeDatabase, query } from '../src/db/database.js';
import { errorHandler } from '../src/middleware/error-middleware.js';
import { authenticate, requireAdmin } from '../src/middleware/auth-middleware.js';
import { createSessionToken, hashPassword } from '../src/services/auth-service.js';

const app = createApp();
const authorizationApp = express();

authorizationApp.get('/admin-only', authenticate, requireAdmin, (request, response) =>
  response.json({ data: { authorized: true } }),
);
authorizationApp.use(errorHandler);

const customerInput = {
  name: 'Mara Santos',
  email: 'Mara.Santos@Example.com',
  password: 'Garden123',
};

const registerCustomer = (agent = request(app)) =>
  agent.post('/api/auth/register').send(customerInput);

beforeAll(async () => {
  await initializeDatabase();
});

beforeEach(async () => {
  await query('DELETE FROM users');
});

afterAll(async () => {
  await closeDatabase();
});

describe('authentication API', () => {
  it('registers a customer, normalizes email, and restores the cookie session', async () => {
    const agent = request.agent(app);
    const registerResponse = await registerCustomer(agent).expect(201);

    expect(registerResponse.body.data.user).toMatchObject({
      name: 'Mara Santos',
      email: 'mara.santos@example.com',
      role: 'customer',
    });
    expect(registerResponse.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(registerResponse.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(JSON.stringify(registerResponse.body)).not.toMatch(/password|token/i);

    const meResponse = await agent.get('/api/auth/me').expect(200);
    expect(meResponse.body.data.user.email).toBe('mara.santos@example.com');

    const databaseUser = await query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['mara.santos@example.com'],
    );
    expect(databaseUser.rows[0].password_hash).not.toBe(customerInput.password);
    expect(databaseUser.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects duplicate normalized email addresses', async () => {
    await registerCustomer().expect(201);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...customerInput, email: '  MARA.SANTOS@example.com ' })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('logs in with normalized email and logs out', async () => {
    await registerCustomer().expect(201);
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ email: ' MARA.SANTOS@EXAMPLE.COM ', password: customerInput.password })
      .expect(200);

    expect(loginResponse.body.data.user.role).toBe('customer');
    await agent.get('/api/auth/me').expect(200);

    const logoutResponse = await agent.post('/api/auth/logout').expect(200);
    expect(logoutResponse.body.data.signedOut).toBe(true);
    await agent.get('/api/auth/me').expect(401);
  });

  it('returns the same generic response for unknown users and wrong passwords', async () => {
    await registerCustomer().expect(201);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: customerInput.email, password: 'Incorrect999' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'Incorrect999' })
      .expect(401);

    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects missing, malformed, and expired authentication credentials', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);

    const passwordHash = await hashPassword('Admin12345');
    const insertResult = await query(
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ('30000000-0000-4000-8000-000000000001', 'Test Admin',
          'admin@example.com', $1, 'admin')
        RETURNING id, name, email, role, created_at
      `,
      [passwordHash],
    );
    const expiredToken = await createSessionToken(insertResult.rows[0], {
      expirationTime: '0s',
    });

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('allows administrators and denies customers in admin middleware', async () => {
    const passwordHash = await hashPassword('RoleTest123');
    const adminResult = await query(
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ('30000000-0000-4000-8000-000000000002', 'Ari Admin',
          'ari.admin@example.com', $1, 'admin')
        RETURNING id, name, email, role, created_at
      `,
      [passwordHash],
    );
    const customerResult = await query(
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ('30000000-0000-4000-8000-000000000003', 'Casey Customer',
          'casey@example.com', $1, 'customer')
        RETURNING id, name, email, role, created_at
      `,
      [passwordHash],
    );
    const adminToken = await createSessionToken(adminResult.rows[0]);
    const customerToken = await createSessionToken(customerResult.rows[0]);

    await request(authorizationApp)
      .get('/admin-only')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await request(authorizationApp)
      .get('/admin-only')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rejects browser requests from an untrusted origin', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'https://malicious.example')
      .send(customerInput)
      .expect(403);

    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
