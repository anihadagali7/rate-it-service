const axios = require("axios");

const api_key = process.env.GOOGLE_API_KEY;

const searchForBooks = async (keyword, page = 1) => {
  try {
    const limit = 20;
    const index = limit * (page - 1);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${keyword}&key=${api_key}&startIndex=${index}&maxResults=${limit}`;

    const response = await axios.get(encodeURI(url));
    return response.data;
  } catch (error) {
    throw new Error(`Google Books search failed: ${error.message}`);
  }
};

const searchForBooksById = async (keyword) => {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes/${keyword}?key=${api_key}`;

    const response = await axios.get(encodeURI(url));
    return response.data;
  } catch (error) {
    throw new Error(`Google Books lookup failed: ${error.message}`);
  }
};

module.exports = { searchForBooks, searchForBooksById };
