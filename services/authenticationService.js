const UsersModel = require("../repository/userModel");
const bcrypt = require("bcrypt");

const createNewUser = async (
  firstName,
  lastName,
  email,
  password,
  phoneNumber
) => {
  console.log("inside the service");
  let existingUser = UsersModel.find({ email: email });

  if (existingUser) {
    // return response.status(200).json({
    //   errors: [
    //     {
    //       email: existingUser.email,
    //       msg: "The user already exists",
    //     },
    //   ],
    // });
    console.log("user already exists");
  }

  const salt = await bcrypt.genSalt(10);
  console.log("salt:", salt);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log("hashed password:", hashedPassword);

  const newUser = new UsersModel({
    first_name: firstName,
    last_name: lastName,
    phone_number: phoneNumber,
    email: email,
    password: hashedPassword,
  }).save();
};

const login = (email, password) => {
  let existingUser = users.find((user) => {
    return user.email === email;
  });
};

module.exports = { createNewUser };
