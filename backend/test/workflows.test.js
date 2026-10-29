import assert from "node:assert/strict";
import { access, unlink } from "node:fs/promises";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import app from "../app.js";
import { uploadDirectory } from "../middleware/evidenceUpload.js";
import ChangeRequest from "../models/ChangeRequest.js";
import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";

const runId = `${Date.now()}_${process.pid}`;
const databaseName = `fairwork_test_${runId}`;
const mongoUri = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017";
const jwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET ||= "fairwork-test-jwt-secret-with-sufficient-length";

let server;
let api;
let sequence = 0;
let projectId;
let milestoneId;
let storedName;
let client;
let freelancer;
let outsider;

async function request(path, options = {}) {
  return fetch(`${api}${path}`, options);
}

function jsonRequest(body, token, method = "POST") {
  return {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  };
}

async function createUser(role) {
  const email = `${role}-${++sequence}-${runId}@example.test`;
  const response = await request("/auth/register", jsonRequest({
    name: `${role} user`,
    email,
    password: "secure-password-123",
    role
  }));
  assert.equal(response.status, 201, await response.clone().text());
  return { ...(await response.json()), email };
}

before(async () => {
  await mongoose.connect(mongoUri, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 5000
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  api = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (storedName) await unlink(`${uploadDirectory}/${storedName}`).catch(() => {});
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (jwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = jwtSecret;
});

test("two participants complete the project, evidence, dispute, and change-request workflows", async () => {
  client = await createUser("client");
  freelancer = await createUser("freelancer");
  outsider = await createUser("client");

  let response = await request("/projects", jsonRequest({
    title: "Workflow integration test",
    budgetPaise: 100000
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  projectId = (await response.json()).project._id;

  response = await request(`/projects/${projectId}/invitations`, jsonRequest({
    email: freelancer.email
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  const invitation = (await response.json()).invitation;
  response = await request(`/projects/invitations/${invitation._id}/accept`, jsonRequest({}, freelancer.token));
  assert.equal(response.status, 200, await response.clone().text());

  response = await request(`/projects/${projectId}/agreements`, jsonRequest({
    terms: "Deliver the agreed project work.",
    acceptanceCriteria: ["Both parties approve."]
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  const agreement = (await response.json()).agreement;
  response = await request(`/projects/${projectId}/agreements/${agreement._id}/submit`, jsonRequest({}, client.token));
  assert.equal(response.status, 200, await response.clone().text());
  response = await request(`/projects/${projectId}/agreements/${agreement._id}/approve`, jsonRequest({}, client.token));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).agreement.status, "pending_approval");
  response = await request(`/projects/${projectId}/agreements/${agreement._id}/approve`, jsonRequest({}, freelancer.token));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).agreement.status, "approved");

  response = await request(`/projects/${projectId}/milestones`, jsonRequest({
    title: "First delivery",
    amountMinor: 40000
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  milestoneId = (await response.json()).milestone._id;
  response = await request(`/projects/${projectId}/milestones/${milestoneId}/status`, jsonRequest({
    status: "in_progress"
  }, freelancer.token, "PATCH"));
  assert.equal(response.status, 200, await response.clone().text());

  const form = new FormData();
  form.append("description", "Initial delivery evidence.");
  form.append("file", new Blob(["test evidence"], { type: "text/plain" }), "evidence.txt");
  response = await request(`/projects/${projectId}/milestones/${milestoneId}/evidence`, {
    method: "POST",
    headers: { authorization: `Bearer ${freelancer.token}` },
    body: form
  });
  assert.equal(response.status, 201, await response.clone().text());
  const evidence = (await response.json()).evidence;
  storedName = (await Evidence.findById(evidence._id).select("+storedName")).storedName;

  response = await request(`/projects/${projectId}/milestones/${milestoneId}/evidence/${evidence._id}/file`, {
    headers: { authorization: `Bearer ${outsider.token}` }
  });
  assert.equal(response.status, 404);
  response = await request(`/projects/${projectId}/milestones/${milestoneId}/evidence/${evidence._id}/file`, {
    headers: { authorization: `Bearer ${client.token}` }
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "test evidence");

  response = await request(`/projects/${projectId}/disputes`, jsonRequest({
    milestoneId,
    reason: "Please clarify the delivery.",
    evidenceIds: [evidence._id]
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  const dispute = (await response.json()).dispute;
  response = await request(`/projects/${projectId}/milestones/${milestoneId}/status`, jsonRequest({
    status: "in_progress"
  }, freelancer.token, "PATCH"));
  assert.equal(response.status, 409);

  response = await request(`/projects/${projectId}/disputes/${dispute._id}`, jsonRequest({
    status: "resolved",
    resolutionNotes: "Agreed next steps."
  }, freelancer.token, "PATCH"));
  assert.equal(response.status, 409);
  response = await request(`/projects/${projectId}/disputes/${dispute._id}`, jsonRequest({
    status: "under_review"
  }, freelancer.token, "PATCH"));
  assert.equal(response.status, 200, await response.clone().text());
  response = await request(`/projects/${projectId}/disputes/${dispute._id}`, jsonRequest({
    status: "resolved",
    resolutionNotes: "Agreed next steps."
  }, freelancer.token, "PATCH"));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await Project.findById(projectId)).status, "active");
  assert.equal((await Milestone.findById(milestoneId)).status, "in_progress");

  response = await request(`/projects/${projectId}/change-requests`, jsonRequest({
    description: "Add a review round.",
    proposedAmountMinor: 125000,
    proposedDeadline: "2027-03-01T00:00:00.000Z"
  }, freelancer.token));
  assert.equal(response.status, 201, await response.clone().text());
  const acceptedChange = (await response.json()).changeRequest;
  response = await request(`/projects/${projectId}/change-requests/${acceptedChange._id}/respond`, jsonRequest({
    decision: "accepted"
  }, freelancer.token));
  assert.equal(response.status, 403);
  response = await request(`/projects/${projectId}/change-requests/${acceptedChange._id}/respond`, jsonRequest({
    decision: "accepted"
  }, client.token));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await Project.findById(projectId)).budgetPaise, 125000);
  assert.equal((await ChangeRequest.findById(acceptedChange._id)).status, "accepted");

  response = await request(`/projects/${projectId}/change-requests`, jsonRequest({
    description: "Optional change to decline."
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  const rejectedChange = (await response.json()).changeRequest;
  response = await request(`/projects/${projectId}/change-requests/${rejectedChange._id}/respond`, jsonRequest({
    decision: "rejected"
  }, freelancer.token));
  assert.equal(response.status, 200, await response.clone().text());

  response = await request(`/projects/${projectId}/change-requests`, jsonRequest({
    description: "Optional change to withdraw."
  }, client.token));
  assert.equal(response.status, 201, await response.clone().text());
  const withdrawnChange = (await response.json()).changeRequest;
  response = await request(`/projects/${projectId}/change-requests/${withdrawnChange._id}/withdraw`, jsonRequest({}, client.token));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).changeRequest.status, "withdrawn");

  response = await request(`/projects/${projectId}/issues`, {
    headers: { authorization: `Bearer ${outsider.token}` }
  });
  assert.equal(response.status, 404);

  response = await request(`/projects/${projectId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${client.token}` }
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(await Evidence.countDocuments({ milestoneId }), 0);
  assert.equal(await Dispute.countDocuments({ projectId }), 0);
  assert.equal(await ChangeRequest.countDocuments({ projectId }), 0);
  await assert.rejects(access(`${uploadDirectory}/${storedName}`));
});
