const { registerUser, loginUser } = require('../services/authService');
const { User } = require('../models');
const bcrypt = require('bcrypt');

jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

describe('registerUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if missing fields', async () => {
    await expect(registerUser({ email: '', password: '', name: '' }))
      .rejects.toThrow('Please provide all required fields');
  });

  it('should throw error if password too short', async () => {
    await expect(registerUser({ email: 'a@a.com', password: '123', name: 'A' }))
      .rejects.toThrow('Password must be at least 8 characters long');
  });

  it('should throw error if user already exists', async () => {
    User.findOne.mockResolvedValue({ id: 1 });
    await expect(registerUser({ email: 'a@a.com', password: '12345678', name: 'A' }))
      .rejects.toThrow('User already exists with this email');
  });

  it('should create user and return user data', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockResolvedValue({
      toJSON: () => ({
        id: 1,
        name: 'A',
        email: 'a@a.com',
        password_hash: 'hashedpw'
      })
    });

    const result = await registerUser({ email: 'a@a.com', password: '12345678', name: 'A' });
    expect(result.user).toMatchObject({
      id: 1,
      name: 'A',
      email: 'a@a.com'
    });
    expect(result.user.password_hash).toBeUndefined();
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if missing email or password', async () => {
    await expect(loginUser({ email: '', password: '' }))
      .rejects.toThrow('Please provide email and password');
  });

  it('should throw error if user not found', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(loginUser({ email: 'a@a.com', password: '12345678' }))
      .rejects.toThrow('Invalid email or password');
  });

  it('should throw error if password is incorrect', async () => {
    User.findOne.mockResolvedValue({
      id: 1,
      email: 'a@a.com',
      password_hash: 'hashedpw',
      role: 'user',
      toJSON: function () { return this; }
    });
    bcrypt.compare.mockResolvedValue(false);
    await expect(loginUser({ email: 'a@a.com', password: 'wrongpw' }))
      .rejects.toThrow('Invalid email or password');
  });

  it('should return user and token if login successful', async () => {
    User.findOne.mockResolvedValue({
      id: 1,
      email: 'a@a.com',
      password_hash: 'hashedpw',
      role: 'user',
      toJSON: function () { return this; }
    });
    bcrypt.compare.mockResolvedValue(true);
    require('jsonwebtoken').sign.mockReturnValue('mocked.jwt.token');

    const result = await loginUser({ email: 'a@a.com', password: '12345678' });
    expect(result.user).toMatchObject({
      id: 1,
      email: 'a@a.com',
      role: 'user'
    });
    expect(result.token).toBe('mocked.jwt.token');
  });
});