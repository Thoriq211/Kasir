
const mongoose = require('mongoose')

const transactionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
})

const transactionSchema = new mongoose.Schema(
  {
    customer: {
      type: String,
      trim: true,
      default: 'Pelanggan Umum',
    },
    items: {
      type: [transactionItemSchema],
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    payment: {
      type: Number,
      required: true,
      min: 0,
    },
    change: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Selesai'],
      default: 'Selesai',
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Transaction', transactionSchema)
