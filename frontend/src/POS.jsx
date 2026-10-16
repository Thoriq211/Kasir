import { useEffect, useMemo, useState } from "react";



const PRODUCTS_URL = "http://localhost:5000/api/products";



const money = (value) =>

  new Intl.NumberFormat("id-ID", {

    style: "currency",

    currency: "IDR",

    maximumFractionDigits: 0,

  }).format(value);



const styles = {

  page: {

    padding: "28px",

    background: "#f7f9f7",

    minHeight: "100vh",

    color: "#18352c",

    fontFamily: "Arial, sans-serif",

  },

  button: {

    border: 0,

    borderRadius: 8,

    padding: "11px 14px",

    cursor: "pointer",

    fontWeight: 600,

  },

  card: {

    background: "#fff",

    border: "1px solid #e5ebe7",

    borderRadius: 14,

    padding: 20,

  },

  input: {

    width: "100%",

    padding: 11,

    border: "1px solid #d7e0da",

    borderRadius: 8,

    boxSizing: "border-box",

    fontSize: 14,

  },

};



export default function POS() {

  const [products, setProducts] = useState([]);

  const [cart, setCart] = useState([]);

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("Semua");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [payment, setPayment] = useState("");

  const [customer, setCustomer] = useState("");

  const [processing, setProcessing] = useState(false);

  const [receipt, setReceipt] = useState(null);



  async function loadProducts() {

    setLoading(true);

    setError("");



    try {

      const token = sessionStorage.getItem("nook_token");
      const response = await fetch(PRODUCTS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal mengambil produk.");



      const data = await response.json();

      setProducts(data);

    } catch {

      setError(

        "Produk gagal dimuat. Pastikan backend dan MongoDB Atlas aktif."

      );

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    loadProducts();

  }, []);



  const categories = useMemo(

    () => ["Semua", ...new Set(products.map((p) => p.category))],

    [products]

  );



  const filteredProducts = products.filter((product) => {

    const matchesSearch = product.name

      .toLowerCase()

      .includes(search.toLowerCase());



    const matchesCategory =

      category === "Semua" || product.category === category;

    return matchesSearch && matchesCategory;

  });



  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const total = cart.reduce(

    (sum, item) => sum + item.price * item.quantity,

    0

  );

  const change = Number(payment || 0) - total;



  function addToCart(product) {

    if (product.stock <= 0) {

      setError(`${product.name} sedang habis.`);

      return;

    }



    setError("");



    setCart((current) => {

      const existing = current.find((item) => item._id === product._id);



      if (existing) {

        if (existing.quantity >= product.stock) {

          setError(`Stok ${product.name} tidak mencukupi.`);

          return current;

        }



        return current.map((item) =>

          item._id === product._id

            ? { ...item, quantity: item.quantity + 1 }

            : item

        );

      }



      return [

        ...current,

        {

          _id: product._id,

          name: product.name,

          price: product.price,

          stock: product.stock,

          quantity: 1,

        },

      ];

    });

  }



  function changeQuantity(id, amount) {

    setError("");



    setCart((current) =>

      current

        .map((item) => {

          if (item._id !== id) return item;



          const product = products.find((p) => p._id === id);

          const nextQuantity = item.quantity + amount;



          if (nextQuantity > (product?.stock ?? 0)) {

            setError(`Stok ${item.name} tidak mencukupi.`);

            return item;

          }



          return { ...item, quantity: nextQuantity };

        })

        .filter((item) => item.quantity > 0)

    );

  }



const checkout = async () => {

  if (cart.length === 0) {

    alert("Keranjang masih kosong.");

    return;

  }



  const paymentAmount = Number(payment);

  if (!Number.isFinite(paymentAmount) || paymentAmount < total) {

    alert("Nominal pembayaran kurang.");

    return;

  }



  setProcessing(true);

  setError("");



  try {

    const response = await fetch("http://localhost:5000/api/transactions", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        customer: customer.trim() || "Pelanggan Umum",

        items: cart.map((item) => ({

          productId: item._id,

          quantity: item.quantity,

        })),

        payment: paymentAmount,

      }),

    });



    const data = await response.json();

    if (!response.ok) {

      throw new Error(data.message || "Transaksi gagal disimpan.");

    }



    // Simpan detail transaksi terakhir agar bisa dicetak sebagai struk.

    setReceipt(data.transaction);

    setCart([]);

    setPayment("");

    setCustomer("");



    const productsResponse = await fetch(PRODUCTS_URL, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("nook_token")}`,
      },
    });

    if (productsResponse.ok) {

      setProducts(await productsResponse.json());

    }

  } catch (error) {

    alert(error.message || "Terjadi kesalahan saat checkout.");

  } finally {

    setProcessing(false);

  }

};



const escapeHtml = (value) =>

  String(value ?? "").replace(/[&<>"']/g, (character) => ({

    "&": "&amp;",

    "<": "&lt;",

    ">": "&gt;",

    '"': "&quot;",

    "'": "&#39;",

  })[character]);



const printReceipt = (transaction) => {

  if (!transaction) return;



  const transactionId = String(transaction._id || "").slice(-8).toUpperCase();

  const transactionDate = transaction.createdAt

    ? new Date(transaction.createdAt).toLocaleString("id-ID")

    : new Date().toLocaleString("id-ID");

  const itemRows = (transaction.items || []).map((item) => `

    <tr>

      <td>${escapeHtml(item.name)}<br><small>${Number(item.quantity) || 0} x ${money(Number(item.price) || 0)}</small></td>

      <td class="right">${money(Number(item.subtotal) || (Number(item.price) || 0) * (Number(item.quantity) || 0))}</td>

    </tr>`).join("");



  const receiptWindow = window.open("", "_blank", "width=420,height=700");

  if (!receiptWindow) {

    alert("Popup diblokir browser. Izinkan popup untuk mencetak struk.");

    return;

  }



  receiptWindow.document.write(`<!doctype html>

  <html lang="id"><head><meta charset="utf-8"><title>Struk nook. #${escapeHtml(transactionId)}</title>

  <style>

    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;width:320px;margin:20px auto;font-size:12px}

    h1{font-size:24px;margin:0;text-align:center;letter-spacing:1px}p{text-align:center;margin:5px 0}

    .line{border-top:1px dashed #555;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:6px 0;vertical-align:top}

    .right{text-align:right;white-space:nowrap}.total{font-size:15px;font-weight:bold}.meta{line-height:1.6}

    .footer{margin-top:18px;text-align:center;line-height:1.5}

    @media print{body{margin:0 auto;width:100%;padding:0 8px}@page{size:80mm auto;margin:5mm}}

  </style></head><body>

    <h1>nook.</h1><p>Cafe Management</p><div class="line"></div>

    <div class="meta">No. Transaksi: #${escapeHtml(transactionId)}<br>Tanggal: ${escapeHtml(transactionDate)}<br>Pelanggan: ${escapeHtml(transaction.customer || "Pelanggan Umum")}</div>

    <div class="line"></div><table>${itemRows}</table><div class="line"></div>

    <table>

      <tr><td>Total</td><td class="right total">${money(Number(transaction.total) || 0)}</td></tr>

      <tr><td>Uang diterima</td><td class="right">${money(Number(transaction.payment) || 0)}</td></tr>

      <tr><td>Kembalian</td><td class="right">${money(Number(transaction.change) || 0)}</td></tr>

    </table><div class="line"></div>

    <div class="footer">Terima kasih telah berkunjung!<br>Semoga harimu menyenangkan ☕</div>

    <script>window.onload=()=>{window.print();};<\/script>

  </body></html>`);

  receiptWindow.document.close();

};



  return (

    <main style={styles.page}>

      <header

        style={{

          display: "flex",

          justifyContent: "space-between",

          gap: 16,

          alignItems: "center",

          flexWrap: "wrap",

          marginBottom: 24,

        }}

      >

        <div>

          <p style={{ color: "#718078", margin: "0 0 8px" }}>

            POINT OF SALE

          </p>

          <h1 style={{ margin: 0 }}>Transaksi Kasir</h1>

          <p style={{ color: "#718078" }}>

            Pilih produk dan susun pesanan pelanggan.

          </p>

        </div>



        <button

          style={{

            ...styles.button,

            background: "#eaf1ed",

            color: "#174d3b",

          }}

          onClick={loadProducts}

          disabled={loading}

        >

          Muat Ulang Produk

        </button>

      </header>



      {error && (

        <p

          role="alert"

          style={{

            background: "#fff0ee",

            color: "#b42318",

            padding: 12,

            borderRadius: 8,

          }}

        >

          {error}

        </p>

      )}



      <div

        style={{

          display: "grid",

          gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 1fr)",

          gap: 20,

          alignItems: "start",

        }}

      >

        <section style={styles.card}>

          <h2 style={{ marginTop: 0 }}>Pilih Produk</h2>



          <input

            style={styles.input}

            value={search}

            onChange={(event) => setSearch(event.target.value)}

            placeholder="Cari nama produk..."

          />



          <div

            style={{

              display: "flex",

              gap: 8,

              flexWrap: "wrap",

              margin: "14px 0 20px",

            }}

          >

            {categories.map((item) => (

              <button

                key={item}

                style={{

                  ...styles.button,

                  background: category === item ? "#174d3b" : "#eaf1ed",

                  color: category === item ? "#fff" : "#174d3b",

                }}

                onClick={() => setCategory(item)}

              >

                {item}

              </button>

            ))}

          </div>



          {loading ? (

            <p>Memuat produk dari database...</p>

          ) : filteredProducts.length === 0 ? (

            <p>Produk tidak ditemukan. Tambahkan produk melalui Menu & Produk.</p>

          ) : (

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",

                gap: 12,

              }}

            >

              {filteredProducts.map((product) => (



                <button

                  key={product._id}

                  onClick={() => addToCart(product)}

                  disabled={product.stock <= 0}

                  style={{

                    textAlign: "left",

                    padding: 15,

                    borderRadius: 12,

                    border: "1px solid #e5ebe7",

                    background: product.stock > 0 ? "#fff" : "#f1f3f1",

                    color: "#18352c",

                    cursor: product.stock > 0 ? "pointer" : "not-allowed",

                    opacity: product.stock > 0 ? 1 : 0.6,

                  }}

                >

                  <div style={{ fontSize: 13, color: "#718078" }}>

                    {product.category}

                  </div>

                  <strong

                    style={{

                      display: "block",

                      margin: "12px 0 8px",

                      overflowWrap: "anywhere",

                    }}

                  >

                    {product.name}

                  </strong>

                  <div style={{ fontWeight: 700 }}>

                    {money(product.price)}

                  </div>

                  <small style={{ color: "#718078" }}>

                    Stok: {product.stock}

                  </small>

                </button>

              ))}

            </div>

          )}

        </section>



        <section style={styles.card}>

          <h2 style={{ marginTop: 0 }}>Keranjang Pesanan</h2>

          <p style={{ color: "#718078" }}>

            {totalItems} item · {cart.length} jenis produk

          </p>



          {cart.length === 0 ? (

            <p style={{ color: "#718078" }}>

              Belum ada produk. Klik produk di sebelah kiri untuk menambahkan.

            </p>

          ) : (

            <div>

              {cart.map((item) => (

                <div

                  key={item._id}

                  style={{

                    padding: "14px 0",

                    borderBottom: "1px solid #edf0ed",

                  }}

                >

                  <strong>{item.name}</strong>

                  <div style={{ color: "#718078", margin: "5px 0 10px" }}>

                    {money(item.price)} × {item.quantity}

                  </div>



                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "center",

                      gap: 8,

                    }}

                  >

                    <div style={{ display: "flex", gap: 8 }}>

                      <button

                        style={styles.button}

                        onClick={() => changeQuantity(item._id, -1)}

                      >

                        −

                      </button>

                      <span style={{ alignSelf: "center" }}>

                        {item.quantity}

                      </span>

                      <button

                        style={styles.button}

                        disabled={item.quantity >= item.stock}

                        onClick={() => changeQuantity(item._id, 1)}

                      >

                        +

                      </button>

                    </div>

                    <strong>{money(item.price * item.quantity)}</strong>

                  </div>

                </div>

              ))}

            </div>

          )}



          <div style={{ marginTop: 20 }}>

            <label

              style={{

                display: "block",

                fontSize: 14,

                fontWeight: 600,

                marginBottom: 7,

              }}

            >

              Nama pelanggan (opsional)

            </label>



            <input

              style={styles.input}

              value={customer}

              onChange={(event) => setCustomer(event.target.value)}

              placeholder="Nama pelanggan"

            />

          </div>



          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              margin: "20px 0",

              fontSize: 20,

            }}

          >

            <strong>Total</strong>

            <strong>{money(total)}</strong>

          </div>



          <label

            style={{

              display: "block",

              fontSize: 14,

              fontWeight: 600,

              marginBottom: 7,

            }}

          >

            Uang diterima (Rp)

          </label>



          <input

            style={styles.input}

            type="number"

            min="0"

            step="1"

            value={payment}

            onChange={(event) => setPayment(event.target.value)}

            placeholder="Masukkan nominal pembayaran"

          />



          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              margin: "16px 0 20px",

            }}

          >

            <span>Kembalian</span>

            <strong style={{ color: change >= 0 ? "#167447" : "#b42318" }}>

              {money(Math.max(0, change))}

            </strong>

          </div>



          <button

            style={{

              ...styles.button,

              width: "100%",

              background: "#174d3b",

              color: "#fff",

              opacity: processing ? 0.6 : 1,

            }}

            onClick={checkout}

            disabled={processing || cart.length === 0}

          >

            Proses Pembayaran

          </button>

          <p style={{ color: "#718078", fontSize: 12, lineHeight: 1.5 }}>

            Transaksi akan disimpan ke database dan stok diperbarui setelah pembayaran berhasil.

          </p>



          {receipt && (

            <div style={{ marginTop: 18, padding: 14, border: "1px solid #d7e0da", borderRadius: 10, background: "#f7f9f7" }}>

              <strong style={{ display: "block", marginBottom: 6 }}>Pembayaran berhasil!</strong>

              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#718078" }}>

                Struk transaksi #{String(receipt._id || "").slice(-8).toUpperCase()} siap dicetak.

              </p>

              <button

                type="button"

                style={{ ...styles.button, width: "100%", background: "#eaf1ed", color: "#174d3b" }}

                onClick={() => printReceipt(receipt)}

              >

                Cetak Struk / Simpan PDF

              </button>

            </div>

          )}

        </section>

      </div>

    </main>

  );

}