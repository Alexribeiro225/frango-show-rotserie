import { useCallback, useEffect, useRef, useState } from "react";
import { ChefHat, Clock3, Printer, RefreshCw, Trash2 , X} from "lucide-react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { defaultPeriod, periodLabel, periodRange, type PeriodPreset } from "@/lib/period";
import { deleteOrdersByIds, deleteOrdersInRange, listOrders, setOrderFlag, updateOrderStatus, type KitchenOrder } from "@/lib/cms";

const money = (value: number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const statusLabel: Record<KitchenOrder["status"], string> = {
  new: "Novo", preparing: "Em preparo", ready: "Pronto", completed: "Concluído", cancelled: "Cancelado",
};
const nextStatus: Partial<Record<KitchenOrder["status"], KitchenOrder["status"]>> = {
  new: "preparing", preparing: "ready", ready: "completed",
};

const kitchenPresets: PeriodPreset[] = ["today", "date", "7", "30", "month", "custom"];

export function KitchenBoard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [printQueue, setPrintQueue] = useState<number[]>([]);
  const [printPulse, setPrintPulse] = useState(0);
  const [period, setPeriod] = useState(() => defaultPeriod("today"));
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | KitchenOrder["status"]>("all");
  const [selected, setSelected] = useState<number[]>([]);
const [selectMode, setSelectMode] = useState(false);
  const periodRef = useRef(period);
  periodRef.current = period;
  const knownOrderIds = useRef<Set<number> | null>(null);
  const autoPrintRef = useRef(true);
  const printingRef = useRef(false);
  const deletingRef = useRef(false);

  useEffect(() => {
    const enabled = localStorage.getItem("frango-kitchen-auto-print") !== "false";
    autoPrintRef.current = enabled;
    setAutoPrint(enabled);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const latest = await listOrders(periodRange(periodRef.current));
      const known = knownOrderIds.current;
      const storedLastSeen = localStorage.getItem("frango-kitchen-last-seen-order-id");
      const maxId = latest.reduce((max, order) => Math.max(max, order.id), Number(storedLastSeen || 0));
      if (known === null) {
        const firstSeen = storedLastSeen === null ? [] : latest.filter(order => order.id > Number(storedLastSeen)).map(order => order.id);
        knownOrderIds.current = new Set(latest.map(order => order.id));
        if (autoPrintRef.current && firstSeen.length) setPrintQueue(queue => [...queue, ...firstSeen.sort((a, b) => a - b)]);
      } else {
        const incoming = latest.filter(order => !known.has(order.id) && order.id > Number(storedLastSeen || 0)).map(order => order.id);
        latest.forEach(order => known.add(order.id));
        if (autoPrintRef.current && incoming.length) setPrintQueue(queue => [...queue, ...incoming.reverse()]);
      }
      if (maxId > 0) localStorage.setItem("frango-kitchen-last-seen-order-id", String(maxId));
      const alive = new Set(latest.map(order => order.id));
      setSelected(ids => (ids.length ? ids.filter(id => alive.has(id)) : ids));
      setOrders(latest); setUpdatedAt(new Date().toLocaleTimeString("pt-BR")); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os pedidos."); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => { setSelected([]); void refresh(); }, [period, refresh]);

  async function deleteOrders() {
    if (deletingRef.current) return;
    const label = periodLabel(period);
    if (!window.confirm(`Apagar TODOS os pedidos de ${label}? Esta ação não pode ser desfeita.`)) return;
    deletingRef.current = true;
    try { const n = await deleteOrdersInRange(periodRange(period)); window.alert(`${n} pedido(s) apagado(s).`); setSelected([]); setSelectMode(false); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível apagar os pedidos."); }
    finally { deletingRef.current = false; }
  }

  async function deleteSelected() {
    if (!selected.length || deletingRef.current) return;
    if (!window.confirm(`Apagar ${selected.length} pedido(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    deletingRef.current = true;
    try { const n = await deleteOrdersByIds(selected); window.alert(`${n} pedido(s) apagado(s).`); setSelected([]); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível apagar os pedidos selecionados."); }
    finally { deletingRef.current = false; }
  }

  function toggleOrder(id: number) {
    setSelectMode(true);
    setSelected(ids => (ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]));
  }

  async function toggleFlag(order: KitchenOrder, flag: "paid_at" | "picked_up_at") {
    if (order[flag] && !window.confirm(flag === "paid_at" ? "Desmarcar pedido como pago?" : "Desmarcar pedido como retirado?")) return;
    try { await setOrderFlag(order.id, flag, !order[flag]); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o pedido."); }
  }

  async function changeStatus(order: KitchenOrder, status: KitchenOrder["status"]) {
    try { await updateOrderStatus(order.id, status); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o pedido."); }
  }

  const printOrder = useCallback((id: number, onFinished?: () => void) => {
    if (printingRef.current) return false;
    const target = document.getElementById("order-" + id);
    if (!target) return false;
    printingRef.current = true;
    document.body.classList.add("printing-kitchen-order");
    target.classList.add("print-current");
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("printing-kitchen-order");
      target.classList.remove("print-current");
      window.removeEventListener("afterprint", cleanup);
      printingRef.current = false;
      onFinished?.();
      setPrintPulse(pulse => pulse + 1);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
    return true;
  }, []);

  useEffect(() => {
    if (!autoPrint || !printQueue.length || printingRef.current) return;
    const timer = window.setTimeout(() => {
      const started = printOrder(printQueue[0]!, () => setPrintQueue(queue => queue.slice(1)));
      if (!started) setPrintPulse(pulse => pulse + 1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [autoPrint, printQueue, printPulse, printOrder]);

  const visibleOrders = orders.filter(order => statusFilter === "all" ? true : statusFilter === "active" ? order.status === "new" || order.status === "preparing" : order.status === statusFilter);
  const visibleKey = visibleOrders.map(order => order.id).join(",");
  const selectedCount = selected.length;
  const allSelected = visibleOrders.length > 0 && selectedCount === visibleOrders.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const selectAllRef = useCallback((el: HTMLInputElement | null) => { if (el) el.indeterminate = someSelected; }, [someSelected]);

  useEffect(() => {
    if (!selected.length) return;
    const visible = new Set(visibleKey ? visibleKey.split(",").map(Number) : []);
    const kept = selected.filter(id => visible.has(id));
    if (kept.length !== selected.length) setSelected(kept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  return <>
    <div className="kitchen-board-toolbar">
      <PeriodPicker value={period} onChange={setPeriod} presets={kitchenPresets} />
      <select className="kitchen-status-filter" aria-label="Filtrar por status" value={statusFilter} onChange={e => setStatusFilter(e.currentTarget.value as typeof statusFilter)}>
        <option value="all">Todos os status</option><option value="active">Pendentes (novos + em preparo)</option><option value="new">Novos</option><option value="preparing">Em preparo</option><option value="ready">Prontos</option><option value="completed">Concluídos</option><option value="cancelled">Cancelados</option>
      </select>
      <span className="kitchen-refresh-label">{updatedAt ? "Atualizado às " + updatedAt : "Carregando…"}</span>
      <label className="kitchen-auto-print"><input type="checkbox" checked={autoPrint} onChange={event => { const enabled = event.currentTarget.checked; autoPrintRef.current = enabled; setAutoPrint(enabled); localStorage.setItem("frango-kitchen-auto-print", String(enabled)); if (!enabled) setPrintQueue([]); }} /><Printer size={16} /> Impressão automática</label>
      <button className="kitchen-refresh-btn" onClick={() => void refresh()} aria-label="Atualizar pedidos"><RefreshCw size={17} /> Atualizar</button>
      <button className="kitchen-refresh-btn" onClick={() => void deleteOrders()} aria-label="Apagar pedidos do período"><Trash2 size={17} /> Apagar pedidos</button>
    </div>
    <div className="kitchen-select-bar">
      <label className="kitchen-select-all"><input ref={selectAllRef} type="checkbox" aria-label="Selecionar todos os pedidos" checked={allSelected} disabled={!visibleOrders.length} onChange={() => setSelected(allSelected ? [] : visibleOrders.map(order => order.id))} /> Selecionar todos</label>
      <span className="kitchen-selected-count">{selectedCount ? selectedCount + " pedido(s) selecionado(s)" : "Nenhum pedido selecionado"}</span>
      {selectedCount > 0 && <button className="kitchen-clear-selection" onClick={() => setSelected([])}>Limpar seleção</button>}
      <button className="kitchen-delete-selected" onClick={() => void deleteSelected()} disabled={!selectedCount}><Trash2 size={17} /> Apagar selecionados{selectedCount ? ` (${selectedCount})` : ""}</button>
    </div>
    {error && <p className="kitchen-error kitchen-alert" role="alert">{error}</p>}
    <section className="kitchen-orders" aria-label="Lista de pedidos">
      {visibleOrders.length === 0 ? <div className="kitchen-empty"><ChefHat size={36} /><b>Nenhum pedido encontrado</b><span>Não há pedidos para o período e status escolhidos.</span></div> :
      visibleOrders.map(order => <article className={"kitchen-order" + (selected.includes(order.id) ? " is-selected" : "")} id={"order-" + order.id} key={order.id}>
        <div className="kitchen-order-top">
          <input className="kitchen-select" type="checkbox" aria-label={"Selecionar pedido " + order.id} checked={selected.includes(order.id)} onChange={() => toggleOrder(order.id)} />
          <div><span className="kitchen-order-number">Pedido #{order.id}</span><span className={"kitchen-status status-" + order.status}>{statusLabel[order.status]}</span>{order.paid_at && <span className="kitchen-flag flag-paid">✓ PAGO</span>}{order.picked_up_at && <span className="kitchen-flag flag-picked">✓ RETIRADO</span>}</div>
          <time><Clock3 size={15} />{time(order.created_at)}</time>
        </div>
        {order.paid_at && <div className="kitchen-flag-banner flag-paid">✓ PEDIDO PAGO — Pagamento confirmado</div>}
        {order.picked_up_at && <div className="kitchen-flag-banner flag-picked">✓ PEDIDO RETIRADO — Entregue ao cliente</div>}
        <div className="kitchen-order-customer"><b>{order.customer_name}</b>{order.customer_phone && <a href={"tel:" + order.customer_phone}>{order.customer_phone}</a>}<span>{order.fulfillment === "delivery" ? "🛵 Delivery" : order.fulfillment === "counter" ? "🏪 Balcão" : "🏠 Retirada"} · {order.payment_method}</span></div>
        {order.fulfillment === "delivery" && <div className="kitchen-address"><b>Endereço</b><span>{[order.address["street"], order.address["number"] && "nº " + order.address["number"], order.address["neighborhood"], order.address["cep"]].filter(Boolean).join(", ")}</span>{order.address["complement"] && <span>Complemento: {order.address["complement"]}</span>}{order.address["reference"] && <span>Referência: {order.address["reference"]}</span>}</div>}
        <div className="kitchen-items"><b>Itens</b>{(order.items || []).map((item,index) => <div className="kitchen-item-wrap" key={item.product_id + "-" + index}><div className="kitchen-item"><span><strong>{item.quantity}×</strong> {item.name}</span><b>{money(Number(item.line_total))}</b></div>{item.description && <small className="kitchen-item-description">{item.description}</small>}{item.components?.length ? <small className="kitchen-item-components">Composição: {item.components.map(component => (component.quantity * item.quantity) + "× " + component.name).join(" · ")}</small> : null}</div>)}</div>
        {order.notes && <div className="kitchen-notes"><b>Observação:</b> {order.notes}</div>}
        <div className="kitchen-total"><span>Subtotal</span><b>{money(Number(order.subtotal))}</b><span>Entrega</span><b>{order.delivery_fee === null ? "A combinar" : money(Number(order.delivery_fee))}</b><strong>Total</strong><strong>{money(Number(order.total))}{order.delivery_fee === null ? " + entrega" : ""}</strong></div>
        <div className="kitchen-order-actions"><button className={"kitchen-flag-btn flag-paid" + (order.paid_at ? " is-on" : "")} onClick={() => void toggleFlag(order, "paid_at")}>{order.paid_at ? "Pedido pago ✓" : "Pedido Pago"}</button><button className={"kitchen-flag-btn flag-picked" + (order.picked_up_at ? " is-on" : "")} onClick={() => void toggleFlag(order, "picked_up_at")}>{order.picked_up_at ? "Pedido retirado ✓" : "Pedido Retirado"}</button><button className="kitchen-print" onClick={() => printOrder(order.id)}><Printer size={17} /> Imprimir</button>{nextStatus[order.status] && <button className="kitchen-primary" onClick={() => void changeStatus(order, nextStatus[order.status]!)}>Marcar como {statusLabel[nextStatus[order.status]!]}</button>}{order.status === "new" && <button className="kitchen-cancel" onClick={() => void changeStatus(order,"cancelled")}>Cancelar</button>}</div>
      </article>)}
    </section>
  </>;
}
