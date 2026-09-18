
import { state } from "./state.js";

export const ROLES = Object.freeze({
  NONE: "none",
  GUEST: "guest",
  PENDING: "pending",
  MEMBER: "member",
  ADMIN: "admin"
});

export function canReadFamily() {
  return ["guest", "member", "admin"].includes(state.access);
}
export function canReadContacts() {
  return ["member", "admin"].includes(state.access);
}
export function canEditPerson(person) {
  if (state.access === "admin") return true;
  if (state.access !== "member") return false;
  if (!person) return false;
  return person.is_placeholder === true || person.id === state.profile?.person_id;
}
export function canDeletePlaceholder(person) {
  return ["member", "admin"].includes(state.access) && person?.is_placeholder === true;
}
export function canManageUsers() {
  return state.access === "admin";
}
export function canEditRelations() {
  return ["member", "admin"].includes(state.access);
}
