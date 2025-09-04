const { User, Project, Service } = require('../models');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

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

    const { password_hash, password_reset_token, password_reset_expires, password_changed_at, ...userResponse } = newUser.toJSON();
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

const getAllUsers = async (currentUser, filters = {}) => {
    try {
        const { role, search, page = 1, limit = 10 } = filters;
        
        let whereClause = {
            status: 'active'
        };

        if (currentUser.role === 'superadmin') {
            if (role) {
                whereClause.role = role;
            }
        } else if (currentUser.role === 'admin') {
            whereClause.project_id = currentUser.project_id;
            whereClause.role = 'staff';
        }

        whereClause.id = { [Op.not]: currentUser.id };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows: users } = await User.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Project,
                    as: 'project',
                    attributes: ['name'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires', 'password_changed_at'] }
        });

        const message = count === 0 
            ? 'No users found' 
            : `${count} user${count > 1 ? 's' : ''} retrieved successfully`;

        return {
            users,
            message,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
                hasNext: page < Math.ceil(count / limit),
                hasPrev: page > 1
            }
        };
    } catch (error) {
        throw error;
    }
};

const deleteUser = async (userId, currentUser) => {
    try {
        if (parseInt(userId) === currentUser.id) {
            throw new AppError('You cannot delete your own account', 400);
        }

        let whereClause = { id: userId };

        if (currentUser.role === 'admin') {
            whereClause.project_id = currentUser.project_id;
            whereClause.role = 'staff';
        }

        const userToDelete = await User.findOne({
            where: whereClause,
            attributes: ['id', 'name', 'email', 'role', 'project_id', 'status']
        });

        if (!userToDelete) {
            throw new AppError('User not found', 404);
        }

        await User.update(
            { status: 'inactive' },
            { where: { id: userId } }
        );

        return {
            message: `User ${userToDelete.name} has been deleted successfully`,
            deletedUser: {
                id: userToDelete.id,
                name: userToDelete.name,
                email: userToDelete.email,
                role: userToDelete.role
            }
        };

    } catch (error) {
        throw error;
    }
};

const updateUser = async (userId, updateData, currentUser) => {
    try {
        const { name, email, phone, role, project_id } = updateData;

        let whereClause = {
            id: userId,
            status: 'active'
        };

        if (currentUser.role === 'admin') {
            whereClause.project_id = currentUser.project_id;
            whereClause.role = 'staff';
        }

        const userToUpdate = await User.findOne({ where: whereClause });
        if (!userToUpdate) {
            throw new AppError('User not found', 404);
        }

        if (name && !name.trim()) {
            throw new AppError('Please provide name', 400);
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new AppError('Please provide a valid email', 400);
            }

            const existingUser = await User.findOne({ 
                where: { 
                    email: email.toLowerCase().trim(),
                    id: { [Op.not]: userId }
                }
            });
            if (existingUser) {
                throw new AppError('User already exists with this email', 409);
            }
        }

        if (phone && phone !== userToUpdate.phone) {
            const existingUserByPhone = await User.findOne({ 
                where: { 
                    phone: phone.trim(),
                    id: { [Op.not]: userId }
                }
            });
            if (existingUserByPhone) {
                throw new AppError('Phone number already exists', 409);
            }
        }

        const dataToUpdate = {};
        
        if (name) dataToUpdate.name = name.trim();
        if (email) dataToUpdate.email = email.toLowerCase().trim();
        if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;

        if (currentUser.role === 'superadmin') {
            if (userToUpdate.role === 'superadmin' && role !== 'superadmin') {
            throw new AppError('Cannot downgrade the only superadmin in the system', 400);
            }
            dataToUpdate.role = role;
            if (project_id !== undefined) {
            if (project_id) {
                const project = await Project.findByPk(project_id);
                if (!project) {
                throw new AppError('Project not found', 404);
                }
                dataToUpdate.project_id = project.id;
            } else {
                dataToUpdate.project_id = null;
            }
            }
        } else if (currentUser.role === 'admin') {
            if (role || project_id !== undefined) {
            throw new AppError('Admin cannot update role or project', 403);
            }
        }


        await User.update(dataToUpdate, {
            where: { id: userId }
        });

        const updatedUser = await User.findOne({
            where: { id: userId },
            include: [
                {
                    model: Project,
                    as: 'project',
                    attributes: ['name'],
                    required: false
                }
            ],
            attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires', 'password_changed_at'] }
        });

        return {
            user: updatedUser
        };

    } catch (error) {
        throw error;
    }
};

module.exports = {
    createAdmin,
    createStaff,
    getAllUsers,
    deleteUser,
    updateUser
};