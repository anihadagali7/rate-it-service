const sendError = (response, status, msg) => {
  return response.status(status).json({
    errors: {
      msg,
    },
  });
};

const sendNotFound = (response, msg = "User not found") => {
  return sendError(response, 404, msg);
};

const sendConflict = (response, msg = "Resource already exists") => {
  return sendError(response, 409, msg);
};

const sendBadGateway = (
  response,
  msg = "External service unavailable"
) => {
  return sendError(response, 502, msg);
};

const sendBadRequest = (response, msg = "Bad request") => {
  return sendError(response, 400, msg);
};

module.exports = {
  sendError,
  sendNotFound,
  sendConflict,
  sendBadGateway,
  sendBadRequest,
};
