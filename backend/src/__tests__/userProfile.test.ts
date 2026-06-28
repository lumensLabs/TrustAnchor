import request from 'supertest';
import app from '../app.js';
import { resetUserProfileStore } from '../services/userProfileService.js';

const VALID_WALLET = `G${'A'.repeat(55)}`;

const validProfile = {
  email: 'alice@example.com',
  walletAddress: VALID_WALLET,
  firstName: 'Alice',
  lastName: 'Okonkwo',
  dateOfBirth: '1990-05-15',
  country: 'ng',
  phoneNumber: '+2348012345678',
  nationalId: 'NG-12345678',
};

beforeEach(() => {
  resetUserProfileStore();
});

describe('POST /api/user/profile', () => {
  it('should create a user profile and return 201', async () => {
    const response = await request(app)
      .post('/api/user/profile')
      .send(validProfile)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.profile).toMatchObject({
      email: 'alice@example.com',
      walletAddress: VALID_WALLET,
      firstName: 'Alice',
      lastName: 'Okonkwo',
      dateOfBirth: '1990-05-15',
      country: 'NG',
      phoneNumber: '+2348012345678',
      kycVerified: false,
    });
    expect(response.body.profile.id).toBeDefined();
    expect(response.body.profile.createdAt).toBeDefined();
  });

  it('should reject duplicate email with 409', async () => {
    await request(app).post('/api/user/profile').send(validProfile);

    const response = await request(app)
      .post('/api/user/profile')
      .send({ ...validProfile, walletAddress: undefined })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/already exists/i);
  });

  it('should reject invalid email', async () => {
    const response = await request(app)
      .post('/api/user/profile')
      .send({ ...validProfile, email: 'not-an-email' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
  });

  it('should reject missing required KYC fields', async () => {
    const response = await request(app)
      .post('/api/user/profile')
      .send({
        email: 'bob@example.com',
        firstName: 'Bob',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should reject invalid Stellar wallet address', async () => {
    const response = await request(app)
      .post('/api/user/profile')
      .send({ ...validProfile, walletAddress: 'invalid-wallet' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should reject invalid date of birth format', async () => {
    const response = await request(app)
      .post('/api/user/profile')
      .send({ ...validProfile, dateOfBirth: '15-05-1990' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
