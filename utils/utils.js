/* The Movie Database */
const tmdbUrl = "https://api.themoviedb.org/3";

const dbToUIMapperUserModel = (user) => {
    const clone = JSON.parse(JSON.stringify(user));
    clone["firstName"] = user.first_name;
    clone["lastName"] = user.last_name;
    clone["userName"] = user.user_name;
    clone["phoneNumber"] = user.phone_number;
    delete clone.first_name;
    delete clone.last_name;
    delete clone.user_name;
    delete clone.phone_number;

    return clone;
}


module.exports = { tmdbUrl, dbToUIMapperUserModel };