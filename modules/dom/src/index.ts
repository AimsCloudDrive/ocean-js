export * from "./element";
export * from "./Node";
export * from "./static";
import { ClassType as _C } from "@ocean/common";

declare global {
  namespace React {
    interface HTMLAttributes<T> {
      class?: _C;
    }
  }
}
