import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },

    images: [
      {
        url: { type: String, required: true }, // can store Cloudinary or local URL
        alt: { type: String, default: "" },
      },
    ],

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Generate slug automatically
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/ /g, "-");
  }
  next();
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
