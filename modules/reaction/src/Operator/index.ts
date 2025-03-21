const iterator: typeof Symbol.iterator = Symbol.iterator;

export type TRACKERTYPES = "GET" | "HAS" | typeof iterator;
export type TRRIGERTYPES = "SET" | "ADD" | "DELETE";
export const OPERATORTYPES: {
  TRACKER: {
    [TRACKERTYPE in TRACKERTYPES]: TRACKERTYPE;
  };
  TRRIGER: {
    [TRRIGERTYPE in TRRIGERTYPES]: TRRIGERTYPE;
  };
} = {
  TRACKER: {
    GET: "GET",
    HAS: "HAS",
    [iterator]: iterator,
  },
  TRRIGER: {
    SET: "SET",
    ADD: "ADD",
    DELETE: "DELETE",
  },
};

export const OPERATORMAPS = {
  [OPERATORTYPES.TRRIGER.SET]: [OPERATORTYPES.TRACKER.GET],
  [OPERATORTYPES.TRRIGER.ADD]: [
    OPERATORTYPES.TRACKER.GET,
    OPERATORTYPES.TRACKER.HAS,
    OPERATORTYPES.TRACKER[iterator],
  ],
  [OPERATORTYPES.TRRIGER.DELETE]: [
    OPERATORTYPES.TRACKER.GET,
    OPERATORTYPES.TRACKER.HAS,
    OPERATORTYPES.TRACKER[iterator],
  ],
} as const;
Object.freeze(OPERATORTYPES);
Object.freeze(OPERATORMAPS);
