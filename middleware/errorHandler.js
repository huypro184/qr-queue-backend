const errorHandler = (error, req, res, next) => {
  console.log('Error Handler triggered:', error.message);
  
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message
    });
  }
  
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: error.message
  });
};

module.exports = errorHandler;