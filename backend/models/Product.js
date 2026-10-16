
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama produk wajib diisi"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Kategori wajib diisi"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Harga wajib diisi"],
      min: [0, "Harga tidak boleh negatif"],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stok tidak boleh negatif"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
