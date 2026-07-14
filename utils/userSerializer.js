const toPublicUser = (user) => {
  if (!user) {
    return null;
  }

  const plainUser =
    typeof user.toObject === "function"
      ? user.toObject()
      : { ...(user._doc || user) };

  delete plainUser.password;
  return plainUser;
};

const toPublicUsers = (users = []) => {
  return users.map(toPublicUser).filter(Boolean);
};

module.exports = {
  toPublicUser,
  toPublicUsers,
};
