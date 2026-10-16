
const Transaction = require("./models/Transaction");
const Product = require("./models/Product");
const Expense = require("./models/Expense");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const branchRoutes = require('./routes/branches');
const {
  requireAuth,
  allowRoles,
} = require("./middleware/authMiddleware");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// AUTENTIKASI
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);

// =========================
// HALAMAN UTAMA & HEALTH
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Backend Cafe POS berhasil berjalan!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    server: "aktif",
    database:
      mongoose.connection.readyState === 1
        ? "terhubung"
        : "belum terhubung",
  });
});

// =========================
// PRODUK
// =========================

// Admin dan kasir yang sudah login dapat melihat produk.
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    console.error("Gagal mengambil produk:", error);

    res.status(500).json({
      message: "Gagal mengambil produk",
    });
  }
});

// Hanya admin yang dapat menambah produk.
app.post(
  "/api/products",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const {
        name,
        category,
        price,
        stock,
        description,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof category !== "string" ||
        !category.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Number.isInteger(Number(stock ?? 0)) ||
        Number(stock ?? 0) < 0
      ) {
        return res.status(400).json({
          message:
            "Periksa nama, kategori, harga, dan stok produk",
        });
      }

      const product = await Product.create({
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        stock: Number(stock ?? 0),
        description,
      });

      res.status(201).json({
        message: "Produk berhasil ditambahkan",
        product,
      });
    } catch (error) {
      console.error("Gagal menambahkan produk:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      res.status(500).json({
        message: "Gagal menambahkan produk",
      });
    }
  }
);

// Hanya admin yang dapat mengubah produk.
app.put(
  "/api/products/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const {
        name,
        category,
        price,
        stock,
        description,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof category !== "string" ||
        !category.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Number.isInteger(Number(stock)) ||
        Number(stock) < 0
      ) {
        return res.status(400).json({
          message:
            "Periksa nama, kategori, harga, dan stok produk",
        });
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          stock: Number(stock),
          description: description || "",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!product) {
        return res.status(404).json({
          message: "Produk tidak ditemukan",
        });
      }

      res.json({
        message: "Produk berhasil diperbarui",
        product,
      });
    } catch (error) {
      console.error("Gagal memperbarui produk:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "ID produk tidak valid",
        });
      }

      res.status(500).json({
        message: "Gagal memperbarui produk",
      });
    }
  }
);

// Hanya admin yang dapat menghapus produk.
app.delete(
  "/api/products/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(
        req.params.id
      );

      if (!product) {
        return res.status(404).json({
          message: "Produk tidak ditemukan",
        });
      }

      res.json({
        message: "Produk berhasil dihapus",
      });
    } catch (error) {
      console.error("Gagal menghapus produk:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "ID produk tidak valid",
        });
      }

      res.status(500).json({
        message: "Gagal menghapus produk",
      });
    }
  }
);

// =========================
// TRANSAKSI
// =========================

// Admin dan kasir yang sudah login dapat melihat transaksi.
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({
      createdAt: -1,
    });

    res.json(transactions);
  } catch (error) {
    console.error(
      "Gagal mengambil riwayat transaksi:",
      error
    );

    res.status(500).json({
      message: "Gagal mengambil riwayat transaksi.",
    });
  }
});

// Admin dan kasir yang sudah login dapat melakukan transaksi.
app.post("/api/transactions", requireAuth, async (req, res) => {
  const { customer, items, payment } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Keranjang masih kosong.",
    });
  }

  const paid = Number(payment);

  if (!Number.isFinite(paid) || paid < 0) {
    return res.status(400).json({
      message: "Nominal pembayaran tidak valid.",
    });
  }

  const quantities = new Map();

  for (const item of items) {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity);

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        message: "Data produk atau jumlah barang tidak valid.",
      });
    }

    quantities.set(
      productId,
      (quantities.get(productId) || 0) + quantity
    );
  }

  let session;

  try {
    session = await mongoose.startSession();

    let savedTransaction;

    await session.withTransaction(async () => {
      const productIds = [...quantities.keys()];

      const products = await Product.find({
        _id: { $in: productIds },
      }).session(session);

      if (products.length !== productIds.length) {
        throw new Error("Ada produk yang tidak ditemukan.");
      }

      const transactionItems = products.map((product) => {
        const quantity = quantities.get(
          product._id.toString()
        );

        if (product.stock < quantity) {
          throw new Error(
            `Stok ${product.name} tidak mencukupi. Stok tersedia: ${product.stock}.`
          );
        }

        return {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity,
          subtotal: product.price * quantity,
        };
      });

      const total = transactionItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      if (paid < total) {
        throw new Error("Uang pembayaran kurang.");
      }

      // Kurangi stok dalam transaksi database.
      for (const item of transactionItems) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stock: { $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedProduct) {
          throw new Error(
            `Stok ${item.name} berubah. Silakan coba lagi.`
          );
        }
      }

      const created = await Transaction.create(
        [
          {
            customer:
              String(customer || "").trim() ||
              "Pelanggan Umum",
            items: transactionItems,
            total,
            payment: paid,
            change: paid - total,
            status: "Selesai",
          },
        ],
        { session }
      );

      savedTransaction = created[0];
    });

    res.status(201).json({
      message: "Transaksi berhasil disimpan.",
      transaction: savedTransaction,
    });
  } catch (error) {
    console.error("Gagal menyimpan transaksi:", error);

    res.status(400).json({
      message:
        error.message || "Transaksi gagal disimpan.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// =========================
// PENGELUARAN
// HANYA ADMIN
// =========================

const validExpenseCategories = [
  "Bahan Baku",
  "Operasional",
  "Gaji",
  "Peralatan",
  "Listrik & Air",
  "Lainnya",
];

// Lihat daftar pengeluaran.
app.get(
  "/api/expenses",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const expenses = await Expense.find().sort({
        date: -1,
        createdAt: -1,
      });

      res.json(expenses);
    } catch (error) {
      console.error(
        "Gagal mengambil pengeluaran:",
        error
      );

      res.status(500).json({
        message: "Gagal mengambil data pengeluaran.",
      });
    }
  }
);

// Tambah pengeluaran.
app.post(
  "/api/expenses",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const {
        title,
        category,
        amount,
        date,
        note,
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        !validExpenseCategories.includes(category) ||
        amount === undefined ||
        amount === null ||
        amount === "" ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) < 1
      ) {
        return res.status(400).json({
          message:
            "Periksa nama, kategori, dan nominal pengeluaran.",
        });
      }

      const expenseDate = date
        ? new Date(date)
        : new Date();

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          message: "Tanggal pengeluaran tidak valid.",
        });
      }

      const expense = await Expense.create({
        title: title.trim(),
        category,
        amount: Number(amount),
        date: expenseDate,
        note: typeof note === "string" ? note.trim() : "",
      });

      res.status(201).json({
        message: "Pengeluaran berhasil ditambahkan.",
        expense,
      });
    } catch (error) {
      console.error(
        "Gagal menambahkan pengeluaran:",
        error
      );

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      res.status(500).json({
        message: "Gagal menambahkan pengeluaran.",
      });
    }
  }
);

// Edit pengeluaran.
app.put(
  "/api/expenses/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const {
        title,
        category,
        amount,
        date,
        note,
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        !validExpenseCategories.includes(category) ||
        amount === undefined ||
        amount === null ||
        amount === "" ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) < 1
      ) {
        return res.status(400).json({
          message:
            "Periksa nama, kategori, dan nominal pengeluaran.",
        });
      }

      const expenseDate = date
        ? new Date(date)
        : new Date();

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          message: "Tanggal pengeluaran tidak valid.",
        });
      }

      const expense = await Expense.findByIdAndUpdate(
        req.params.id,
        {
          title: title.trim(),
          category,
          amount: Number(amount),
          date: expenseDate,
          note: typeof note === "string" ? note.trim() : "",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!expense) {
        return res.status(404).json({
          message: "Pengeluaran tidak ditemukan.",
        });
      }

      res.json({
        message: "Pengeluaran berhasil diperbarui.",
        expense,
      });
    } catch (error) {
      console.error(
        "Gagal memperbarui pengeluaran:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "ID pengeluaran tidak valid.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      res.status(500).json({
        message: "Gagal memperbarui pengeluaran.",
      });
    }
  }
);

// Hapus pengeluaran.
app.delete(
  "/api/expenses/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const expense = await Expense.findByIdAndDelete(
        req.params.id
      );

      if (!expense) {
        return res.status(404).json({
          message: "Pengeluaran tidak ditemukan.",
        });
      }

      res.json({
        message: "Pengeluaran berhasil dihapus.",
      });
    } catch (error) {
      console.error(
        "Gagal menghapus pengeluaran:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "ID pengeluaran tidak valid.",
        });
      }

      res.status(500).json({
        message: "Gagal menghapus pengeluaran.",
      });
    }
  }
);

// =========================
// MENJALANKAN SERVER
// =========================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI belum diatur di file .env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Atlas berhasil terhubung!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server berjalan di port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Gagal menjalankan backend:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
