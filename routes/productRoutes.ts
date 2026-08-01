import express from "express";
import {
  createProducts,
  deleteProducts,
  getFlashDeals,
  getProducts,
  updateProducts,
  getProduct,
} from "../controllers/productsController.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const productRouters = express.Router();
productRouters.get("/flash-deals", getFlashDeals);
productRouters.get("/", getProducts);
productRouters.get("/:id", getProduct);
productRouters.post("/", auth, admin, createProducts);
productRouters.put("/:id", auth, admin, updateProducts);
productRouters.delete("/:id", auth, admin, deleteProducts);

export default productRouters;
