import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Boxes,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  Eye,
  EyeOff,
  Factory,
  LayoutDashboard,
  Menu,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Settings2,
  ShoppingBag,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type Channel,
  type Database,
  type Material,
  type MaterialKind,
  type Movement,
  type Product,
  type Sheet,
  emptyDatabase,
  id,
  materialBalance,
  money,
  number,
  priceQuote,
  today,
} from "./domain";
import { LocalStorageRepository } from "./storage";
import logo from "./public/img/near_creation_3d.svg";
import PrinterSettings from "./PrinterSettings";
import FilamentFields from "./FilamentFields";
import ProductFilaments from "./ProductFilaments";
import MaterialColorInput, { MaterialColor } from "./MaterialColorInput";
import { normalizeMaterialColor } from "./materialColor";
import ElectricBorder from "./components/ElectricBorder";
import Modal from "./Modal";
import IconAction from "./IconAction";

type Page =
  | "dashboard"
  | "materials"
  | "pricing"
  | "products"
  | "settings"
  | "coming";
const repository = new LocalStorageRepository();
const nav: { id: Page; label: string; icon: LucideIcon; enabled: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { id: "coming", label: "Financeiro", icon: Wallet, enabled: false },
  {
    id: "coming",
    label: "Despesas e compras",
    icon: ReceiptText,
    enabled: false,
  },
  { id: "materials", label: "Materiais e insumos", icon: Boxes, enabled: true },
  { id: "pricing", label: "Precificação", icon: Calculator, enabled: true },
  { id: "coming", label: "Produção", icon: Factory, enabled: false },
  { id: "products", label: "Produtos e estoque", icon: Package, enabled: true },
  {
    id: "coming",
    label: "Vendas e pedidos",
    icon: ShoppingBag,
    enabled: false,
  },
  {
    id: "coming",
    label: "Relatórios",
    icon: ChartNoAxesCombined,
    enabled: false,
  },
  { id: "settings", label: "Configurações", icon: Settings2, enabled: true },
];
const blankSheet = (db: Database): Sheet => ({
  printerId: "",
  filaments: [{ materialId: "", weightGrams: 0 }],
  lines: [],
  printHours: 0,
  labor: 0,
  batch: null,
  channelId: db.settings.channels[0]?.id || "",
  mode: "cost",
  margin: null,
});
const numeric = (value: string) => (value === "" ? 0 : Number(value));
const optionalNumeric = (value: string) =>
  value === "" ? null : Number(value);

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function SectionHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [db, setDb] = useState<Database>(emptyDatabase);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<Page>("dashboard");
  const [comingName, setComingName] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    name: "",
    kind: "Filamento" as MaterialKind,
    unit: "kg" as Material["unit"],
    minimum: 0,
    quantity: 0,
    unitCost: 0,
  });
  const [newMaterialColor, setNewMaterialColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [materialModal, setMaterialModal] = useState<
    "material" | "movement" | null
  >(null);
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [editingMovementId, setEditingMovementId] = useState("");
  const [deleteMovementId, setDeleteMovementId] = useState("");
  const [purchase, setPurchase] = useState({
    quantity: 0,
    unitCost: 0,
    date: today(),
    note: "",
  });
  const [adjustment, setAdjustment] = useState({
    quantity: 0,
    date: today(),
    note: "",
  });
  const [materialTab, setMaterialTab] = useState<"purchase" | "adjustment">(
    "purchase",
  );
  const [channelDraft, setChannelDraft] = useState({
    name: "",
    fixedFee: 0,
    percentFee: 0,
  });
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState("");
  const [sheet, setSheet] = useState<Sheet>(() => blankSheet(emptyDatabase()));
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    category: "",
  });
  const [pricingSaveOpen, setPricingSaveOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState("");
  const [productDetail, setProductDetail] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .load()
      .then((data) => {
        if (active) {
          setDb(data);
          setSheet(blankSheet(data));
          setLoading(false);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setLoadError(error.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 5000);
  };
  const commit = async (next: Database, message: string) => {
    try {
      await repository.save(next);
      setDb(next);
      flash(message);
      return true;
    } catch (error) {
      flash((error as Error).message);
      return false;
    }
  };
  const go = (target: Page, label = "") => {
    setPage(target);
    setComingName(label);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  if (loading)
    return (
      <main className="load-error">
        <h1>Carregando seu ateliê...</h1>
      </main>
    );
  if (loadError)
    return (
      <main className="load-error">
        <h1>Não foi possível abrir seus dados</h1>
        <p>{loadError}</p>
        <p>
          Os dados do navegador foram preservados. Verifique o armazenamento
          antes de continuar.
        </p>
      </main>
    );

  const materialSummary = db.materials.map((material) => ({
    material,
    balance: materialBalance(material.id, db.movements, material.stockBaseline),
  }));
  const stockValue = materialSummary.reduce(
    (sum, item) => sum + item.balance.value,
    0,
  );
  const lowMaterials = materialSummary.filter(
    (item) =>
      item.material.minimum > 0 &&
      item.balance.quantity < item.material.minimum,
  );
  const selected = db.materials.find((m) => m.id === selectedMaterial);
  const selectedBalance = selected
    ? materialBalance(selected.id, db.movements, selected.stockBaseline)
    : null;
  let calculated: ReturnType<typeof priceQuote> | null = null;
  let calcError = "";
  try {
    calculated = priceQuote(sheet, db);
  } catch (error) {
    calcError = (error as Error).message;
  }

  function openAddMaterial() {
    setEditingMaterialId("");
    setMaterialForm({
      name: "",
      kind: "Filamento",
      unit: "kg",
      minimum: 0,
      quantity: 0,
      unitCost: 0,
    });
    setNewMaterialColor("");
    setMaterialModal("material");
  }
  function openEditMaterial(material: Material) {
    const balance = materialBalance(
      material.id,
      db.movements,
      material.stockBaseline,
    );
    const currentCost =
      balance.quantity === 0
        ? (material.stockBaseline?.unitCost ?? 0)
        : balance.average;
    setEditingMaterialId(material.id);
    setMaterialForm({
      name: material.name,
      kind: material.kind,
      unit: material.unit,
      minimum: material.minimum,
      quantity: balance.quantity,
      unitCost: currentCost,
    });
    setNewMaterialColor(material.color || "");
    setMaterialModal("material");
  }
  function openMovement(materialId?: string) {
    setEditingMovementId("");
    setSelectedMaterial(materialId || db.materials[0]?.id || "");
    setMaterialTab("purchase");
    setPurchase({ quantity: 0, unitCost: 0, date: today(), note: "" });
    setAdjustment({ quantity: 0, date: today(), note: "" });
    setMaterialModal("movement");
  }
  function openEditMovement(movement: Movement) {
    setEditingMovementId(movement.id);
    setSelectedMaterial(movement.materialId);
    setMaterialTab(movement.type);
    if (movement.type === "purchase")
      setPurchase({
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        date: movement.date,
        note: movement.note,
      });
    else
      setAdjustment({
        quantity: Math.abs(movement.quantity),
        date: movement.date,
        note: movement.note,
      });
    setMaterialModal("movement");
  }
  async function saveMaterial(event: FormEvent) {
    event.preventDefault();
    const name = materialForm.name.trim();
    if (!name) return flash("Informe o nome do material.");
    if (
      [materialForm.minimum, materialForm.quantity, materialForm.unitCost].some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    )
      return flash(
        "Estoque mínimo, saldo e custo devem ser valores válidos não negativos.",
      );
    if (materialForm.kind === "Filamento" && materialForm.unit !== "kg")
      return flash("Filamentos devem ser cadastrados em kg.");
    const color = normalizeMaterialColor(newMaterialColor);
    if (newMaterialColor.trim() && !color)
      return flash("Informe uma cor HEX ou RGB válida.");
    const existing = db.materials.find(
      (material) => material.id === editingMaterialId,
    );
    if (existing) {
      const usedInQuotes = db.products.some((product) =>
        product.quotes.some(
          (quote) =>
            quote.sheet.filaments.some(
              (line) => line.materialId === existing.id,
            ) ||
            quote.sheet.lines.some((line) => line.materialId === existing.id),
        ),
      );
      if (
        (usedInQuotes ||
          db.movements.some(
            (movement) => movement.materialId === existing.id,
          )) &&
        (materialForm.kind !== existing.kind ||
          materialForm.unit !== existing.unit)
      )
        return flash(
          "Tipo e unidade não podem mudar após movimentações ou uso em fichas.",
        );
      const balance = materialBalance(
        existing.id,
        db.movements,
        existing.stockBaseline,
      );
      const currentCost =
        balance.quantity === 0
          ? (existing.stockBaseline?.unitCost ?? 0)
          : balance.average;
      const stockChanged =
        Math.abs(materialForm.quantity - balance.quantity) > 1e-9 ||
        Math.abs(materialForm.unitCost - currentCost) > 1e-9;
      const updated: Material = {
        ...existing,
        name,
        kind: materialForm.kind,
        unit: materialForm.unit,
        minimum: materialForm.minimum,
        color,
        stockBaseline: stockChanged
          ? {
              quantity: materialForm.quantity,
              unitCost: materialForm.unitCost,
              includedMovementIds: db.movements
                .filter((movement) => movement.materialId === existing.id)
                .map((movement) => movement.id),
            }
          : existing.stockBaseline,
      };
      if (
        await commit(
          {
            ...db,
            materials: db.materials.map((material) =>
              material.id === existing.id ? updated : material,
            ),
          },
          "Material e inventário atualizados.",
        )
      )
        setMaterialModal(null);
      return;
    }
    const newMaterial: Material = {
      id: id(),
      name,
      kind: materialForm.kind,
      unit: materialForm.unit,
      minimum: materialForm.minimum,
      color,
      stockBaseline:
        materialForm.quantity > 0 || materialForm.unitCost > 0
          ? {
              quantity: materialForm.quantity,
              unitCost: materialForm.unitCost,
              includedMovementIds: [],
            }
          : null,
      createdAt: new Date().toISOString(),
    };
    if (
      await commit(
        { ...db, materials: [...db.materials, newMaterial] },
        "Material cadastrado com sucesso.",
      )
    ) {
      setSelectedMaterial(newMaterial.id);
      setMaterialModal(null);
    }
  }
  async function addMovement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return flash("Selecione um material.");
    const existing = db.movements.find(
      (movement) => movement.id === editingMovementId,
    );
    const saveMovement = async (movement: Movement, message: string) => {
      const movements = existing
        ? db.movements.map((item) =>
            item.id === existing.id ? movement : item,
          )
        : [...db.movements, movement];
      const material = db.materials.find(
        (item) => item.id === movement.materialId,
      );
      if (
        material &&
        materialBalance(material.id, movements, material.stockBaseline)
          .quantity < -1e-9
      )
        return flash(
          "A movimentação deixaria o estoque negativo. Ajuste a quantidade ou edite o saldo diretamente.",
        );
      if (await commit({ ...db, movements }, message)) {
        setEditingMovementId("");
        setMaterialModal(null);
      }
    };
    if (materialTab === "purchase") {
      if (
        !Number.isFinite(purchase.quantity) ||
        !Number.isFinite(purchase.unitCost) ||
        purchase.quantity <= 0 ||
        purchase.unitCost < 0 ||
        !purchase.date
      )
        return flash("Informe quantidade, preço e data válidos.");
      const movement: Movement = {
        id: existing?.id ?? id(),
        materialId: selected.id,
        type: "purchase" as const,
        quantity: purchase.quantity,
        unitCost: purchase.unitCost,
        date: purchase.date,
        note: purchase.note.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await saveMovement(
        movement,
        existing
          ? "Movimentação atualizada."
          : "Entrada registrada. O custo médio foi atualizado.",
      );
    } else {
      const available = existing
        ? materialBalance(
            selected.id,
            db.movements.filter((movement) => movement.id !== existing.id),
            selected.stockBaseline,
          ).quantity
        : selectedBalance?.quantity || 0;
      if (
        !Number.isFinite(adjustment.quantity) ||
        adjustment.quantity <= 0 ||
        (existing &&
          !selected.stockBaseline?.includedMovementIds.includes(existing.id) &&
          adjustment.quantity > available) ||
        (!existing && adjustment.quantity > available) ||
        !adjustment.date ||
        !adjustment.note.trim()
      )
        return flash("Informe uma saída válida e o motivo do ajuste.");
      const movement: Movement = {
        id: existing?.id ?? id(),
        materialId: selected.id,
        type: "adjustment" as const,
        quantity: -adjustment.quantity,
        unitCost: selectedBalance!.average,
        date: adjustment.date,
        note: adjustment.note.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await saveMovement(
        movement,
        existing ? "Movimentação atualizada." : "Ajuste de estoque registrado.",
      );
    }
  }
  async function deleteMovement() {
    if (!deleteMovementId) return;
    if (
      await commit(
        {
          ...db,
          movements: db.movements.filter(
            (movement) => movement.id !== deleteMovementId,
          ),
        },
        "Movimentação excluída.",
      )
    )
      setDeleteMovementId("");
  }
  function openAddChannel() {
    setEditingChannelId("");
    setChannelDraft({ name: "", fixedFee: 0, percentFee: 0 });
    setChannelModalOpen(true);
  }
  function openEditChannel(channel: Channel) {
    setEditingChannelId(channel.id);
    setChannelDraft({ name: channel.name, fixedFee: channel.fixedFee, percentFee: channel.percentFee });
    setChannelModalOpen(true);
  }
  async function saveChannel(event: FormEvent) {
    event.preventDefault();
    const name = channelDraft.name.trim();
    if (!name || !Number.isFinite(channelDraft.fixedFee) || !Number.isFinite(channelDraft.percentFee) || channelDraft.fixedFee < 0 || channelDraft.percentFee < 0 || channelDraft.percentFee >= 100)
      return flash("Informe um canal e taxas válidas.");
    const channel: Channel = { id: editingChannelId || id(), name, fixedFee: channelDraft.fixedFee, percentFee: channelDraft.percentFee };
    const channels = editingChannelId
      ? db.settings.channels.map(item => item.id === editingChannelId ? channel : item)
      : [...db.settings.channels, channel];
    if (await commit({ ...db, settings: { ...db.settings, channels } }, editingChannelId ? "Canal atualizado." : "Canal cadastrado."))
      setChannelModalOpen(false);
  }
  function openPricingSave(event: FormEvent) {
    event.preventDefault();
    if (!calculated) return flash(calcError);
    setPricingSaveOpen(true);
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!calculated) return flash(calcError);
    const name = productDraft.name.trim(),
      sku = productDraft.sku.trim();
    if (!name || !sku) return flash("Informe nome e SKU do produto.");
    if (
      db.products.some(
        (p) =>
          p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingProduct,
      )
    )
      return flash("Já existe um produto com este SKU.");
    const quote = {
      id: id(),
      createdAt: new Date().toISOString(),
      sheet: structuredClone(sheet),
      ...calculated,
    };
    let products: Product[];
    if (editingProduct)
      products = db.products.map((p) =>
        p.id === editingProduct
          ? {
              ...p,
              name,
              sku,
              category: productDraft.category.trim(),
              quotes: [...p.quotes, quote],
            }
          : p,
      );
    else
      products = [
        ...db.products,
        {
          id: id(),
          name,
          sku,
          category: productDraft.category.trim(),
          createdAt: new Date().toISOString(),
          quotes: [quote],
        },
      ];
    if (
      await commit(
        { ...db, products },
        editingProduct
          ? "Nova versão da ficha salva."
          : "Produto e ficha técnica salvos.",
      )
    ) {
      setPricingSaveOpen(false);
      setEditingProduct("");
      setProductDraft({ name: "", sku: "", category: "" });
      setSheet(blankSheet(db));
      go("products");
    }
  }
  function recalculate(product: Product) {
    setEditingProduct(product.id);
    setProductDraft({
      name: product.name,
      sku: product.sku,
      category: product.category,
    });
    setSheet(structuredClone(product.quotes.at(-1)!.sheet));
    go("pricing");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src={logo} alt="Logo NEAR Creation 3D" />
          <div>
            <strong>NEAR CREATION</strong>
            <small>3D · GESTÃO CRIATIVA</small>
          </div>
        </div>
        <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
        <nav>
          {nav.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              className={`nav-item ${page === item.id && (item.enabled || comingName === item.label) ? "active" : ""}`}
              onClick={() => go(item.id, item.label)}
            >
              <span className="nav-icon">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {!item.enabled && <span className="soon-dot" title="Em breve" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="local-badge">
            <span aria-hidden="true">●</span> Salvo neste navegador
          </div>
          <p>MVP · versão 0.1</p>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="menu-scrim"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="breadcrumb">
            Visão geral <span>/</span>{" "}
            <strong>
              {page === "coming"
                ? comingName
                : nav.find((n) => n.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </span>
            <div className="avatar">NC</div>
          </div>
        </header>
        <main className="content">
          {page === "dashboard" && (
            <>
              <ElectricBorder
                color="#8860D8"
                speed={1}
                chaos={0.5}
                spread={0.6}
                strands={3}
                thickness={1.5}
                borderRadius={24}
              >
                <div className="hero">
                  <div>
                    <span className="hero-kicker">SEU ATELIÊ EM ORDEM</span>
                    <h1>
                      Bem-vindo à sua
                      <br />
                      <em>central de criação.</em>
                    </h1>
                    <p>
                      Organize seus insumos, conheça seus custos e precifique
                      com confiança.
                    </p>
                    <button
                      className="button button-light"
                      onClick={() => go("pricing")}
                    >
                      Nova precificação <ArrowUpRight aria-hidden="true" />
                    </button>
                  </div>
                  <div className="hero-art ">
                    <span className="orbit orbit-a" />
                    <span className="orbit orbit-b" />
                    <img
                      className="hero-logo backdrop-blur-xs"
                      src={logo}
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </ElectricBorder>
              <SectionHeading
                eyebrow="VISÃO GERAL"
                title="O que está acontecendo"
                text="Acompanhe os dados disponíveis nesta primeira versão."
              />
              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-icon teal">
                    <CircleDollarSign aria-hidden="true" />
                  </span>
                  <small>Valor dos materiais em estoque</small>
                  <strong>{money(stockValue)}</strong>
                  <span>Custo de aquisição atual</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon orange">
                    <PackageCheck aria-hidden="true" />
                  </span>
                  <small>Produtos precificados</small>
                  <strong>{db.products.length}</strong>
                  <span>Com ficha técnica salva</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon pink">
                    <Boxes aria-hidden="true" />
                  </span>
                  <small>Materiais cadastrados</small>
                  <strong>{db.materials.length}</strong>
                  <span>
                    {db.movements.filter((m) => m.type === "purchase").length}{" "}
                    entradas registradas
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon yellow">
                    <TriangleAlert aria-hidden="true" />
                  </span>
                  <small>Abaixo do mínimo</small>
                  <strong>{lowMaterials.length}</strong>
                  <span>Materiais que pedem atenção</span>
                </div>
              </div>
              <div className="dashboard-bottom">
                <div className="panel">
                  <SectionHeading
                    eyebrow="PRÓXIMOS PASSOS"
                    title="Comece por aqui"
                  />
                  <div className="step-list">
                    <button onClick={() => go("materials")}>
                      <span>01</span>
                      <div>
                        <strong>Cadastre seus materiais</strong>
                        <small>Filamentos, acessórios e embalagens</small>
                      </div>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                    <button onClick={() => go("settings")}>
                      <span>02</span>
                      <div>
                        <strong>Configure seus custos</strong>
                        <small>Impressora, energia e canais de venda</small>
                      </div>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                    <button onClick={() => go("pricing")}>
                      <span>03</span>
                      <div>
                        <strong>Precifique um produto</strong>
                        <small>Veja custo e preço por unidade e lote</small>
                      </div>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="panel attention">
                  <SectionHeading eyebrow="ESTOQUE" title="Pontos de atenção" />
                  {lowMaterials.length ? (
                    lowMaterials.map(({ material, balance }) => (
                      <div className="attention-row" key={material.id}>
                        <span className="alert-dot" />
                        <div>
                          <strong>{material.name}</strong>
                          <small>
                            {number(balance.quantity, 3)} {material.unit}{" "}
                            disponíveis · mínimo {number(material.minimum, 3)}{" "}
                            {material.unit}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="quiet-message">
                      Nenhum material abaixo do estoque mínimo.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {page === "materials" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">INVENTÁRIO</span>
                  <h1>Materiais e insumos</h1>
                  <p>
                    Registre entradas, acompanhe saldos e preserve o histórico
                    de preços.
                  </p>
                </div>
                <div className="inventory-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => openMovement()}
                    disabled={!db.materials.length}
                  >
                    <ArrowUpDown aria-hidden="true" /> Movimentação
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={openAddMaterial}
                  >
                    <Plus aria-hidden="true" /> Adicionar material
                  </button>
                </div>
              </div>
              {materialModal === "material" && (
                <Modal
                  title={
                    editingMaterialId
                      ? "Editar material e inventário"
                      : "Adicionar material"
                  }
                  eyebrow="INVENTÁRIO"
                  onClose={() => setMaterialModal(null)}
                >
                  <section className="panel">
                    <SectionHeading
                      eyebrow={
                        editingMaterialId ? "ALTERAR CADASTRO" : "NOVO CADASTRO"
                      }
                      title="Dados do material"
                    />
                    <form onSubmit={saveMaterial} className="form-grid">
                      <Field label="Nome do material">
                        <input
                          value={materialForm.name}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Ex.: PLA Branco"
                          required
                        />
                      </Field>
                      <div className="form-row">
                        <Field label="Tipo">
                          <select
                            value={materialForm.kind}
                            onChange={(e) => {
                              const kind = e.target.value as MaterialKind;
                              setMaterialForm({
                                ...materialForm,
                                kind,
                                unit:
                                  kind === "Filamento"
                                    ? "kg"
                                    : materialForm.unit,
                              });
                            }}
                          >
                            <option>Filamento</option>
                            <option>Acessório</option>
                            <option>Embalagem</option>
                            <option>Outro</option>
                          </select>
                        </Field>
                        <Field label="Unidade">
                          <select
                            value={materialForm.unit}
                            disabled={materialForm.kind === "Filamento"}
                            onChange={(e) =>
                              setMaterialForm({
                                ...materialForm,
                                unit: e.target.value as Material["unit"],
                              })
                            }
                          >
                            <option value="kg">kg</option>
                            <option value="un">unidade</option>
                            <option value="ml">ml</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Estoque mínimo">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={materialForm.minimum || ""}
                          placeholder="Ex.: 1"
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              minimum: numeric(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Cor (opcional)"
                        hint="Selecione uma cor ou digite HEX/RGB."
                      >
                        <MaterialColorInput
                          id="new-material-color"
                          value={newMaterialColor}
                          onChange={setNewMaterialColor}
                        />
                      </Field>
                      <div className="form-row">
                        <Field
                          label={`Saldo atual (${materialForm.unit})`}
                          hint="Pode ser editado diretamente, sem criar movimentação."
                        >
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={materialForm.quantity || ""}
                            placeholder="Ex.: 1"
                            onChange={(event) =>
                              setMaterialForm({
                                ...materialForm,
                                quantity: numeric(event.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label={`Custo médio por ${materialForm.unit}`}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={materialForm.unitCost || ""}
                            placeholder="Ex.: 100"
                            onChange={(event) =>
                              setMaterialForm({
                                ...materialForm,
                                unitCost: numeric(event.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      {editingMaterialId && (
                        <p className="modal-explanation">
                          Ao alterar o saldo ou custo médio, as movimentações já
                          registradas deixam de afetar o inventário. As próximas
                          movimentações poderão ser editadas ou excluídas e
                          recalcularão o saldo.
                        </p>
                      )}
                      <button className="button button-primary" type="submit">
                        {editingMaterialId
                          ? "Salvar alterações"
                          : "Cadastrar material"}{" "}
                        <Save aria-hidden="true" />
                      </button>
                    </form>
                  </section>
                </Modal>
              )}
              {materialModal === "movement" && (
                <Modal
                  title={
                    editingMovementId
                      ? "Editar movimentação"
                      : "Registrar movimentação"
                  }
                  eyebrow="ESTOQUE"
                  onClose={() => setMaterialModal(null)}
                >
                  <section className="panel">
                    <SectionHeading
                      eyebrow="MOVIMENTAÇÃO"
                      title="Registrar no estoque"
                    />
                    <form onSubmit={addMovement} className="form-grid">
                      <Field label="Material">
                        <select
                          value={selectedMaterial}
                          disabled={!!editingMovementId}
                          onChange={(e) => {
                            setSelectedMaterial(e.target.value);
                          }}
                          required
                        >
                          <option value="">Selecione um material</option>
                          {db.materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {selected && (
                        <div className="inline-balance">
                          <span>Saldo atual</span>
                          <strong>
                            {number(selectedBalance!.quantity, 3)}{" "}
                            {selected.unit}
                          </strong>
                          <span>
                            Custo médio: {money(selectedBalance!.average)}/
                            {selected.unit}
                          </span>
                        </div>
                      )}
                      <div className="segmented">
                        <button
                          type="button"
                          disabled={!!editingMovementId}
                          className={
                            materialTab === "purchase" ? "selected" : ""
                          }
                          onClick={() => setMaterialTab("purchase")}
                        >
                          Entrada / compra
                        </button>
                        <button
                          type="button"
                          disabled={!!editingMovementId}
                          className={
                            materialTab === "adjustment" ? "selected" : ""
                          }
                          onClick={() => setMaterialTab("adjustment")}
                        >
                          Ajuste de saída
                        </button>
                      </div>
                      {materialTab === "purchase" ? (
                        <>
                          <div className="form-row">
                            <Field
                              label={`Quantidade${selected ? ` (${selected.unit})` : ""}`}
                            >
                              <input
                                type="number"
                                min="0.000001"
                                step="any"
                                value={purchase.quantity || ""}
                                placeholder="Ex.: 1"
                                onChange={(e) =>
                                  setPurchase({
                                    ...purchase,
                                    quantity: numeric(e.target.value),
                                  })
                                }
                                required
                              />
                            </Field>
                            <Field
                              label={`Preço por ${selected?.unit || "unidade"}`}
                            >
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={purchase.unitCost || ""}
                                placeholder="Ex.: 100"
                                onChange={(e) =>
                                  setPurchase({
                                    ...purchase,
                                    unitCost: numeric(e.target.value),
                                  })
                                }
                                required
                              />
                            </Field>
                          </div>
                          <Field label="Data da compra">
                            <input
                              type="date"
                              value={purchase.date}
                              onChange={(e) =>
                                setPurchase({
                                  ...purchase,
                                  date: e.target.value,
                                })
                              }
                              required
                            />
                          </Field>
                          <Field label="Observação">
                            <input
                              value={purchase.note}
                              onChange={(e) =>
                                setPurchase({
                                  ...purchase,
                                  note: e.target.value,
                                })
                              }
                              placeholder="Fornecedor, lote ou referência"
                            />
                          </Field>
                        </>
                      ) : (
                        <>
                          <div className="form-row">
                            <Field
                              label={`Quantidade a retirar${selected ? ` (${selected.unit})` : ""}`}
                            >
                              <input
                                type="number"
                                min="0.000001"
                                max={selectedBalance?.quantity || 0}
                                step="any"
                                value={adjustment.quantity || ""}
                                placeholder="Ex.: 1"
                                onChange={(e) =>
                                  setAdjustment({
                                    ...adjustment,
                                    quantity: numeric(e.target.value),
                                  })
                                }
                                required
                              />
                            </Field>
                            <Field label="Data">
                              <input
                                type="date"
                                value={adjustment.date}
                                onChange={(e) =>
                                  setAdjustment({
                                    ...adjustment,
                                    date: e.target.value,
                                  })
                                }
                                required
                              />
                            </Field>
                          </div>
                          <Field label="Motivo do ajuste">
                            <input
                              value={adjustment.note}
                              onChange={(e) =>
                                setAdjustment({
                                  ...adjustment,
                                  note: e.target.value,
                                })
                              }
                              placeholder="Ex.: perda ou correção de contagem"
                              required
                            />
                          </Field>
                        </>
                      )}
                      <button className="button button-primary" type="submit">
                        {editingMovementId ? "Salvar" : "Registrar"}{" "}
                        {materialTab === "purchase" ? "entrada" : "ajuste"}{" "}
                        <Save aria-hidden="true" />
                      </button>
                    </form>
                  </section>
                </Modal>
              )}
              <section className="panel table-panel">
                <div className="flex items-center justify-between">
                  <SectionHeading
                    eyebrow="SALDOS ATUAIS"
                    title="Seu inventário"
                  />
                  <span className="page-tag">
                    {db.materials.length} materiais
                  </span>
                </div>

                {db.materials.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Cor</th>
                          <th>Tipo</th>
                          <th>Saldo</th>
                          <th>Custo médio</th>
                          <th>Valor em estoque</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialSummary.map(({ material, balance }) => (
                          <tr key={material.id}>
                            <td
                              style={
                                material.color
                                  ? {
                                      boxShadow: `inset 4px 0 0 ${material.color}`,
                                    }
                                  : undefined
                              }
                            >
                              <strong>{material.name}</strong>
                            </td>
                            <td>
                              <MaterialColor color={material.color} />
                            </td>
                            <td>{material.kind}</td>
                            <td>
                              {number(balance.quantity, 3)} {material.unit}
                            </td>
                            <td>
                              {money(balance.average)}/{material.unit}
                            </td>
                            <td>{money(balance.value)}</td>
                            <td>
                              <span
                                className={`status ${material.minimum > 0 && balance.quantity < material.minimum ? "warning" : "good"}`}
                              >
                                {material.minimum > 0 &&
                                balance.quantity < material.minimum
                                  ? "Abaixo do mínimo"
                                  : "Em dia"}
                              </span>
                            </td>
                            <td>
                              <IconAction
                                icon={Pencil}
                                label={`Editar ${material.name}`}
                                onClick={() => openEditMaterial(material)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Nenhum material ainda"
                    description="Cadastre o primeiro material para começar a controlar seus custos."
                  />
                )}
              </section>
              <section className="panel table-panel">
                <SectionHeading
                  eyebrow="HISTÓRICO DE MOVIMENTAÇÕES"
                  title="Movimentações"
                />
                {db.movements.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Material</th>
                          <th>Tipo</th>
                          <th>Quantidade</th>
                          <th>Custo unitário</th>
                          <th>Observação</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...db.movements].reverse().map((m) => (
                          <tr key={m.id}>
                            <td>
                              <span className="movement-date">
                                {m.quantity < 0 ? (
                                  <ArrowDown size={16} className="negative" aria-label="Saída" />
                                ) : (
                                  <ArrowUp size={16} className="positive" aria-label="Entrada" />
                                )}
                                {new Date(
                                  `${m.date}T12:00:00`,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </td>
                            <td>
                              <strong>
                                {
                                  db.materials.find(
                                    (item) => item.id === m.materialId,
                                  )?.name
                                }
                              </strong>
                            </td>
                            <td>
                              {m.type === "purchase" ? "Entrada" : "Ajuste"}
                            </td>
                            <td
                              className={
                                m.quantity < 0 ? "negative" : "positive"
                              }
                            >
                              {m.quantity > 0 ? "+" : ""}
                              {number(m.quantity, 3)}
                            </td>
                            <td>{money(m.unitCost)}</td>
                            <td>{m.note || "—"}</td>
                            <td className="inventory-row-actions">
                              <IconAction
                                icon={Pencil}
                                label={`Editar movimentação de ${db.materials.find((item) => item.id === m.materialId)?.name || "material"}`}
                                onClick={() => openEditMovement(m)}
                              />
                              <IconAction
                                icon={Trash2}
                                tone="pink"
                                label="Excluir movimentação"
                                onClick={() => setDeleteMovementId(m.id)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="quiet-message">
                    As compras e os ajustes aparecerão aqui.
                  </div>
                )}
              </section>
              {deleteMovementId && (
                <Modal
                  title="Excluir movimentação?"
                  eyebrow="CONFIRMAÇÃO"
                  onClose={() => setDeleteMovementId("")}
                >
                  <p className="modal-explanation">
                    Essa movimentação será removida. Se ela foi registrada após
                    uma edição manual do saldo, o inventário e o custo médio
                    serão recalculados.
                  </p>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => setDeleteMovementId("")}
                    >
                      <X aria-hidden="true" /> Cancelar
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={deleteMovement}
                    >
                      <Trash2 aria-hidden="true" /> Excluir movimentação
                    </button>
                  </div>
                </Modal>
              )}
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">PREFERÊNCIAS</span>
                  <h1>Configurações</h1>
                  <p>
                    Defina os custos que alimentam todas as suas precificações.
                  </p>
                </div>
              </div>
              <PrinterSettings db={db} commit={commit} flash={flash} />
              <section className="panel channels-panel">
                <SectionHeading
                  eyebrow="VENDAS"
                  title="Canais e taxas"
                  text="A taxa fixa é aplicada por lote vendido; a percentual incide sobre o preço final."
                  action={
                    <button type="button" className="button button-primary" onClick={openAddChannel}>
                      <Plus aria-hidden="true" /> Adicionar canal
                    </button>
                  }
                />
                <div className="channel-list">
                  {db.settings.channels.map((channel) => (
                    <div className="channel-row" key={channel.id}>
                      <div>
                        <strong>{channel.name}</strong>
                        <small>
                          Taxa fixa: {money(channel.fixedFee)} · Taxa
                          percentual: {number(channel.percentFee)}%
                        </small>
                      </div>
                      <div className="settings-row-actions">
                        <IconAction
                          icon={Pencil}
                          label={`Editar canal ${channel.name}`}
                          onClick={() => openEditChannel(channel)}
                        />
                        {channel.id !== "direct" && (
                          <IconAction
                            icon={Trash2}
                            tone="pink"
                            label={`Remover canal ${channel.name}`}
                            onClick={() => {
                              const settings = {
                                ...db.settings,
                                channels: db.settings.channels.filter(
                                  (c) => c.id !== channel.id,
                                ),
                              };
                              commit({ ...db, settings }, "Canal removido.");
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {channelModalOpen && <Modal title={editingChannelId ? "Editar canal" : "Adicionar canal"} eyebrow="CANAIS DE VENDA" onClose={() => setChannelModalOpen(false)}>
                <form className="form-grid" onSubmit={saveChannel}>
                  <Field label="Nome do canal">
                    <input
                      value={channelDraft.name}
                      onChange={(e) =>
                        setChannelDraft({
                          ...channelDraft,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ex.: Marketplace"
                      required
                    />
                  </Field>
                  <Field label="Taxa fixa (R$)">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={channelDraft.fixedFee || ""}
                      placeholder="Ex.: 5"
                      onChange={(e) =>
                        setChannelDraft({
                          ...channelDraft,
                          fixedFee: numeric(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Taxa percentual (%)">
                    <input
                      type="number"
                      min="0"
                      max="99.99"
                      step="any"
                      value={channelDraft.percentFee || ""}
                      placeholder="Ex.: 10"
                      onChange={(e) =>
                        setChannelDraft({
                          ...channelDraft,
                          percentFee: numeric(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="modal-actions">
                    <button type="button" className="button button-outline" onClick={() => setChannelModalOpen(false)}>Cancelar</button>
                    <button className="button button-primary" type="submit"><Save aria-hidden="true" /> {editingChannelId ? "Salvar alterações" : "Cadastrar canal"}</button>
                  </div>
                </form>
                </Modal>}
              </section>
            </>
          )}
          {page === "pricing" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">CUSTO & VALOR</span>
                  <h1>
                    {editingProduct ? "Recalcular produto" : "Precificação"}
                  </h1>
                  <p>
                    Monte a ficha técnica e encontre um preço que respeita seus
                    custos.
                  </p>
                </div>
                {editingProduct && (
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setEditingProduct("");
                      setProductDraft({ name: "", sku: "", category: "" });
                      setSheet(blankSheet(db));
                    }}
                  >
                    <X aria-hidden="true" /> Cancelar edição
                  </button>
                )}
              </div>
              <form onSubmit={openPricingSave} className="pricing-grid">
                <div className="pricing-forms">
                  <section className="panel">
                    <SectionHeading
                      eyebrow="01 / FABRICAÇÃO"
                      title="Ficha técnica"
                    />
                    <div className="form-grid">
                      <Field label="Impressora">
                        <select
                          value={sheet.printerId}
                          onChange={(e) =>
                            setSheet({ ...sheet, printerId: e.target.value })
                          }
                          required
                        >
                          <option value="">Selecione uma impressora</option>
                          {db.settings.printers.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name} ·{" "}
                              {money(
                                (printer.purchasePrice +
                                  printer.maintenanceLifetime) /
                                  printer.lifeHours,
                              )}
                              /h
                            </option>
                          ))}
                        </select>
                      </Field>
                      <FilamentFields
                        db={db}
                        sheet={sheet}
                        setSheet={setSheet}
                      />
                      <div className="form-row">
                        <Field label="Tempo por unidade (horas)">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={sheet.printHours || ""}
                            placeholder="Ex.: 2"
                            onChange={(e) =>
                              setSheet({
                                ...sheet,
                                printHours: numeric(e.target.value),
                              })
                            }
                            required
                          />
                        </Field>
                        <Field label="Mão de obra por unidade (R$)">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={sheet.labor || ""}
                            placeholder="Opcional"
                            onChange={(e) =>
                              setSheet({
                                ...sheet,
                                labor: numeric(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="subsection-title">
                        <strong>Acessórios e embalagem</strong>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            setSheet({
                              ...sheet,
                              lines: [
                                ...sheet.lines,
                                { materialId: "", quantity: 0 },
                              ],
                            })
                          }
                        >
                          <Plus size={16} aria-hidden="true" /> Adicionar insumo
                        </button>
                      </div>
                      {sheet.lines.map((line, index) => (
                        <div className="supply-row" key={index}>
                          <select
                            value={line.materialId}
                            onChange={(e) =>
                              setSheet({
                                ...sheet,
                                lines: sheet.lines.map((item, i) =>
                                  i === index
                                    ? { ...item, materialId: e.target.value }
                                    : item,
                                ),
                              })
                            }
                            required
                          >
                            <option value="">Selecione um insumo</option>
                            {db.materials
                              .filter((m) => m.kind !== "Filamento")
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.unit})
                                </option>
                              ))}
                          </select>
                          <input
                            aria-label="Quantidade por unidade"
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity || ""}
                            onChange={(e) =>
                              setSheet({
                                ...sheet,
                                lines: sheet.lines.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        quantity: numeric(e.target.value),
                                      }
                                    : item,
                                ),
                              })
                            }
                            placeholder="Qtd./un."
                            required
                          />
                          <IconAction
                            icon={X}
                            tone="pink"
                            label="Remover insumo"
                            onClick={() =>
                              setSheet({
                                ...sheet,
                                lines: sheet.lines.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                      {!sheet.lines.length && (
                        <p className="field-hint">
                          Adicione elos, embalagens ou outros insumos se
                          necessário.
                        </p>
                      )}
                    </div>
                  </section>
                  <section className="panel">
                    <SectionHeading
                      eyebrow="02 / PREÇO"
                      title="Margem e canal"
                    />
                    <div className="form-grid">
                      <div className="form-row">
                        <Field label="Quantidade no lote">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={sheet.batch ?? ""}
                            placeholder="Ex.: 10"
                            onChange={(e) =>
                              setSheet({
                                ...sheet,
                                batch: optionalNumeric(e.target.value),
                              })
                            }
                            required
                          />
                        </Field>
                        <Field label="Canal de venda">
                          <select
                            value={sheet.channelId}
                            onChange={(e) =>
                              setSheet({ ...sheet, channelId: e.target.value })
                            }
                            required
                          >
                            {db.settings.channels.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="segmented">
                        <button
                          type="button"
                          className={sheet.mode === "cost" ? "selected" : ""}
                          onClick={() => setSheet({ ...sheet, mode: "cost" })}
                        >
                          Acréscimo sobre custo
                        </button>
                        <button
                          type="button"
                          className={sheet.mode === "sale" ? "selected" : ""}
                          onClick={() => setSheet({ ...sheet, mode: "sale" })}
                        >
                          Margem sobre venda
                        </button>
                      </div>
                      <Field
                        label={
                          sheet.mode === "cost"
                            ? "Acréscimo desejado (%)"
                            : "Margem desejada (%)"
                        }
                      >
                        <input
                          type="number"
                          min="0"
                          max="99.99"
                          step="any"
                          value={sheet.margin ?? ""}
                          placeholder="Ex.: 30"
                          onChange={(e) =>
                            setSheet({
                              ...sheet,
                              margin: optionalNumeric(e.target.value),
                            })
                          }
                          required
                        />
                      </Field>
                    </div>
                  </section>
                </div>
                <aside className="result-panel">
                  <span className="eyebrow">RESULTADO EM TEMPO REAL</span>
                  <h2>Seu preço sugerido</h2>
                  {calculated ? (
                    <>
                      <div className="price-highlight">
                        <small>POR UNIDADE</small>
                        <strong>{money(calculated.unitPrice)}</strong>
                        <span>
                          Lote de {sheet.batch} unidades:{" "}
                          {money(calculated.batchPrice)}
                        </span>
                      </div>
                      <p className="selected-printer">
                        Impressora: {calculated.assumptions.printerName}
                      </p>
                      <div className="result-section">
                        <h3>
                          Composição do custo <span>por unidade</span>
                        </h3>
                        {[
                          ["Filamentos", calculated.costs.filament],
                          ["Insumos", calculated.costs.supplies],
                          ["Energia", calculated.costs.energy],
                          ["Impressora e manutenção", calculated.costs.printer],
                          ["Mão de obra", calculated.costs.labor],
                        ].map(([label, value]) => (
                          <div className="result-line" key={label}>
                            <span>{label}</span>
                            <strong>{money(value as number)}</strong>
                          </div>
                        ))}
                        <div className="result-line total">
                          <span>Custo unitário</span>
                          <strong>{money(calculated.unitCost)}</strong>
                        </div>
                      </div>
                      <div className="result-section">
                        <h3>Resultado do lote</h3>
                        <div className="result-line">
                          <span>Custo de fabricação</span>
                          <strong>{money(calculated.batchCost)}</strong>
                        </div>
                        <div className="result-line">
                          <span>Lucro estimado após taxas</span>
                          <strong>{money(calculated.profit)}</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="result-placeholder">
                      <Calculator size={24} aria-hidden="true" />
                      <p>{calcError}</p>
                    </div>
                  )}
                  <button
                    className="button button-lime"
                    type="submit"
                    disabled={!calculated}
                  >
                    {editingProduct
                      ? "Salvar nova versão"
                      : "Salvar produto e ficha"}{" "}
                    <Save aria-hidden="true" />
                  </button>
                  <p className="result-note">
                    O custo desta ficha será preservado. Para atualizar preços,
                    recalcule o produto depois.
                  </p>
                </aside>
              </form>
              {pricingSaveOpen && calculated && (
                <Modal
                  title={editingProduct ? "Salvar nova versão" : "Salvar produto e ficha"}
                  eyebrow="REVISÃO DA PRECIFICAÇÃO"
                  onClose={() => setPricingSaveOpen(false)}
                >
                  <div className="pricing-save-summary">
                    <div><span>Preço por unidade</span><strong>{money(calculated.unitPrice)}</strong></div>
                    <div><span>Custo por unidade</span><strong>{money(calculated.unitCost)}</strong></div>
                    <div><span>Lote de {sheet.batch} unidades</span><strong>{money(calculated.batchPrice)}</strong></div>
                    <p>
                      {calculated.assumptions.printerName} · {calculated.assumptions.channelName} · {sheet.mode === "cost" ? "Acréscimo" : "Margem"} de {number(sheet.margin ?? 0)}%
                    </p>
                  </div>
                  <form className="form-grid pricing-save-form" onSubmit={saveProduct}>
                    <div className="form-row">
                      <Field label="Nome do produto">
                        <input
                          value={productDraft.name}
                          onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
                          placeholder="Ex.: Chaveiro personalizado"
                          required
                        />
                      </Field>
                      <Field label="SKU">
                        <input
                          value={productDraft.sku}
                          onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })}
                          placeholder="Ex.: CHV-001"
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Categoria (opcional)">
                      <input
                        value={productDraft.category}
                        onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })}
                        placeholder="Ex.: Chaveiros"
                      />
                    </Field>
                    <div className="modal-actions">
                      <button type="button" className="button button-outline" onClick={() => setPricingSaveOpen(false)}>Voltar</button>
                      <button type="submit" className="button button-primary"><Save aria-hidden="true" /> Confirmar salvamento</button>
                    </div>
                  </form>
                </Modal>
              )}
            </>
          )}
          {page === "products" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">CATÁLOGO</span>
                  <h1>Produtos e fichas</h1>
                  <p>
                    Consulte custos salvos e recalcule quando os materiais
                    mudarem.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => {
                    setEditingProduct("");
                    setProductDraft({ name: "", sku: "", category: "" });
                    setSheet(blankSheet(db));
                    go("pricing");
                  }}
                >
                  <Plus aria-hidden="true" /> Novo produto
                </button>
              </div>
              {db.products.length ? (
                <div className="product-grid">
                  {db.products.map((product) => {
                    const latest = product.quotes.at(-1)!;
                    return (
                      <article className="product-card" key={product.id}>
                        <div className="product-symbol">
                          <Sparkles size={34} aria-hidden="true" />
                        </div>
                        <div className="product-card-body">
                          <span className="eyebrow">
                            {product.category || "SEM CATEGORIA"} ·{" "}
                            {product.sku}
                          </span>
                          <h3>{product.name}</h3>
                          <div className="product-price">
                            <span>Preço sugerido / unidade</span>
                            <strong>{money(latest.unitPrice)}</strong>
                          </div>
                          <div className="product-meta">
                            <span>Custo: {money(latest.unitCost)}</span>
                            <span>
                              {product.quotes.length}{" "}
                              {product.quotes.length === 1
                                ? "versão"
                                : "versões"}
                            </span>
                          </div>
                          <ProductFilaments
                            db={db}
                            filaments={latest.sheet.filaments}
                          />
                          <div className="product-actions">
                            <button
                              className="button button-outline"
                              onClick={() => recalculate(product)}
                            >
                              <RotateCcw aria-hidden="true" /> Recalcular
                            </button>
                            <IconAction
                              icon={productDetail === product.id ? EyeOff : Eye}
                              label={
                                productDetail === product.id
                                  ? `Ocultar histórico de ${product.name}`
                                  : `Ver histórico de ${product.name}`
                              }
                              tone="blue"
                              onClick={() =>
                                setProductDetail(
                                  productDetail === product.id
                                    ? ""
                                    : product.id,
                                )
                              }
                            />
                          </div>
                          {productDetail === product.id && (
                            <div className="version-list">
                              {[...product.quotes]
                                .reverse()
                                .map((quote, index) => (
                                  <div key={quote.id}>
                                    <strong>
                                      Versão {product.quotes.length - index}
                                    </strong>
                                    <small>
                                      {new Date(
                                        quote.createdAt,
                                      ).toLocaleDateString("pt-BR")}{" "}
                                      · Custo {money(quote.unitCost)} · Preço{" "}
                                      {money(quote.unitPrice)}
                                    </small>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="panel">
                  <Empty
                    title="Seu catálogo começa aqui"
                    description="Precifique um produto e salve sua ficha técnica para acompanhar futuras versões."
                    action={
                      <button
                        className="button button-primary"
                        onClick={() => go("pricing")}
                      >
                        <Plus aria-hidden="true" /> Criar primeira ficha
                      </button>
                    }
                  />
                </div>
              )}
              <div className="info-banner">
                <span>
                  <Package size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    Controle de estoque de produtos chega na próxima etapa.
                  </strong>
                  <p>
                    Por enquanto, esta área guarda fichas técnicas e preços.
                    Nenhuma produção ou venda é registrada.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === "coming" && (
            <div className="coming-page">
              <span className="eyebrow">PRÓXIMA ETAPA</span>
              <div className="coming-icon">
                <Sparkles size={34} aria-hidden="true" />
              </div>
              <h1>{comingName}</h1>
              <p>
                Este módulo está no roteiro de evolução do NEAR CREATION 3D.
                Nesta versão, foque em materiais, custos e precificação.
              </p>
              <button
                className="button button-primary"
                onClick={() => go("dashboard")}
              >
                Voltar ao dashboard <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Fechar aviso">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
