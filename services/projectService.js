const db = require('../models');
const { User, Project, Service } = db;
const AppError = require('../utils/AppError');

const createProject = async (data, currentUser) => {
    try {
        const { name, description } = data;

        if (!name) {
            throw new AppError('Please provide project name', 400);
        }

        const existingProject = await Project.findOne({ 
            where: { name: name.trim() } 
        });
        
        if (existingProject) {
            throw new AppError('Project name already exists', 409);
        }

        const newProject = await Project.create({
            name: name.trim(),
            description: description ? description.trim() : null
        });

        if (currentUser.role === 'admin') {
            await User.update(
                { project_id: newProject.id },
                { where: { id: currentUser.id } }
            );
        }

        return {
            id: newProject.id,
            name: newProject.name,
            description: newProject.description,
            created_at: newProject.created_at
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createProject
};