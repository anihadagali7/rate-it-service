const PUBLIC_USER_FIELDS = [
  "_id",
  "userName",
  "firstName",
  "lastName",
  "picture",
  "followers",
  "following",
];

const ACCOUNT_USER_FIELDS = [
  ...PUBLIC_USER_FIELDS,
  "email",
  "phoneNumber",
  "isActive",
  "isAdmin",
  "isEmailVerified",
];

const toPlainUser = (user) => {
  if (!user) {
    return null;
  }

  return typeof user.toObject === "function"
    ? user.toObject()
    : { ...(user._doc || user) };
};

const pickUserFields = (plainUser, fields) => {
  const sanitizedUser = {};

  for (const field of fields) {
    if (plainUser[field] !== undefined) {
      sanitizedUser[field] = plainUser[field];
    }
  }

  return sanitizedUser;
};

const toPublicUser = (user) => {
  const plainUser = toPlainUser(user);
  if (!plainUser) {
    return null;
  }

  return pickUserFields(plainUser, PUBLIC_USER_FIELDS);
};

const toAccountUser = (user) => {
  const plainUser = toPlainUser(user);
  if (!plainUser) {
    return null;
  }

  const account = pickUserFields(plainUser, ACCOUNT_USER_FIELDS);
  account.isProfileComplete = !!plainUser.userName;
  return account;
};

const toPublicUsers = (users = []) => {
  return users.map(toPublicUser).filter(Boolean);
};

module.exports = {
  toPublicUser,
  toAccountUser,
  toPublicUsers,
  PUBLIC_USER_FIELDS,
  ACCOUNT_USER_FIELDS,
};
