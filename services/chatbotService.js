const sendMessage = async (messages, response) => {
  return response.status(200).json({
    status: "success",
    data: { reply: "hi" },
  });
};

module.exports = {
  sendMessage,
};
