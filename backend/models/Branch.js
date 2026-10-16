
const mongoose = require('mongoose')

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 250,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Branch', branchSchema)
