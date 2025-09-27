import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "Please enter product description"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Please enter product price"],
      min: [0, "Price cannot be negative"],
    },

    category: {
      type: String,
      required: true, // e.g. "Bracelets", "Keychains", etc.
      trim: true,
    },

    images: [
      {
        url: { type: String, required: true }, // can store Cloudinary or local URL
        alt: { type: String, default: "" },
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
      },
    ],


    isBestSeller: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isNewArrival: {
      type: Boolean,
      default: false,
    },


    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      
    },
  },
  { timestamps: true }
);

// Optional: auto-generate slug before save
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/ /g, "-");
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
