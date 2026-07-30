import express from "express";
import {
  cancelDelivery,
  completedDelivery,
  getDeliveryDetail,
  getMyDeliveries,
  loginPartner,
  updateDeliveryStatus,
  updateLocation,
} from "../controllers/deliveryPartnerController.js";
import deliveryAuth from "../middleware/deliveryAuth.js";

const deliverPartnerRouter = express.Router();

deliverPartnerRouter.post("/login", loginPartner);
deliverPartnerRouter.get("/my-deliveries", deliveryAuth, getMyDeliveries);
deliverPartnerRouter.put("/my-deliveries/:id", deliveryAuth, completedDelivery);
deliverPartnerRouter.put(
  "/my-deliveries/:id/completed",
  deliveryAuth,
  completedDelivery,
);
deliverPartnerRouter.put(
  "/my-deliveries/:id/cancel",
  deliveryAuth,
  cancelDelivery,
);
deliverPartnerRouter.put(
  "/my-deliveries/:id/status",
  deliveryAuth,
  updateDeliveryStatus,
);
deliverPartnerRouter.put(
  "/my-deliveries/:id/location",
  deliveryAuth,
  updateLocation,
);

export default deliverPartnerRouter;
