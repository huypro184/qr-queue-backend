const { User, Project, Service, Ticket, Line, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const redisClient = require('../config/redisClient');

async function countAdmins() {
    return await User.count({ where: { role: 'admin' } });
}

async function countStaff() {
    return await User.count({ where: { role: 'staff' } });
}


async function countProjects() {
    return await Project.count();
}

async function countServices() {
    return await Service.count();
}

const getReportSummary = async () => {
    try {
        const [adminCount, staffCount, projectCount, serviceCount] = await Promise.all([
            countAdmins(),
            countStaff(),
            countProjects(),
            countServices()
        ]);

        return {
            totalUsers: adminCount + staffCount,
            totalProjects: projectCount,
            totalServices: serviceCount
        };
    } catch (error) {
        throw error;
    }
};

const getCustomersByProjectAndDays = async (currentUser, days = 7) => {
    try {
        const userId = currentUser.id;
        // const project = await Project.findOne({ 
        //     where: { admin_id: userId },
        //     attributes: ['id']
        // });
        
        let project;

        if (currentUser.role === 'admin') {
            project = await Project.findOne({ 
                where: { admin_id: userId },
                attributes: ['id']
            });
        } else {
            project = await Project.findOne({ 
                where: { id: currentUser.project_id },
                attributes: ['id']
            });
        }

        if (!project) {
            return [];
        }

        const services = await Service.findAll({
            where: { project_id: project.id },
            attributes: ['id']
        });

        const serviceIds = services.map(s => s.id);

        if (serviceIds.length === 0) {
            return [];
        }

        const lines = await Line.findAll({
            where: { service_id: { [Op.in]: serviceIds } },
            attributes: ['id']
        });

        const lineIds = lines.map(l => l.id);

        if (lineIds.length === 0) {
            return [];
        }

        const results = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await Ticket.count({
                where: {
                    line_id: { [Op.in]: lineIds },
                    created_at: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate
                    }
                }
            });

            results.push({
                _id: date.toISOString().split('T')[0],
                totalCustomers: count
            });
        }

        return results;
    } catch (error) {
        throw error;
    }
};

const getAllProjectsCustomerStats = async (days = 7, includeEmpty = false) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const [rows] = await sequelize.query(`
            SELECT 
                p.id as project_id,
                p.name as project_name,
                DATE(t.created_at) as date,
                COUNT(t.id) as total_customers
            FROM projects p
            LEFT JOIN services s ON s.project_id = p.id
            LEFT JOIN lines l ON l.service_id = s.id
            LEFT JOIN tickets t ON t.line_id = l.id 
                AND t.created_at >= :startDate 
                AND t.created_at <= :endDate
            GROUP BY p.id, p.name, DATE(t.created_at)
            ORDER BY p.id, DATE(t.created_at)
        `, {
            replacements: {
                startDate: startDate.toISOString(),
                endDate: today.toISOString()
            }
        });

        const projectsMap = {};
        rows.forEach(row => {
            if (!projectsMap[row.project_id]) {
                projectsMap[row.project_id] = {
                    projectId: row.project_id,
                    projectName: row.project_name,
                    dailyStats: [],
                    hasData: false
                };
            }

            if (row.date && row.total_customers > 0) {
                projectsMap[row.project_id].hasData = true;
            }
        });

        const results = Object.values(projectsMap)
            .filter(project => includeEmpty || project.hasData)
            .map(project => {
                const statsMap = {};
                
                rows.forEach(row => {
                    if (row.project_id === project.projectId && row.date) {
                        statsMap[row.date] = parseInt(row.total_customers);
                    }
                });

                const fullDailyStats = [];
                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    fullDailyStats.push({
                        _id: dateStr,
                        totalCustomers: statsMap[dateStr] || 0
                    });
                }

                return {
                    projectId: project.projectId,
                    projectName: project.projectName,
                    dailyStats: fullDailyStats
                };
            });

        return results;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getReportSummary,
    getCustomersByProjectAndDays,
    getAllProjectsCustomerStats
};