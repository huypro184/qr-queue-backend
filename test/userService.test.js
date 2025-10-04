const userService = require('../services/userService');
const { User, Project, Service } = require('../models');
const redisClient = require('../config/redisClient');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');

jest.mock('../models', () => ({
  User: { 
    findOne: jest.fn(), 
    create: jest.fn(),
    findAndCountAll: jest.fn()
  },
  Project: { findByPk: jest.fn() },
  Service: { findAll: jest.fn() }
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn()
}));

jest.mock('../config/redisClient', () => ({
  keys: jest.fn(),
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn()
}));

describe('userService.createAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if missing fields', async () => {
    await expect(userService.createAdmin({ email: '', password: '', name: '' }, {}))
      .rejects.toThrow('Please provide name, email, password');
  });

  it('should throw error if project not found', async () => {
    Project.findByPk.mockResolvedValue(null);
    await expect(userService.createAdmin({
      email: 'a@a.com', password: '12345678', name: 'A', project_id: 1
    }, {})).rejects.toThrow('Project not found');
  });

  it('should create admin successfully', async () => {
    User.findOne.mockResolvedValue(null);
    Project.findByPk.mockResolvedValue({ id: 1 });
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockResolvedValue({
      toJSON: () => ({
        id: 1, name: 'A', email: 'a@a.com', role: 'admin', project_id: 1
      })
    });
    redisClient.keys.mockResolvedValue([]);
    const result = await userService.createAdmin({
      email: 'a@a.com', password: '12345678', name: 'A', project_id: 1
    }, {});
    expect(result).toMatchObject({
      id: 1, name: 'A', email: 'a@a.com', role: 'admin', project_id: 1
    });
  });
});

describe('userService.createStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if admin has no project', async () => {
    await expect(userService.createStaff({
      email: 'b@b.com', password: '12345678', name: 'B'
    }, { project_id: null })).rejects.toThrow('Admin must have a project to create staff');
  });

  it('should throw error if some services not found', async () => {
    Service.findAll.mockResolvedValue([{ id: 1 }]);
    await expect(userService.createStaff({
      email: 'b@b.com', password: '12345678', name: 'B', service_ids: [1, 2]
    }, { project_id: 1 })).rejects.toThrow('Some services not found in your project');
  });

  it('should create staff successfully', async () => {
    User.findOne.mockResolvedValue(null);
    Service.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockResolvedValue({
      toJSON: () => ({
        id: 2, name: 'B', email: 'b@b.com', role: 'staff', project_id: 1
      })
    });
    redisClient.keys.mockResolvedValue([]);
    const result = await userService.createStaff({
      email: 'b@b.com', password: '12345678', name: 'B', service_ids: [1, 2]
    }, { project_id: 1 });
    expect(result).toMatchObject({
      id: 2, name: 'B', email: 'b@b.com', role: 'staff', project_id: 1
    });
  });
});

describe('userService.getAllUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached users if cache exists', async () => {
    const fakeCache = JSON.stringify({
      users: [{ id: 1, name: 'A' }],
      message: '1 user retrieved successfully',
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false }
    });
    redisClient.get.mockResolvedValue(fakeCache);

    const result = await userService.getAllUsers({ id: 1, role: 'superadmin' });
    expect(result.users[0].name).toBe('A');
    expect(redisClient.get).toHaveBeenCalled();
    expect(User.findAndCountAll).not.toHaveBeenCalled();
  });

  it('should query db and cache result if no cache', async () => {
    redisClient.get.mockResolvedValue(null);
    User.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { id: 1, name: 'A', toJSON: () => ({ id: 1, name: 'A' }) },
        { id: 2, name: 'B', toJSON: () => ({ id: 2, name: 'B' }) }
      ]
    });

    const result = await userService.getAllUsers({ id: 1, role: 'superadmin' }, { page: 1, limit: 10 });
    expect(result.users.length).toBe(2);
    expect(result.message).toMatch(/2 users/);
    expect(redisClient.set).toHaveBeenCalled();
    expect(User.findAndCountAll).toHaveBeenCalled();
  });

  it('should return "No users found" if count is 0', async () => {
    redisClient.get.mockResolvedValue(null);
    User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await userService.getAllUsers({ id: 1, role: 'superadmin' }, { page: 1, limit: 10 });
    expect(result.users.length).toBe(0);
    expect(result.message).toBe('No users found');
  });
});

describe('userService.deleteUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if trying to delete self', async () => {
    await expect(userService.deleteUser(1, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('You cannot delete your own account');
  });

  it('should throw error if user not found', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(userService.deleteUser(2, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('User not found');
  });

  it('should delete user successfully as superadmin', async () => {
    User.findOne.mockResolvedValue({
      id: 2,
      name: 'B',
      email: 'b@b.com',
      role: 'staff',
      project_id: 1
    });
    User.update = jest.fn().mockResolvedValue([1]);
    redisClient.del.mockResolvedValue(1);
    redisClient.keys.mockResolvedValue(['users:1:cache']);
    const result = await userService.deleteUser(2, { id: 1, role: 'superadmin', project_id: 1 });
    expect(result.message).toMatch(/has been deleted successfully/);
    expect(result.deletedUser).toMatchObject({
      id: 2,
      name: 'B',
      email: 'b@b.com',
      role: 'staff'
    });
    expect(User.update).toHaveBeenCalled();
    expect(redisClient.del).toHaveBeenCalled();
  });

  it('should only allow admin to delete staff in their project', async () => {
    User.findOne.mockResolvedValue({
      id: 3,
      name: 'C',
      email: 'c@c.com',
      role: 'staff',
      project_id: 2
    });
    User.update = jest.fn().mockResolvedValue([1]);
    redisClient.del.mockResolvedValue(1);
    redisClient.keys.mockResolvedValue(['users:2:cache']);
    const result = await userService.deleteUser(3, { id: 10, role: 'admin', project_id: 2 });
    expect(result.deletedUser.id).toBe(3);
    expect(User.update).toHaveBeenCalled();
    expect(redisClient.del).toHaveBeenCalled();
  });
});

describe('userService.updateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if user not found', async () => {
    User.findOne.mockResolvedValueOnce(null);
    await expect(userService.updateUser(2, { name: 'New Name' }, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('User not found');
  });

  it('should throw error if email is invalid', async () => {
    User.findOne.mockResolvedValueOnce({ id: 2, name: 'A', email: 'a@a.com', phone: '123', role: 'user', project_id: 1 });
    await expect(userService.updateUser(2, { email: 'invalid-email' }, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('Please provide a valid email');
  });

  it('should throw error if email already exists', async () => {
    User.findOne
      .mockResolvedValueOnce({ id: 2, name: 'A', email: 'a@a.com', phone: '123', role: 'user', project_id: 1 }) // userToUpdate
      .mockResolvedValueOnce({ id: 3, email: 'b@b.com' }); // existingUser
    await expect(userService.updateUser(2, { email: 'b@b.com' }, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('User already exists with this email');
  });

  it('should throw error if phone already exists', async () => {
    User.findOne
      .mockResolvedValueOnce({ id: 2, name: 'A', email: 'a@a.com', phone: '123', role: 'user', project_id: 1 }) // userToUpdate
      .mockResolvedValueOnce({ id: 4, phone: '999' }); // existingUserByPhone
    await expect(userService.updateUser(2, { phone: '999' }, { id: 1, role: 'superadmin' }))
      .rejects.toThrow('Phone number already exists');
  });

  it('should update user successfully as superadmin', async () => {
    User.findOne
      .mockResolvedValueOnce({ id: 2, name: 'A', email: 'a@a.com', phone: '123', role: 'user', project_id: 1 }) // lần 1: userToUpdate
      .mockResolvedValueOnce(null) // lần 2: existingUser (email)
      .mockResolvedValueOnce(null) // lần 3: existingUserByPhone
      .mockResolvedValueOnce({ id: 2, name: 'New Name', email: 'new@a.com', phone: '123', role: 'user', project_id: 1 }); // lần 4: user sau update
    User.update = jest.fn().mockResolvedValue([1]);
    redisClient.del.mockResolvedValue(1);
    redisClient.keys.mockResolvedValue(['users:1:cache']);
    const result = await userService.updateUser(2, { name: 'New Name', email: 'new@a.com' }, { id: 1, role: 'superadmin' });
    expect(result.user).toMatchObject({ id: 2, name: 'New Name', email: 'new@a.com' });
    expect(User.update).toHaveBeenCalled();
    expect(redisClient.del).toHaveBeenCalled();
  });

  it('should throw error if admin tries to update role', async () => {
    User.findOne.mockResolvedValueOnce({ id: 2, name: 'A', email: 'a@a.com', phone: '123', role: 'staff', project_id: 1 });
    await expect(userService.updateUser(2, { role: 'admin' }, { id: 10, role: 'admin', project_id: 1 }))
      .rejects.toThrow('Admin cannot update role or project');
  });
});