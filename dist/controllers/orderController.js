//Create Order
//POST /api/orders
import { prisma } from "../config/prisma.js";
import { inngest } from "../inngest/index.js";
export const createOrder = async (req, res) => {
    const { items, shippingAddress, paymentMethod } = req.body;
    //check if order items are empty
    if (!items || items.length === 0)
        return res.status(400).json({ message: "Nor order items" });
    //look up actual price from the database
    const productsIds = items.map((i) => i.product);
    const products = await prisma.product.findMany({
        where: { id: { in: productsIds } },
    });
    const productMap = {};
    products.forEach((p) => (productMap[p.id] = p));
    for (const item of items) {
        const product = productMap[item.product];
        if (!product || (product.stock ?? 0) < item.quantity) {
            return res.status(400).json({ message: "Product out of stock" });
        }
    }
    const ordersItems = items.map((item) => {
        const dbProduct = productMap[item.product];
        if (!dbProduct)
            throw new Error(`product ${item.product} not found`);
        return {
            product: dbProduct.id,
            name: dbProduct.name,
            image: dbProduct.image,
            price: dbProduct.price,
            quantity: item.quantity,
            unit: dbProduct.unit,
        };
    });
    const subtotal = ordersItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal > 20 ? 0 : 20;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
    const order = await prisma.order.create({
        data: {
            userId: req.user?.id,
            items: ordersItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            deliveryFee,
            tax,
            total,
            statusHistory: [
                {
                    status: "Placed",
                    note: "Order placed successfully",
                    timeStamp: new Date(),
                },
            ],
        },
    });
    if (paymentMethod === "card") {
        //stripe payment
    }
    //check product is in stock
    res.json({ order });
    //decrease stock
    for (const item of ordersItems) {
        await prisma.product.update({
            where: { id: item.product },
            data: { stock: { decrement: item.quantity } },
        });
    }
    for (const item of ordersItems) {
        await inngest.send({
            name: "inventory/stock.updated",
            data: { productId: item.product },
        });
    }
    await inngest.send({ name: "/order/placed", data: { orderId: order.id } });
    //send stock update events for each product in  the order
};
//get user order data
//get api/orders
export const getUserOrders = async (req, res) => {
    const { status } = req.query;
    const where = {
        userId: req.user?.id,
        NOT: [{ paymentMethod: "card", isPaid: false }],
    };
    if (status && status !== "all") {
        where.status = status;
    }
    const orders = await prisma.order.findMany({
        where,
        include: { deliveryPartner: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
};
//get single order data
//get /api/orders/:id
export const getOrder = async (req, res) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id, userId: req.user?.id },
        include: {
            deliveryPartner: {
                select: { name: true, phone: true, avatar: true, vehicleType: true },
            },
        },
    });
    if (!order)
        return res.status(400).json({ message: "Order not found" });
    res.json(order);
};
//update order status
//put /api/order/:id/status
export const updateOrderStatus = async (req, res) => {
    const { status, note } = req.body;
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
    });
    if (!order)
        return res.json(404).json({ message: "Order not found" });
    const history = Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [];
    history.push({
        status,
        note: note || `Order ${status.tolowerCase()}`,
        timeStamp: new Date(),
    });
    const updateOrder = await prisma.order.update({
        where: { id: req.params.id },
        data: { status, statusHistory: history },
    });
    res.json({ order: updateOrder });
};
/* Get all orders (admin) */
//get /api/orders/all
export const getAllOrders = async (req, res) => {
    const orders = await prisma.order.findMany({
        where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
        include: {
            deliveryPartner: { select: { name: true, phone: true, email: true } },
            user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
};
/* get order location */
// /api/orders/:id/location
export const getOrderLocation = async (req, res) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id, userId: req.user?.id },
        select: { liveLocation: true, status: true },
    });
    if (!order)
        return res.status(400).json({ message: "Order not found" });
    res.json({ liveLocation: order.liveLocation, status: order.status });
};
