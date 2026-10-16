const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Bahan Baku', 'Operasional', 'Gaji', 'Peralatan', 'Listrik & Air', 'Lainnya'],
      default: 'Lainnya',
    },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Expense', expenseSchema)
