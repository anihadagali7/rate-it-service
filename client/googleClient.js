const axios = require("axios");
const {google} = require('googleapis');

const api_key = process.env.GOOGLE_API_KEY;

const searchForBooks = async (keyword) => {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${keyword}&key=${api_key}`;

    try {
        const response = await axios.get(encodeURI(url));
        return response.data.items;

    } catch (error) {
        console.log(error);
    }
}

module.exports = {searchForBooks};

