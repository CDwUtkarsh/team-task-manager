const result = db.users.updateMany(
  { role: { $exists: false } },
  { $set: { role: "member", is_test_user: false } }
);

db.users.updateMany(
  { is_test_user: { $exists: false } },
  { $set: { is_test_user: false } }
);

printjson({
  usersRoleNormalized: result.modifiedCount,
  users: db.users
    .find({}, { name: 1, email: 1, role: 1, is_test_user: 1 })
    .sort({ name: 1 })
    .toArray()
    .map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      is_test_user: user.is_test_user,
    })),
});
