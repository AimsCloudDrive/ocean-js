import { MetaRepository } from "../repositories/meta.repository.js";
import { AppError, assertPayload } from "../utils/errors.js";
import type { CanvasMeta, Point } from "../types.js";

export class CanvasService {
  constructor(private readonly repository: MetaRepository) {}

  get() {
    return this.repository.getCanvas();
  }

  async save(payload: unknown): Promise<CanvasMeta> {
    const body = payload as { center?: Point; scale?: number; locked?: boolean };
    assertPayload(body?.center && Number.isFinite(body.center.x) && Number.isFinite(body.center.y), "center 必须包含有效的 x、y");
    if (typeof body.scale !== "number" || body.scale < 0.5 || body.scale > 2) {
      throw new AppError(400, "INVALID_SCALE", "scale 必须在 0.5 到 2 之间");
    }
    assertPayload(body.locked === undefined || typeof body.locked === "boolean", "locked 必须是布尔值");
    return this.repository.saveCanvas({ META_TYPE: "base", center: body.center, scale: body.scale, locked: body.locked });
  }
}
