
const initial = {
  session: null,
  access: "none", // none | guest | pending | member | admin
  profile: null,
  meId: null,
  selectedId: null,
  people: [],
  relations: [],
  treeRootId: null,
  collapsed: new Set(),
  view: "tree",
  loading: false,
  usageTracked: false
};

const listeners = new Set();
export const state = initial;

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetState() {
  state.session = null;
  state.access = "none";
  state.profile = null;
  state.meId = null;
  state.selectedId = null;
  state.people = [];
  state.relations = [];
  state.treeRootId = null;
  state.collapsed = new Set();
  state.view = "tree";
  for (const fn of listeners) fn(state);
}
