import { json, who, type Ctx } from "../../src/lib/server/http";

/** Wie ben ik? (beheerder of lid) — de app kiest hiermee de juiste modus */
export async function onRequestGet(ctx: Ctx) {
  const w = await who(ctx);
  return w instanceof Response ? w : json(w);
}
