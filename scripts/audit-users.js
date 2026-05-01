printjson({
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
  duplicateEmails: db.users
    .aggregate([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray(),
});
