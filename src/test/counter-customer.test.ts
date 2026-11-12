import { describe, expect, it } from "vitest";

import { counterSalePayload } from "@/lib/cms";

describe("Dados do cliente na venda no balcão", () => {
  it("envia o nome e o telefone informados junto com a venda", () => {
    const payload = counterSalePayload(
      "PIX",
      [{ product_id: 10, quantity: 1 }],
      { name: "  Maria Silva  ", phone: "  (14) 99999-9999  " },
    );

    expect(payload.p_customer_name).toBe("Maria Silva");
    expect(payload.p_customer_phone).toBe("(14) 99999-9999");
    expect(payload.p_items).toEqual([{ product_id: 10, quantity: 1 }]);
  });
});
