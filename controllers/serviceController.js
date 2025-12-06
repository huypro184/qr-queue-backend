const { createService, getServices, updateService, deleteService } = require('../services/serviceService');
const { asyncHandler } = require('../utils/asyncHandler');

const createNewService = asyncHandler(async (req, res, next) => {
    const service = await createService(req.body, req.user);
    res.status(201).json({
        status: 'success',
        message: 'Service created successfully',
        data: service
    });
});

const getAllServices = asyncHandler(async (req, res, next) => {
    const result = await getServices(req.user, req.query);
    res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.services,
        pagination: result.pagination
    });
});

const updateServiceById = asyncHandler(async (req, res, next) => {
    const { serviceId } = req.params;
    const result = await updateService(serviceId, req.body, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Service updated successfully',
        data: result
    });
});

const deleteServiceById = asyncHandler(async (req, res, next) => {
    const { serviceId } = req.params;
    const result = await deleteService(serviceId, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Service deleted successfully',
        data: result
    });
});


module.exports = {
    createNewService,
    getAllServices,
    updateServiceById,
    deleteServiceById
};