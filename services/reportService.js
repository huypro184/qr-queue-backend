const { User, Project, Service, Ticket, Line, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const redisClient = require('../config/redisClient');

const getReportSummary = async () => {
    try {
        const [adminCount, staffCount, projectCount, serviceCount, ticketCount] = await Promise.all([
            User.count({ where: { role: 'admin' } }),
            User.count({ where: { role: 'staff' } }),
            Project.count(),
            Service.count(),
            Ticket.count({ where: { created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } })
        ]);
        return {
            totalUsers: adminCount + staffCount,
            totalProjects: projectCount,
            totalServices: serviceCount,
            totalTicketsToday: ticketCount
        };
    } catch (error) {
        throw error;
    }
};

// const getCustomersByProjectAndDays = async (currentUser, days = 7) => {
//     try {
//         const userId = currentUser.id;
//         // const project = await Project.findOne({ 
//         //     where: { admin_id: userId },
//         //     attributes: ['id']
//         // });
        
//         let project;

//         if (currentUser.role === 'admin') {
//             project = await Project.findOne({ 
//                 where: { admin_id: userId },
//                 attributes: ['id']
//             });
//         } else {
//             project = await Project.findOne({ 
//                 where: { id: currentUser.project_id },
//                 attributes: ['id']
//             });
//         }

//         if (!project) {
//             return [];
//         }

//         const services = await Service.findAll({
//             where: { project_id: project.id },
//             attributes: ['id']
//         });

//         const serviceIds = services.map(s => s.id);

//         if (serviceIds.length === 0) {
//             return [];
//         }

//         const lines = await Line.findAll({
//             where: { service_id: { [Op.in]: serviceIds } },
//             attributes: ['id']
//         });

//         const lineIds = lines.map(l => l.id);

//         if (lineIds.length === 0) {
//             return [];
//         }

//         const results = [];
//         const today = new Date();
//         today.setHours(23, 59, 59, 999);

//         for (let i = days - 1; i >= 0; i--) {
//             const date = new Date(today);
//             date.setDate(date.getDate() - i);
//             date.setHours(0, 0, 0, 0);
            
//             const nextDate = new Date(date);
//             nextDate.setDate(nextDate.getDate() + 1);

//             const count = await Ticket.count({
//                 where: {
//                     line_id: { [Op.in]: lineIds },
//                     created_at: {
//                         [Op.gte]: date,
//                         [Op.lt]: nextDate
//                     }
//                 }
//             });

//             results.push({
//                 _id: date.toISOString().split('T')[0],
//                 totalCustomers: count
//             });
//         }

//         return results;
//     } catch (error) {
//         throw error;
//     }
// };

// ✅ SỬA HÀM getCustomersByProjectAndDays
const getCustomersByProjectAndDays = async (currentUser, days = 7) => {
    try {
        let projectIds = [];

        // ✅ XỬ LÝ SUPERADMIN - Xem tất cả projects
        if (currentUser.role === 'superadmin') {
            const allProjects = await Project.findAll({ attributes: ['id'] });
            projectIds = allProjects.map(p => p.id);
        } 
        // XỬ LÝ ADMIN
        else if (currentUser.role === 'admin') {
            const project = await Project.findOne({ 
                where: { admin_id: currentUser.id },
                attributes: ['id']
            });
            if (!project) return [];
            projectIds = [project.id];
        } 
        // XỬ LÝ STAFF
        else {
            const project = await Project.findOne({ 
                where: { id: currentUser.project_id },
                attributes: ['id']
            });
            if (!project) return [];
            projectIds = [project.id];
        }

        if (projectIds.length === 0) return [];

        // Lấy tất cả service thuộc các projects
        const services = await Service.findAll({
            where: { project_id: { [Op.in]: projectIds } },
            attributes: ['id']
        });
        const serviceIds = services.map(s => s.id);
        if (serviceIds.length === 0) return [];

        // Lấy tất cả line thuộc các service
        const lines = await Line.findAll({
            where: { service_id: { [Op.in]: serviceIds } },
            attributes: ['id']
        });
        const lineIds = lines.map(l => l.id);
        if (lineIds.length === 0) return [];

        // Tạo mảng kết quả cho các ngày
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


const getMockProjectsCustomerStatsFixed = async () => {
    return [
        {
            projectId: 1,
            projectName: "Vincom Center",
            dailyStats: [
                { _id: "2025-10-25", totalCustomers: 34 },
                { _id: "2025-10-26", totalCustomers: 51 },
                { _id: "2025-10-27", totalCustomers: 28 },
                { _id: "2025-10-28", totalCustomers: 45 },
                { _id: "2025-10-29", totalCustomers: 38 },
                { _id: "2025-10-30", totalCustomers: 42 },
                { _id: "2025-10-31", totalCustomers: 39 }
            ]
        },
        {
            projectId: 2,
            projectName: "Aeon Mall",
            dailyStats: [
                { _id: "2025-10-25", totalCustomers: 62 },
                { _id: "2025-10-26", totalCustomers: 75 },
                { _id: "2025-10-27", totalCustomers: 82 },
                { _id: "2025-10-28", totalCustomers: 68 },
                { _id: "2025-10-29", totalCustomers: 71 },
                { _id: "2025-10-30", totalCustomers: 79 },
                { _id: "2025-10-31", totalCustomers: 85 }
            ]
        }
    ];
};

// const getStatusDistribution = async (currentUser, days = 7) => {
//     try {
//         // Xác định project của user
//         let project;
//         if (currentUser.role === 'admin') {
//             project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
//         } else {
//             project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
//         }
//         if (!project) return [];

//         // Lấy tất cả service thuộc project
//         const services = await Service.findAll({ where: { project_id: project.id }, attributes: ['id'] });
//         const serviceIds = services.map(s => s.id);
//         if (serviceIds.length === 0) return [];

//         // Lấy tất cả line thuộc các service
//         const lines = await Line.findAll({ where: { service_id: { [Op.in]: serviceIds } }, attributes: ['id'] });
//         const lineIds = lines.map(l => l.id);
//         if (lineIds.length === 0) return [];

//         // Đếm số lượng vé theo từng trạng thái, chỉ lấy vé thuộc các line này
//         const today = new Date();
//         today.setHours(23, 59, 59, 999);
//         const startDate = new Date(today);
//         startDate.setDate(startDate.getDate() - (days - 1));
//         startDate.setHours(0, 0, 0, 0);

//         const statusList = ['done', 'cancelled', 'waiting', 'serving'];
//         const results = [];

//         for (const status of statusList) {
//             const count = await Ticket.count({
//                 where: {
//                     status,
//                     line_id: { [Op.in]: lineIds },
//                     created_at: {
//                         [Op.gte]: startDate,
//                         [Op.lte]: today
//                     }
//                 }
//             });
//             results.push({ name: status, value: count });
//         }

//         return results;
//     } catch (error) {
//         throw error;
//     }
// };

const getStatusDistribution = async (currentUser, days = 7) => {
    try {
        let projectIds = [];

        // ✅ XỬ LÝ SUPERADMIN
        if (currentUser.role === 'superadmin') {
            const allProjects = await Project.findAll({ attributes: ['id'] });
            projectIds = allProjects.map(p => p.id);
        } 
        // XỬ LÝ ADMIN
        else if (currentUser.role === 'admin') {
            const project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
            if (!project) return [];
            projectIds = [project.id];
        } 
        // XỬ LÝ STAFF
        else {
            const project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
            if (!project) return [];
            projectIds = [project.id];
        }

        if (projectIds.length === 0) return [];

        // Lấy tất cả service thuộc các projects
        const services = await Service.findAll({ 
            where: { project_id: { [Op.in]: projectIds } }, 
            attributes: ['id'] 
        });
        const serviceIds = services.map(s => s.id);
        if (serviceIds.length === 0) return [];

        // Lấy tất cả line thuộc các service
        const lines = await Line.findAll({ 
            where: { service_id: { [Op.in]: serviceIds } }, 
            attributes: ['id'] 
        });
        const lineIds = lines.map(l => l.id);
        if (lineIds.length === 0) return [];

        // Thời gian lọc
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const statusList = ['done', 'cancelled', 'waiting', 'serving'];
        const results = [];

        for (const status of statusList) {
            const count = await Ticket.count({
                where: {
                    status,
                    line_id: { [Op.in]: lineIds },
                    created_at: {
                        [Op.gte]: startDate,
                        [Op.lte]: today
                    }
                }
            });
            results.push({ name: status, value: count });
        }

        return results;
    } catch (error) {
        throw error;
    }
};

// const getTopServices = async (currentUser, days = 7) => {
//     // Lấy project của user
//     let project;
//     if (currentUser.role === 'admin') {
//         project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
//     } else {
//         project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
//     }
//     if (!project) return [];

//     // Lấy tất cả service thuộc project
//     const services = await Service.findAll({ where: { project_id: project.id }, attributes: ['id', 'name'] });
//     const serviceIds = services.map(s => s.id);
//     if (serviceIds.length === 0) return [];

//     // Lấy tất cả line thuộc các service
//     const lines = await Line.findAll({ where: { service_id: { [Op.in]: serviceIds } }, attributes: ['id', 'service_id'] });
//     const lineIds = lines.map(l => l.id);
//     if (lineIds.length === 0) return [];

//     // Thời gian lọc
//     const today = new Date();
//     today.setHours(23, 59, 59, 999);
//     const startDate = new Date(today);
//     startDate.setDate(startDate.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     // Đếm số lượng vé group theo service_id
//     const tickets = await Ticket.findAll({
//         where: {
//             line_id: { [Op.in]: lineIds },
//             created_at: {
//                 [Op.gte]: startDate,
//                 [Op.lte]: today
//             }
//         },
//         attributes: [
//             [sequelize.col('line.service_id'), 'service_id'],
//             [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
//         ],
//         include: [
//             {
//                 model: Line,
//                 as: 'line',
//                 attributes: []
//             }
//         ],
//         group: ['line.service_id'],
//         raw: true
//     });

//     // Tổng số vé
//     const totalTickets = tickets.reduce((sum, t) => sum + parseInt(t.count), 0);

//     // Map ra kết quả có tên dịch vụ, số lượng và phần trăm
//     const result = tickets
//         .map(t => {
//             const service = services.find(s => s.id === t.service_id);
//             return {
//                 name: service ? service.name : `Service #${t.service_id}`,
//                 count: parseInt(t.count),
//                 percent: totalTickets > 0 ? Math.round((parseInt(t.count) / totalTickets) * 100) : 0
//             };
//         })
//         .sort((a, b) => b.count - a.count);

//     return result;
// };

const getTopServices = async (currentUser, days = 7) => {
    let projectIds = [];

    // ✅ XỬ LÝ SUPERADMIN
    if (currentUser.role === 'superadmin') {
        const allProjects = await Project.findAll({ attributes: ['id'] });
        projectIds = allProjects.map(p => p.id);
    } 
    else if (currentUser.role === 'admin') {
        const project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
        if (!project) return [];
        projectIds = [project.id];
    } 
    else {
        const project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
        if (!project) return [];
        projectIds = [project.id];
    }

    if (projectIds.length === 0) return [];

    // Lấy tất cả service thuộc các projects
    const services = await Service.findAll({ 
        where: { project_id: { [Op.in]: projectIds } }, 
        attributes: ['id', 'name'] 
    });
    const serviceIds = services.map(s => s.id);
    if (serviceIds.length === 0) return [];

    // Lấy tất cả line thuộc các service
    const lines = await Line.findAll({ 
        where: { service_id: { [Op.in]: serviceIds } }, 
        attributes: ['id', 'service_id'] 
    });
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return [];

    // Thời gian lọc
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Đếm số lượng vé group theo service_id
    const tickets = await Ticket.findAll({
        where: {
            line_id: { [Op.in]: lineIds },
            created_at: {
                [Op.gte]: startDate,
                [Op.lte]: today
            }
        },
        attributes: [
            [sequelize.col('line.service_id'), 'service_id'],
            [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
        ],
        include: [
            {
                model: Line,
                as: 'line',
                attributes: []
            }
        ],
        group: ['line.service_id'],
        raw: true
    });

    const totalTickets = tickets.reduce((sum, t) => sum + parseInt(t.count), 0);

    const result = tickets
        .map(t => {
            const service = services.find(s => s.id === t.service_id);
            return {
                name: service ? service.name : `Service #${t.service_id}`,
                count: parseInt(t.count),
                percent: totalTickets > 0 ? Math.round((parseInt(t.count) / totalTickets) * 100) : 0
            };
        })
        .sort((a, b) => b.count - a.count);

    return result;
};

// const getTicketCountByHour = async (currentUser, days = 7) => {
//     // Lấy project của user
//     let project;
//     if (currentUser.role === 'admin') {
//         project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
//     } else {
//         project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
//     }
//     if (!project) return [];

//     // Lấy tất cả service thuộc project
//     const services = await Service.findAll({ where: { project_id: project.id }, attributes: ['id'] });
//     const serviceIds = services.map(s => s.id);
//     if (serviceIds.length === 0) return [];

//     // Lấy tất cả line thuộc các service
//     const lines = await Line.findAll({ where: { service_id: { [Op.in]: serviceIds } }, attributes: ['id'] });
//     const lineIds = lines.map(l => l.id);
//     if (lineIds.length === 0) return [];

//     // Thời gian lọc
//     const today = new Date();
//     today.setHours(23, 59, 59, 999);
//     const startDate = new Date(today);
//     startDate.setDate(startDate.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     // Query group by hour
//     const [rows] = await sequelize.query(`
//         SELECT 
//             TO_CHAR(created_at, 'HH24:00') AS hour,
//             COUNT(*) AS count
//         FROM tickets
//         WHERE line_id IN (:lineIds)
//           AND created_at >= :startDate
//           AND created_at <= :endDate
//         GROUP BY hour
//         ORDER BY hour
//     `, {
//         replacements: {
//             lineIds,
//             startDate: startDate.toISOString(),
//             endDate: today.toISOString()
//         }
//     });

//     // Format kết quả
//     return rows.map(row => ({
//         hour: row.hour,
//         count: parseInt(row.count)
//     }));
// };

const getTicketCountByHour = async (currentUser, days = 7) => {
    let projectIds = [];

    if (currentUser.role === 'superadmin') {
        const allProjects = await Project.findAll({ attributes: ['id'] });
        projectIds = allProjects.map(p => p.id);
    } 
    // Logic cũ cho Admin
    else if (currentUser.role === 'admin') {
        const project = await Project.findOne({ where: { admin_id: currentUser.id }, attributes: ['id'] });
        if (!project) return [];
        projectIds = [project.id];
    } 
    // Logic cũ cho Staff
    else {
        const project = await Project.findOne({ where: { id: currentUser.project_id }, attributes: ['id'] });
        if (!project) return [];
        projectIds = [project.id];
    }

    if (projectIds.length === 0) return [];

    // ... (Phần còn lại giữ nguyên: Tìm services, lines, query tickets) ...
    
    // Lấy tất cả service thuộc các projects tìm được
    const services = await Service.findAll({ 
        where: { project_id: { [Op.in]: projectIds } }, 
        attributes: ['id'] 
    });
    const serviceIds = services.map(s => s.id);
    if (serviceIds.length === 0) return [];

    // Lấy tất cả line thuộc các service
    const lines = await Line.findAll({ 
        where: { service_id: { [Op.in]: serviceIds } }, 
        attributes: ['id'] 
    });
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return [];

    // Query dữ liệu
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const [rows] = await sequelize.query(`
        SELECT 
            TO_CHAR(created_at, 'HH24:00') AS hour,
            COUNT(*) AS count
        FROM tickets
        WHERE line_id IN (:lineIds)
          AND created_at >= :startDate
          AND created_at <= :endDate
        GROUP BY hour
        ORDER BY hour
    `, {
        replacements: {
            lineIds,
            startDate: startDate.toISOString(),
            endDate: today.toISOString()
        }
    });

    return rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count)
    }));
};

module.exports = {
    getReportSummary,
    getCustomersByProjectAndDays,
    getAllProjectsCustomerStats,
    getMockProjectsCustomerStatsFixed,
    getStatusDistribution,
    getTopServices,
    getTicketCountByHour
};