import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/products";
const LOW_STOCK_LIMIT = 5;

const initialForm = {
  name: "",
  category: "Coffee",
  price: "",
  stock: "0",
  description: "",
};

const styles = {
  page: { padding: "32px", color: "#18352c", fontFamily: "Arial, sans-serif", background: "#f7f9f7", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" },
  button: { background: "#174d3b", color: "white", border: "none", padding: "11px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 700 },
  card: { background: "white", padding: "24px", borderRadius: "14px", border: "1px solid #e5ebe7", marginBottom: "20px" },
  input: { width: "100%", padding: "11px", border: "1px solid #d7e0da", borderRadius: "8px", boxSizing: "border-box", marginTop: "7px", fontSize: "14px", background: "#fff" },
  label: { display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "16px" },
  th: { padding: "14px 10px", borderBottom: "1px solid #e5ebe7", color: "#718078", fontSize: "12px", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "14px 10px", borderBottom: "1px solid #edf0ed", verticalAlign: "middle" },
  stat: { background: "#fff", border: "1px solid #e5ebe7", borderRadius: 12, padding: 18 },
};

function getStockStatus(stock) {
  const quantity = Number(stock) || 0;
  if (quantity <= 0) return { label: "Habis", color: "#b42318", background: "#fef3f2" };
  if (quantity <= LOW_STOCK_LIMIT) return { label: "Menipis", color: "#b54708", background: "#fffaeb" };
  return { label: "Tersedia", color: "#167447", background: "#ecfdf3" };
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("Semua");
  const [restockAmounts, setRestockAmounts] = useState({});
  const [restockingId, setRestockingId] = useState(null);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("nook_token");
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Gagal mengambil data produk.");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Format data produk dari backend tidak sesuai.");
      setProducts(data);
    } catch (err) {
      setError(err.message || "Tidak bisa mengambil produk. Pastikan backend berjalan di port 5000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("nook_token")}`,
        },
        body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal menyimpan produk.");
      const wasEditing = Boolean(editingId);
      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);
      setNotice(wasEditing ? "Produk berhasil diperbarui!" : "Produk berhasil ditambahkan!");
      await loadProducts();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(product) {
    setEditingId(product._id);
    setForm({ name: product.name || "", category: product.category || "Coffee", price: String(product.price ?? ""), stock: String(product.stock ?? 0), description: product.description || "" });
    setShowForm(true);
    setError("");
    setNotice("");
  }

  async function handleRestock(product) {
    const amount = Number(restockAmounts[product._id] || 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Masukkan jumlah restock berupa bilangan bulat lebih dari 0.");
      setNotice("");
      return;
    }

    setRestockingId(product._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/${product._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("nook_token")}`,
        },
        body: JSON.stringify({
          name: product.name,
          category: product.category,
          price: Number(product.price),
          stock: (Number(product.stock) || 0) + amount,
          description: product.description || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal memperbarui stok.");
      setRestockAmounts((current) => ({ ...current, [product._id]: "" }));
      setNotice(`Stok ${product.name} berhasil ditambah ${amount} unit.`);
      await loadProducts();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menambah stok.");
    } finally {
      setRestockingId(null);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Yakin ingin menghapus produk "${product.name}"?`)) return;
    setDeletingId(product._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/${product._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("nook_token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal menghapus produk.");
      setNotice("Produk berhasil dihapus.");
      await loadProducts();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menghapus produk.");
    } finally {
      setDeletingId(null);
    }
  }

  function exportProductsCsv() {
    const rows = [
      ["Nama Produk", "Kategori", "Harga", "Stok", "Status Stok", "Deskripsi"],
      ...filteredProducts.map((product) => [
        product.name || "",
        product.category || "",
        Number(product.price) || 0,
        Number(product.stock) || 0,
        getStockStatus(product.stock).label,
        product.description || "",
      ]),
    ];
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventaris-nook-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const rupiah = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);

  const summary = useMemo(() => ({
    total: products.length,
    out: products.filter((product) => Number(product.stock) <= 0).length,
    low: products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= LOW_STOCK_LIMIT).length,
    available: products.filter((product) => Number(product.stock) > LOW_STOCK_LIMIT).length,
  }), [products]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name || ""} ${product.category || ""}`.toLowerCase().includes(search.toLowerCase().trim());
    const quantity = Number(product.stock) || 0;
    const matchesStock = stockFilter === "Semua" || (stockFilter === "Habis" && quantity <= 0) || (stockFilter === "Menipis" && quantity > 0 && quantity <= LOW_STOCK_LIMIT) || (stockFilter === "Tersedia" && quantity > LOW_STOCK_LIMIT);
    return matchesSearch && matchesStock;
  }), [products, search, stockFilter]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={{ color: "#718078", margin: "0 0 8px", letterSpacing: 1, fontSize: 12, fontWeight: 700 }}>INVENTORY MANAGEMENT</p>
          <h1 style={{ margin: 0, fontSize: 28 }}>Manajemen Produk</h1>
          <p style={{ color: "#718078", marginBottom: 0 }}>Kelola produk, harga, kategori, dan pantau stok cafe.</p>
        </div>
        <button type="button" style={styles.button} onClick={() => { setShowForm((current) => !current); setError(""); setNotice(""); }}>
          {showForm ? "Tutup Form" : "+ Tambah Produk"}
        </button>
      </header>

      {notice && <p role="status" style={{ color: "#167447", background: "#ecfdf3", padding: 12, borderRadius: 8 }}>{notice}</p>}
      {error && <p role="alert" style={{ color: "#b42318", background: "#fef3f2", padding: 12, borderRadius: 8 }}>{error}</p>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={styles.stat}><p style={{ margin: 0, color: "#718078", fontSize: 13 }}>Total Produk</p><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{summary.total}</strong></div>
        <div style={styles.stat}><p style={{ margin: 0, color: "#b54708", fontSize: 13 }}>Stok Menipis (≤ {LOW_STOCK_LIMIT})</p><strong style={{ display: "block", fontSize: 28, marginTop: 8, color: "#b54708" }}>{summary.low}</strong></div>
        <div style={styles.stat}><p style={{ margin: 0, color: "#b42318", fontSize: 13 }}>Stok Habis</p><strong style={{ display: "block", fontSize: 28, marginTop: 8, color: "#b42318" }}>{summary.out}</strong></div>
        <div style={styles.stat}><p style={{ margin: 0, color: "#167447", fontSize: 13 }}>Stok Tersedia</p><strong style={{ display: "block", fontSize: 28, marginTop: 8, color: "#167447" }}>{summary.available}</strong></div>
      </section>

      {(summary.low > 0 || summary.out > 0) && (
        <div role="status" style={{ background: "#fffaeb", border: "1px solid #fedf89", color: "#93370d", padding: "14px 16px", borderRadius: 10, marginBottom: 20 }}>
          <strong>Perhatian stok:</strong> {summary.out > 0 ? `${summary.out} produk habis` : ""}{summary.out > 0 && summary.low > 0 ? " dan " : ""}{summary.low > 0 ? `${summary.low} produk stoknya menipis` : ""}. Periksa daftar produk dan lakukan restock bila diperlukan.
        </div>
      )}

      {showForm && (
        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</h2>
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>Nama produk *<input style={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Contoh: Es Kopi Susu" required /></label>
            <label style={styles.label}>Kategori *<select style={styles.input} name="category" value={form.category} onChange={handleChange} required><option value="Coffee">Coffee</option><option value="Non-Coffee">Non-Coffee</option><option value="Food">Food</option><option value="Snack">Snack</option><option value="Other">Lainnya</option></select></label>
            <label style={styles.label}>Harga (Rp) *<input style={styles.input} type="number" name="price" value={form.price} onChange={handleChange} placeholder="Contoh: 18000" min="0" step="1" required /></label>
            <label style={styles.label}>Stok *<input style={styles.input} type="number" name="stock" value={form.stock} onChange={handleChange} min="0" step="1" required /></label>
            <label style={styles.label}>Deskripsi<textarea style={styles.input} name="description" value={form.description} onChange={handleChange} placeholder="Deskripsi produk (opsional)" rows={3} /></label>
            <button type="submit" disabled={saving} style={{ ...styles.button, opacity: saving ? 0.7 : 1 }}>{saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Produk"}</button>
            <button type="button" style={{ ...styles.button, background: "#eaf1ed", color: "#174d3b", marginLeft: 8 }} onClick={() => { setForm(initialForm); setEditingId(null); setShowForm(false); setError(""); setNotice(""); }}>Batal</button>
          </form>
        </section>
      )}

      <section style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
          <div><h2 style={{ margin: "0 0 6px" }}>Daftar Produk</h2><p style={{ color: "#718078", margin: 0 }}>Menampilkan {filteredProducts.length} dari {products.length} produk</p></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={exportProductsCsv} disabled={filteredProducts.length === 0} style={{ ...styles.button, background: "#eaf1ed", color: "#174d3b", opacity: filteredProducts.length === 0 ? 0.6 : 1 }}>Ekspor CSV</button>
            <button type="button" onClick={loadProducts} disabled={loading} style={{ ...styles.button, background: "#eaf1ed", color: "#174d3b" }}>{loading ? "Memuat..." : "Muat Ulang"}</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}>
          <input aria-label="Cari produk" style={{ ...styles.input, marginTop: 0 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kategori produk..." />
          <select aria-label="Filter status stok" style={{ ...styles.input, marginTop: 0 }} value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="Semua">Semua status stok</option><option value="Habis">Stok habis</option><option value="Menipis">Stok menipis</option><option value="Tersedia">Stok tersedia</option></select>
        </div>

        {loading ? <p>Memuat produk...</p> : products.length === 0 ? <p>Belum ada produk. Klik Tambah Produk untuk memulai.</p> : filteredProducts.length === 0 ? <p>Tidak ada produk yang sesuai dengan pencarian atau filter stok.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead><tr>{["Nama Produk", "Kategori", "Harga", "Stok", "Status Stok", "Aksi"].map((heading) => <th key={heading} style={styles.th}>{heading}</th>)}</tr></thead>
              <tbody>{filteredProducts.map((product) => {
                const status = getStockStatus(product.stock);
                return <tr key={product._id}>
                  <td style={styles.td}><strong>{product.name}</strong>{product.description ? <div style={{ color: "#718078", fontSize: 12, marginTop: 4 }}>{product.description}</div> : null}</td>
                  <td style={styles.td}>{product.category}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{rupiah(product.price)}</td>
                  <td style={styles.td}><strong>{Number(product.stock) || 0}</strong></td>
                  <td style={styles.td}><span style={{ display: "inline-block", padding: "5px 9px", borderRadius: 20, background: status.background, color: status.color, fontWeight: 700, fontSize: 12 }}>{status.label}</span></td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <input
                        aria-label={`Jumlah restock ${product.name}`}
                        type="number"
                        min="1"
                        step="1"
                        value={restockAmounts[product._id] ?? ""}
                        onChange={(event) => setRestockAmounts((current) => ({ ...current, [product._id]: event.target.value }))}
                        placeholder="Qty"
                        style={{ ...styles.input, width: 76, marginTop: 0, padding: "8px" }}
                      />
                      <button type="button" disabled={restockingId === product._id} style={{ ...styles.button, padding: "8px 10px", background: "#eaf1ed", color: "#174d3b", opacity: restockingId === product._id ? 0.7 : 1 }} onClick={() => handleRestock(product)}>{restockingId === product._id ? "..." : "+ Stok"}</button>
                      <button type="button" style={{ ...styles.button, padding: "8px 11px" }} onClick={() => handleEdit(product)}>Edit</button>
                      <button type="button" disabled={deletingId === product._id} style={{ ...styles.button, padding: "8px 11px", background: "#b42318", opacity: deletingId === product._id ? 0.7 : 1 }} onClick={() => handleDelete(product)}>{deletingId === product._id ? "Menghapus..." : "Hapus"}</button>
                    </div>
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
