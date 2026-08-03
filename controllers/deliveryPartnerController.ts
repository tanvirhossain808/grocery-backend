import { Response, Request } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { updateOrderStatus } from "./orderController.js";
import { timeStamp } from "node:console";
const generateToken = (id: string) => {
  return jwt.sign({ id, role: "delivery" }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};
//Login Delivery partner

//post /api/delivery/login

export const loginPartner = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Please provide email and password" });

  const partner = await prisma.deliveryPartner.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!partner) res.status(401).json({ message: "Invalid email or password" });

  if (!partner?.isActive)
    return res.status(403).json({
      message: "Your account has been deactivated",
    });

  const isMatch = await bcrypt.compare(password, partner.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid email or password" });
  const token = generateToken(partner.id);
  const { password: _, ...partnerData } = partner;

  res.json({ partner: partnerData, token });
};

//get assigned deliveries
//get /api/delivery/my-deliveries

export const getMyDeliveries = async (req: Request, res: Response) => {
  const { status } = req.query;
  const where: any = { deliveryPartnerId: req.params!.id };

  if (status === "active")
    where.status = { in: ["Assigned", "Packed", "Out for Delivery"] };
  else if (status === "completed")
    where.status = { in: ["Delivered", "Cancelled"] };

  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
};

//get single delivery details

//get /api/delivery/my-deliveries/:id

export const getDeliveryDetail = async (req: Request, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id as string, deliveryPartnerId: req.partner?.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) return res.json(404).json({ message: "Delivery not found" });
  res.json({ order });
};

//completed delivery with OTP

//put /api/delivery/my-deliveries/:id/completed

export const completedDelivery = async (req: Request, res: Response) => {
  const { otp } = req.body;
  const order = await prisma.order.findFirst({
    where: { id: req.params.id as string, deliveryPartnerId: req.partner?.id },
  });
  if (!order || order.status === "Cancelled" || order.status === "Delivered")
    return res.status(400).json({ message: "Invalid Request" });
  if (order.deliveryOtp !== otp) {
    return res.status(500).json({ message: "Invalid OTP" });
  }
  const history = order.statusHistory as any[];
  history.push({
    status: "Delivered",
    note: "Delivered by partner",
    timeStamp: new Date(),
  });
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: "Delivered", statusHistory: history, deliveryOtp: "" },
  });
  res.json({ order: updatedOrder, message: "Delivery completed successfully" });
};

//Cancel delivery

//put /api/delivery/my-deliveries/:id/cancel

export const cancelDelivery = async (req: Request, res: Response) => {
  const { reason } = req.body;
  const order = await prisma.order.findFirst({
    where: { id: req.params.id as string, deliveryPartnerId: req.partner?.id },
  });
  if (order?.status === "Delivered")
    return res.status(400).json({ message: "Cannot cancel a delivered order" });
  const history = order?.statusHistory as any[];
  history.push({
    status: "Cancelled",
    note: reason || "",
    timestamp: new Date(),
  });
  const updatedOrder = await prisma.order.update({
    where: { id: order?.id },
    data: { status: "Cancelled", statusHistory: history },
  });

  res.json({ order: updatedOrder, message: "Delivery cancel" });
};

//update the order status
//put /api/delivery/my-deliveries/:id/status

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const allowedStatuses = ["Packed", "Out for Delivery"];
  if (!allowedStatuses.includes(status))
    return res.json(400).json({
      message: "Invalid status update",
    });
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.id as string,
      deliveryPartnerId: req.partner?.id,
    },
  });

  const history = order?.statusHistory as any[];
  history.push({
    status,
    note: `Status updated to ${status}`,
    timeStamp: new Date(),
  });
  const updatedOrder = await prisma.order.update({
    where: { id: order?.id },
    data: { status, statusHistory: history },
  });
  res.json({ order: updatedOrder });
};

//update live location

//put /api/delivery/my-deliveries/:id/location

export const updateLocation = async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  console.log(req.params?.id, "id");
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.id as string,
      deliveryPartnerId: req.partner?.id,
      status: { in: ["Assigned", "Packed", "Out for Delivery"] },
    },
  });
  console.log(order, "order");
  await prisma.order.update({
    where: {
      id: order?.id,
    },
    data: {
      liveLocation: { lat, lng, updatedAt: new Date() },
    },
  });
  res.json({
    success: true,
  });
};
