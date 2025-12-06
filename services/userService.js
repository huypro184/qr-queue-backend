const { User, Project, Service } = require('../models');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const { Op, where } = require('sequelize');
const redisClient = require('../config/redisClient');
const { Sequelize } = require('sequelize');

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

const createAdmin = async (data, currentUser) => {
    try {
        const { email, password, name, phone } = data;

        await validateAndCheckUser(name, email, password, phone);

        return await createUserRecord({
            name, email, password, phone,
            role: 'admin'
        });
    } catch (error) {
        throw error;
    }
};

const createStaff = async (data, currentUser) => {
    try {
        const project = await Project.findOne({
            where: { admin_id: currentUser.id },
        });

        const projectId = project.id;

        if (!project) {
            throw new AppError('You do not have a project to assign staff', 400);
        }

        const { email, password, name, phone } = data;

        await validateAndCheckUser(name, email, password, phone);

        // if (service_ids && service_ids.length > 0) {
        //     const services = await Service.findAll({
        //         where: {
        //             id: service_ids,
        //             project_id: currentUser.project_id
        //         }
        //     });
            
        //     if (services.length !== service_ids.length) {
        //         throw new AppError('Some services not found in your project', 404);
        //     }
        // }

        return await createUserRecord({
            name, email, password, phone,
            role: 'staff',
            project_id: projectId
        });
    } catch (error) {
        throw error;
    }
};


const getAllUsers = async (currentUser, filters = {}) => {
    try {
        if (currentUser.role !== 'superadmin') {
            throw new Error('Permission denied: Only superadmin can view all users.');
        }

        const { role, search, page = 1, limit = 8 } = filters;
        
        let whereClause = {
            status: 'active',
            id: { [Op.not]: currentUser.id }
        };

        if (role) {
            whereClause.role = role;
        }

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
                    required: false,
                    on: {
                        [Op.or]: [
                            { id: { [Op.eq]: Sequelize.col('User.project_id') } },

                            { admin_id: { [Op.eq]: Sequelize.col('User.id') } }
                        ]
                    }
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

        const result = {
            users: users.map(u => {
                const user = u.toJSON();
                user.project = user.project ? user.project.name : null;
                return user;
            }),
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

        return result;
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
            // if (project_id !== undefined) {
            // if (project_id) {
            //     const project = await Project.findByPk(project_id);
            //     if (!project) {
            //     throw new AppError('Project not found', 404);
            //     }
            //     dataToUpdate.project_id = project.id;
            // } else {
            //     dataToUpdate.project_id = null;
            // }
            // }
        } else if (currentUser.role === 'admin') {
            if (role || project_id !== undefined) {
            throw new AppError('Admin cannot update role or project', 403);
            }
        }


        await User.update(dataToUpdate, {
            where: { id: userId }
        });

        await redisClient.del(`user:me:${userId}`);
        const projectId = userToUpdate ? userToUpdate.project_id : currentUser.project_id;
        const keys = await redisClient.keys(`users:${projectId}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

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

        const userObj = updatedUser ? updatedUser.toJSON() : null;
        if (userObj) {
            userObj.project = userObj.project ? userObj.project.name : null;
        }

        return {
            user: userObj
        };

    } catch (error) {
        throw error;
    }
};

const getMe = async (currentUser) => {
  try {
    const user = await User.findByPk(currentUser.id, {
      attributes: ['id', 'name', 'email', 'role'],
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const project = await Project.findOne({
      where: { admin_id: user.id },
      attributes: ['id', 'name', 'description', 'qr_code', 'slug'],
    });

    return {
      user,
      project: project || null
    };

  } catch (error) {
    throw error;
  }
};

const getAllStaff = async (currentUser, filters = {}) => {
    try {
        const { search, page = 1, limit = 10 } = filters;

        // Lấy project của admin
        const project = await Project.findOne({
            where: { admin_id: currentUser.id }
        });

        if (!project) {
            throw new AppError('You do not have a project assigned', 404);
        }

        // Build where clause
        let whereClause = {
            project_id: project.id,
            role: 'staff',
            status: 'active'
        };

        // Thêm search nếu có
        if (search && search.trim()) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search.trim()}%` } },
                { email: { [Op.iLike]: `%${search.trim()}%` } },
                { phone: { [Op.iLike]: `%${search.trim()}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        // Lấy tất cả staff trong project với pagination
        const { count, rows: staff } = await User.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { 
                exclude: ['password_hash', 'password_reset_token', 'password_reset_expires', 'password_changed_at'] 
            }
        });

        return {
            staff,
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

const updateStaff = async (staffId, updateData, currentUser) => {
    try {
        const { name, email, phone } = updateData;

        // Kiểm tra admin có project không
        const project = await Project.findOne({
            where: { admin_id: currentUser.id }
        });

        if (!project) {
            throw new AppError('You do not have a project assigned', 404);
        }

        // Tìm staff trong project của admin
        const staffToUpdate = await User.findOne({
            where: {
                id: staffId,
                project_id: project.id,
                role: 'staff',
                status: 'active'
            }
        });

        if (!staffToUpdate) {
            throw new AppError('Staff not found in your project', 404);
        }

        // Validate name
        if (name !== undefined) {
            if (!name || !name.trim()) {
                throw new AppError('Please provide a valid name', 400);
            }
        }

        // Validate và check email trùng
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new AppError('Please provide a valid email', 400);
            }

            const existingUser = await User.findOne({ 
                where: { 
                    email: email.toLowerCase().trim(),
                    id: { [Op.not]: staffId }
                }
            });
            
            if (existingUser) {
                throw new AppError('Email already exists', 409);
            }
        }

        // Validate và check phone trùng
        if (phone !== undefined && phone !== staffToUpdate.phone) {
            if (phone && phone.trim()) {
                const existingUserByPhone = await User.findOne({ 
                    where: { 
                        phone: phone.trim(),
                        id: { [Op.not]: staffId }
                    }
                });
                
                if (existingUserByPhone) {
                    throw new AppError('Phone number already exists', 409);
                }
            }
        }

        // Build data to update
        const dataToUpdate = {};
        
        if (name !== undefined) dataToUpdate.name = name.trim();
        if (email !== undefined) dataToUpdate.email = email.toLowerCase().trim();
        if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;

        // Nếu không có gì để update
        if (Object.keys(dataToUpdate).length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        // Update staff
        await User.update(dataToUpdate, {
            where: { id: staffId }
        });

        // Clear cache
        await redisClient.del(`user:me:${staffId}`);
        const keys = await redisClient.keys(`users:${project.id}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        // Lấy thông tin staff đã update
        const updatedStaff = await User.findOne({
            where: { id: staffId },
            attributes: { 
                exclude: ['password_hash', 'password_reset_token', 'password_reset_expires', 'password_changed_at'] 
            }
        });

        return {
            staff: updatedStaff
        };

    } catch (error) {
        throw error;
    }
};

const deleteStaff = async (staffId, currentUser) => {
    try {
        // Kiểm tra admin có project không
        const project = await Project.findOne({
            where: { admin_id: currentUser.id }
        });

        if (!project) {
            throw new AppError('You do not have a project assigned', 404);
        }

        // Không cho phép admin xóa chính mình
        if (parseInt(staffId) === currentUser.id) {
            throw new AppError('You cannot delete your own account', 400);
        }

        // Tìm staff trong project của admin
        const staffToDelete = await User.findOne({
            where: {
                id: staffId,
                project_id: project.id,
                role: 'staff',
                status: 'active'
            },
            attributes: ['id', 'name', 'email', 'role', 'project_id']
        });

        if (!staffToDelete) {
            throw new AppError('Staff not found in your project', 404);
        }

        // Soft delete - đổi status thành inactive
        await User.update(
            { status: 'inactive' },
            { where: { id: staffId } }
        );

        // Clear cache
        await redisClient.del(`user:me:${staffId}`);
        const keys = await redisClient.keys(`users:${project.id}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        return {
            deletedStaff: {
                id: staffToDelete.id,
                name: staffToDelete.name,
                email: staffToDelete.email,
                role: staffToDelete.role
            }
        };

    } catch (error) {
        throw error;
    }
};

module.exports = {
    createAdmin,
    createStaff,
    getAllUsers,
    updateStaff,
    getAllStaff,
    getMe,
    deleteUser,
    updateUser,
    deleteStaff
};