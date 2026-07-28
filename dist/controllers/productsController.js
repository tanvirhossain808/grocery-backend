import { prisma } from "../config/prisma.js";
/* get /api/products/fleas-deals */
export const getFlashDeals = async (req, res) => {
    const products = await prisma.product.findMany({
        where: { stock: { gt: 0 } },
        orderBy: { originalPrice: "desc" },
    });
    const productWithDiscount = products.map((p) => {
        const discount = p.originalPrice && p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : 0;
        return { ...p, discount };
    });
    res.json({ products: productWithDiscount.slice(0, 8) });
};
/* get /api/products/products */
export const getProducts = async (req, res) => {
    const { category, sort, search, minPrice, maxPrice } = req.query;
    const where = {};
    if (category && category !== "all")
        where.category = category;
    if (search)
        where.name = { contains: search, mode: "insensitive" };
    if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice)
            where.price.gte = Number(minPrice);
        if (maxPrice)
            where.price.lte = Number(maxPrice);
    }
    const orderBy = {};
    if (sort === "price-low")
        orderBy.price = "asc";
    else if (sort === "price-high")
        orderBy.price = "desc";
    else
        orderBy.createdAt = "desc";
    const products = await prisma.product.findMany({ where, orderBy });
    const productWithDiscount = products.map((p) => {
        const discount = p.originalPrice && p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : 0;
        return { ...p, discount };
    });
    res.json({ products: productWithDiscount });
};
/* get /api/products/:id */
export const getProduct = async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: req.query.id },
    });
    if (!product)
        return res.status(404).json({ message: "Product not found" });
    const discount = product.originalPrice && product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) *
            100)
        : 0;
    return res.json({ ...product, discount });
};
/* post /api/products */
export const createProducts = async (req, res) => {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json({ product });
};
/* put /api/products/:id */
export const updateProducts = async (req, res) => {
    const product = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
    });
    res.json({ product });
};
/* delete /api/products/:id */
export const deleteProducts = async (req, res) => {
    await prisma.product.delete({
        where: { id: req.params.id },
    });
    res.json({ message: "Deleted" });
};
