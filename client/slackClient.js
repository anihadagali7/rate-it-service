const axios = require("axios");

const slackToken = process.env.SLACK_DEV_TOKEN;

const postMessage = async (channel, text, url) => {
  const result = await axios.post(
    url,
    {
      channel: channel,
      text: text,
    },
    { headers: { authorization: `Bearer ${slackToken}` } }
  );
};

module.exports = { postMessage };
