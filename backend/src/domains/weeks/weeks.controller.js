import * as availSvc from './availability.service.js';
import * as propSvc from './proposals.service.js';
import * as assignSvc from './assignments.service.js';

export async function getAvailabilityController(req, res) {
  const out = await availSvc.getAvailabilityForWeek(
    req.user.household_id,
    req.params.weekStart,
  );
  res.json(out);
}

export async function setAvailabilityController(req, res) {
  const out = await availSvc.setMyAvailability(
    req.user.id,
    req.user.household_id,
    req.params.weekStart,
    req.body,
  );
  res.json(out);
}

export async function confirmAvailabilityController(req, res) {
  const out = await availSvc.confirmMyAvailability(req.user.id, req.params.weekStart);
  res.json(out);
}

export async function getWeekSummaryController(req, res) {
  const out = await propSvc.getWeekSummary(req.user.household_id, req.params.weekStart);
  res.json(out);
}

export async function generateProposalController(req, res) {
  const out = await propSvc.generateForWeek(req.user.household_id, req.params.weekStart);
  res.status(201).json(out);
}

export async function confirmProposalController(req, res) {
  const out = await propSvc.confirmProposal(
    req.user.household_id,
    req.params.weekStart,
    req.user.id,
  );
  res.json(out);
}

export async function listWeekAssignmentsController(req, res) {
  const out = await propSvc.listAssignmentsFlat(
    req.user.household_id,
    req.params.weekStart,
  );
  res.json(out);
}

export async function createManualAssignmentController(req, res) {
  const out = await assignSvc.createManualAssignment(
    req.user.household_id,
    req.params.weekStart,
    req.body,
  );
  res.status(201).json(out);
}
