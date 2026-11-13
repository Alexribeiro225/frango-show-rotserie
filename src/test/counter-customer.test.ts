import { describe, expect, it } from "vitest";

import { counterSalePayload } from "@/lib/cms";

const items = [{ product_id: 10, quantity: 1 }];

describe("Dados do cliente na venda no balcão", () => {
  it("envia o nome e o telefone informados junto com a venda", () => {
    const payload = counterSalePayload("PIX", items, {
      customer: { name: "  Maria Silva  ", phone: "  (14) 99999-9999  " },
      fulfillment: "counter",
      address: { street: "", number: "" },
    });

    expect(payload.p_customer_name).toBe("Maria Silva");
    expect(payload.p_customer_phone).toBe("(14) 99999-9999");
    expect(payload.p_items).toEqual(items);
  });

  it("envia rua e número quando a venda do balcão é um delivery", () => {
    const payload = counterSalePayload("Dinheiro", items, {
      customer: { name: "Maria Silva", phone: "(14) 99999-9999" },
      fulfillment: "delivery",
      address: { street: "  Rua das Flores  ", number: "  123  " },
    });

    expect(payload.p_fulfillment).toBe("delivery");
    expect(payload.p_address).toEqual({ street: "Rua das Flores", number: "123" });
  });
});
