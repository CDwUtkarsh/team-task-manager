const fakeUserQuery = {
  $or: [
    { email: /@example\.com$/i },
    { email: /^dbg-/i },
    { email: /^rbac-/i },
    { email: /^strict-/i },
    { name: /^(E2E|RBAC|Strict|Dbg|Debug|Browser)\b/i },
    { is_test_user: true },
  ],
};

const fakeUsers = db.users.find(fakeUserQuery, { _id: 1 }).toArray();
const fakeIds = fakeUsers.map((user) => user._id.toString());
const fakeObjectIds = fakeUsers.map((user) => user._id);

const fakeProjects = db.projects
  .find(
    {
      $or: [
        { created_by: { $in: fakeIds } },
        { "members.user_id": { $in: fakeIds } },
        { name: /^(E2E|API E2E|RBAC|Strict|Browser|Dbg|Debug)\b/i },
      ],
    },
    { _id: 1 }
  )
  .toArray();

const fakeProjectIds = fakeProjects.map((project) => project._id.toString());

const taskResult = db.tasks.deleteMany({
  $or: [
    { created_by: { $in: fakeIds } },
    { assigned_to: { $in: fakeIds } },
    { project_id: { $in: fakeProjectIds } },
    { title: /^(E2E|API E2E|RBAC|Strict|Browser|Dbg|Debug)\b/i },
  ],
});

const projectResult = db.projects.deleteMany({
  _id: { $in: fakeProjects.map((project) => project._id) },
});

const userResult = db.users.deleteMany({
  _id: { $in: fakeObjectIds },
});

db.users.updateMany(
  { is_test_user: { $exists: false } },
  { $set: { is_test_user: false } }
);

printjson({
  fakeUsersDeleted: userResult.deletedCount,
  fakeProjectsDeleted: projectResult.deletedCount,
  fakeTasksDeleted: taskResult.deletedCount,
  remainingUsers: db.users
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
