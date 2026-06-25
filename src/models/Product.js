const mongoose = require('mongoose');
const { deleteFromCloudinary } = require('../utils/cloudinary');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    brand: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },
    tags: [{ type: String, trim: true }],
    keyFeatures: [{ type: String, trim: true }],
    specifications: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    weight: {
      value: { type: Number },
      unit: { type: String, enum: ['g', 'kg', 'lb', 'oz'], default: 'kg' },
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, enum: ['cm', 'mm', 'in'], default: 'cm' },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.pre('deleteOne', { document: true, query: false }, async function () {
  if (this.images && this.images.length > 0) {
    await Promise.all(this.images.map((img) => deleteFromCloudinary(img.publicId)));
  }
});

productSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.images && doc.images.length > 0) {
    await Promise.all(doc.images.map((img) => deleteFromCloudinary(img.publicId)));
  }
});

module.exports = mongoose.model('Product', productSchema);
