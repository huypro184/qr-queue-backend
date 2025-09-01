const User = require('../models/User');
const Project = require('../models/Project');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const Service = require('../models/Service');

const validateAndCheckUser = async (name, email, password, phone) => {
    if (!name || !email || !password) {
        throw new AppError('Please provide name, email, password', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new AppError('Please provide a valid email', 400);
    }

    if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new AppError('User already exists with this email', 409);
    }

    if (phone) {
        const existingUserByPhone = await User.findOne({ where: { phone } });
        if (existingUserByPhone) {
            throw new AppError('Phone number already exists', 409);
        }
    }
};

const createUserRecord = async (userData) => {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const newUser = await User.create({
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password_hash: hashedPassword,
        phone: userData.phone ? userData.phone.trim() : null,
        role: userData.role,
        project_id: userData.project_id,
        status: 'active'
    });

    const { password_hash, passwordResetToken, passwordResetExpires, passwordChangedAt, ...userResponse } = newUser.toJSON();
    return userResponse;
};

const createAdmin = async (data) => {
    try {
        const { email, password, name, phone, project_id } = data;

        await validateAndCheckUser(name, email, password, phone);

        let validProjectId = null;
        if (project_id) {
            const project = await Project.findByPk(project_id);
            if (!project) {
                throw new AppError('Project not found', 404);
            }
            validProjectId = project.id;
        }

        return await createUserRecord({
            name, email, password, phone,
            role: 'admin',
            project_id: validProjectId
        });
    } catch (error) {
        throw error;
    }
};

const createStaff = async (data, currentUser) => {
    try {
        if (!currentUser.project_id) {
            throw new AppError('Admin must have a project to create staff', 400);
        }

        const { email, password, name, phone, service_ids } = data;

        await validateAndCheckUser(name, email, password, phone);

        if (service_ids && service_ids.length > 0) {
            const services = await Service.findAll({
                where: {
                    id: service_ids,
                    project_id: currentUser.project_id
                }
            });
            
            if (services.length !== service_ids.length) {
                throw new AppError('Some services not found in your project', 404);
            }
        }

        return await createUserRecord({
            name, email, password, phone,
            role: 'staff',
            project_id: currentUser.project_id
        });
    } catch (error) {
        throw error;
    }
};

const getAllUsers = async () => {
    try {
        const users = await User.findAll();
        const safeUsers = users.map(u => {
            const { passwordResetToken, passwordResetExpires, passwordChangedAt, password_hash, ...rest } = u.toJSON();
            return rest;
        });
        return safeUsers;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createAdmin,
    createStaff,
    getAllUsers
};