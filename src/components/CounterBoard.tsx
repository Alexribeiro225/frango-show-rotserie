import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, Minus, Plus, Printer, Search, ShoppingCart, Store, Trash2 } from "lucide-react";
import { createCounterSale, loadPublicContent, type Product } from "@/lib/cms";

const money = (value: number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SaleReceipt = { id: number; items: Array<{ product_id: number; name: string; description?: string; components?: Array<{ product_id: number; name: string; quantity: number }>; quantity: number; unit_price: number; line_total: number }>; total: number; payment_method: string; created_at: string };

export function CounterBoard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState("PIX");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<"counter" | "delivery">("counter");
  const [street, setStreet] = useState("");
  const [residenceNumber, setResidenceNumber] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const loadProducts = useCallback(async () => {
    const content = await loadPublicContent();
    if (!content) throw new Error("Não foi possível carregar o cardápio.");
    setProducts(content.products as Product[]);
  }, []);
  useEffect(() => {
    const refresh = () => void loadProducts().catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar os produtos."));
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [loadProducts]);

  const visibleProducts = useMemo(() => products.filter(product => product.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [products, search]);
  const selected = products.filter(product => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + Number(product.price) * (cart[product.id] ?? 0), 0);

  function change(product: Product, amount: number) {
    setCart(current => {
      const quantity = Math.max(0, Math.min(99, product.stock_quantity ?? 99, (current[product.id] || 0) + amount));
      const next = { ...current, [product.id]: quantity };
      if (!quantity) delete next[product.id];
      return next;
    });
    setReceipt(null);
  }
  async function finishSale() {
    if (!selected.length || busy) return;
    if (fulfillment === "delivery" && (!street.trim() || !residenceNumber.trim())) {
      setError("Informe a rua e o número da residência para registrar o delivery.");
      return;
    }
    setBusy(true); setError("");
    try {
      const sale = await createCounterSale(payment, selected.map(product => ({ product_id: product.id, quantity: cart[product.id] ?? 0 })), {
        customer: { name: customerName, phone: customerPhone },
        fulfillment,
        address: { street, number: residenceNumber },
      });
      setReceipt({ ...sale, created_at: new Date().toISOString() });
      setCart({});
      setCustomerName("");
      setCustomerPhone("");
      setFulfillment("counter");
      setStreet("");
      setResidenceNumber("");
      void loadProducts().catch(() => setError("Venda registrada, mas não foi possível atualizar a lista de estoque."));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registrar a venda."); }
    finally { setBusy(false); }
  }
  function printReceipt() {
    const target = document.getElementById("counter-receipt");
    if (!target) return;
    document.body.classList.add("printing-counter-receipt");
    target.classList.add("print-current");
    const cleanup = () => {
      document.body.classList.remove("printing-counter-receipt");
      target.classList.remove("print-current");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  }

  return <>
    {error && <p className="counter-error counter-alert" role="alert">{error}</p>}
    {receipt && <section className="counter-confirmation"><div><b>Venda #{receipt.id} registrada</b><span>{money(receipt.total)} · {receipt.payment_method}</span></div><button className="counter-secondary" onClick={printReceipt}><Printer size={17}/> Imprimir comprovante</button></section>}
    <div className="counter-layout">
      <section className="counter-catalog">
        <label className="counter-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto…" /></label>
        <div className="counter-products">{visibleProducts.map(product => {
          const quantity = cart[product.id] || 0;
          const stock = product.stock_quantity;
          const unavailable = stock === 0;
          const reachedStock = stock != null && quantity >= stock;
          return <article className={"counter-product" + (unavailable ? " is-unavailable" : "")} key={product.id}>
            {product.image_url && <img src={product.image_url} alt="" />}
            <div className="counter-product-info"><b>{product.name}</b><span>{money(Number(product.price))}</span><small className="counter-product-description">{product.description}</small><small>{stock == null ? "Estoque sem controle" : unavailable ? "Esgotado" : "Disponível: " + stock}</small></div>
            <div className="counter-quantity"><button aria-label={"Diminuir " + product.name} disabled={!quantity} onClick={() => change(product,-1)}><Minus size={15}/></button><span>{quantity}</span><button aria-label={"Adicionar " + product.name} disabled={unavailable || reachedStock} onClick={() => change(product,1)}><Plus size={15}/></button></div>
          </article>;
        })}{!visibleProducts.length && <p className="counter-empty">Nenhum produto encontrado.</p>}</div>
      </section>
      <aside className="counter-cart"><h2><ShoppingCart size={20}/> Venda atual</h2>
        {!selected.length ? <p className="counter-empty">Adicione produtos para iniciar a venda.</p> : <div className="counter-cart-lines">{selected.map(product => <div className="counter-cart-line" key={product.id}>
          <div><b>{cart[product.id]}× {product.name}</b><span>{money(Number(product.price) * (cart[product.id] ?? 0))}</span></div>
          <button aria-label={"Remover " + product.name} onClick={() => change(product,-(cart[product.id] ?? 0))}><Trash2 size={16}/></button>
        </div>)}</div>}
        <div className="counter-fulfillment" role="group" aria-label="Tipo do pedido">
          <button type="button" className={fulfillment === "counter" ? "is-active" : ""} aria-pressed={fulfillment === "counter"} onClick={() => setFulfillment("counter")}><Store size={18}/> Balcão</button>
          <button type="button" className={fulfillment === "delivery" ? "is-active" : ""} aria-pressed={fulfillment === "delivery"} onClick={() => setFulfillment("delivery")}><Bike size={19}/> Delivery</button>
        </div>
        <div className="counter-customer">
          <label>Nome do cliente (opcional)<input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome para identificar o pedido" maxLength={120} autoComplete="name" /></label>
          <label>Telefone do cliente (opcional)<input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(14) 99999-9999" maxLength={30} autoComplete="tel" /></label>
        </div>
        {fulfillment === "delivery" && <div className="counter-delivery-address">
          <label>Nome da rua<input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua da entrega" maxLength={160} autoComplete="address-line1" /></label>
          <label>Número da residência<input type="text" value={residenceNumber} onChange={e => setResidenceNumber(e.target.value)} placeholder="Nº" maxLength={20} /></label>
        </div>}
        <label className="counter-payment">Forma de pagamento<select value={payment} onChange={e => setPayment(e.target.value)}><option>PIX</option><option>Cartão</option><option>Dinheiro</option></select></label>
        <div className="counter-total"><span>Total</span><b>{money(total)}</b></div>
        <button className="counter-primary counter-finish" disabled={!selected.length || busy} onClick={() => void finishSale()}>{busy ? "Registrando…" : "Registrar venda"}</button>
      </aside>
    </div>
    {receipt && <div className="counter-receipt" id="counter-receipt"><h2>FRANGO SHOW ROTISSERIE</h2><p>Comprovante de venda no balcão<br/>Venda #{receipt.id}<br/>{new Date(receipt.created_at).toLocaleString("pt-BR")}</p><hr/>{receipt.items.map(item => <div className="counter-receipt-line" key={item.product_id}><span>{item.quantity}× {item.name}<small>{item.description}</small>{item.components?.length ? <small>Composição: {item.components.map(component => (component.quantity * item.quantity) + "× " + component.name).join(" · ")}</small> : null}</span><b>{money(Number(item.line_total))}</b></div>)}<hr/><p>Pagamento: {receipt.payment_method}</p><strong>TOTAL: {money(Number(receipt.total))}</strong><p>Obrigado pela preferência!</p></div>}
  </>;
}
