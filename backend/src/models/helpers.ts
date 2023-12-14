import type { Types } from "mongoose";

type ObjectIdsToStrings<T extends object> = {
  [K in keyof T]: [T[K]] extends [Types.ObjectId] ? string : T[K];
};

export { ObjectIdsToStrings };
