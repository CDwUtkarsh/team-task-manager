import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import path from "node:path";

const appUrl = process.env.E2E_APP_URL || "http://127.0.0.1:5173";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:8000";
const stamp = Date.now();

async function registerUser(request, role) {
  const response = await request.post(`${apiUrl}/auth/register`, {
    data: {
      name: `E2E ${role}`,
      email: `${role.toLowerCase()}${stamp}@example.com`,
      password: "Password123!",
      role: role.toLowerCase(),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register ${role}: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

function expectVisible(locator, message) {
  return locator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(message);
  });
}

const browser = await chromium.launch();
const page = await browser.newPage();
const request = page.request;
let projectName;

try {
  const admin = await registerUser(request, "Admin");
  const member = await registerUser(request, "Member");
  projectName = `Browser Project ${stamp}`;

  await page.goto(`${appUrl}/login`);
  await page.getByLabel("Email").fill(admin.user.email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expectVisible(page.getByRole("heading", { name: "Dashboard" }), "Admin login failed");

  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Description").fill("Created during browser smoke test");
  await page.getByRole("button", { name: "Create project" }).click();
  await expectVisible(page.getByRole("heading", { name: projectName }), "Project was not created");

  const projectCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: projectName }) });
  await projectCard.getByLabel("User").selectOption(member.user.id);
  await projectCard.getByLabel("Role").selectOption("member");
  await projectCard.getByRole("button", { name: "Add" }).click();
  await expectVisible(projectCard.locator(".members-list").getByText(member.user.email), "Member was not added");

  await page.getByRole("link", { name: "Tasks" }).click();
  await page.locator(".task-form").getByLabel("Title").fill(`Browser Task ${stamp}`);
  await page.locator(".task-form").getByLabel("Project").selectOption({ label: projectName });
  await page.locator(".task-form").getByLabel("Assign to").selectOption(member.user.id);
  await page.locator(".task-form").getByLabel("Due date").fill("2020-01-01T09:00");
  await page.locator(".task-form").getByLabel("Description").fill("Smoke test assignment");
  await page.getByRole("button", { name: "Create task" }).click();
  await expectVisible(page.getByRole("heading", { name: `Browser Task ${stamp}` }), "Task was not created");
  await expectVisible(page.getByText("Overdue"), "Overdue badge was not shown");

  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByLabel("Email").fill(member.user.email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expectVisible(page.getByRole("heading", { name: "Dashboard" }), "Member login failed");

  await page.getByRole("link", { name: "Tasks" }).click();
  await expectVisible(page.getByRole("heading", { name: `Browser Task ${stamp}` }), "Assigned task was not visible to member");
  const createTaskButtons = await page.getByRole("button", { name: "Create task" }).count();
  if (createTaskButtons !== 0) {
    throw new Error("Member can see task create controls");
  }
  await page.locator(".task-actions select").selectOption("in_progress");
  await expectVisible(page.getByText("Status updated"), "Member status update did not complete");

  const deleteButtons = await page.getByRole("button", { name: "Delete" }).count();
  if (deleteButtons !== 0) {
    throw new Error("Member can see task delete controls");
  }

  const projectsResponse = await request.get(`${apiUrl}/projects/`, {
    headers: { Authorization: `Bearer ${admin.access_token}` },
  });
  if (projectsResponse.ok()) {
    const projects = await projectsResponse.json();
    const project = projects.find((item) => item.name === projectName);
    if (project) {
      await request.delete(`${apiUrl}/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        admin: admin.user.id,
        member: member.user.id,
        project: projectName,
        task: `Browser Task ${stamp}`,
        memberCanDelete: false,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  execFileSync("mongosh", [
    "team_task_manager",
    "--quiet",
    path.resolve("../scripts/cleanup-test-data.js"),
  ]);
}
