import { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../config/prisma.js";
import { inngest } from "../inngest/index.js";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
export const stripeWebHook = async (req: Request, res: Response) => {
  let event;
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature as string,
        endpointSecret,
      );
    } catch (err: any) {
      console.log(`⚠️ Webhook signature verification failed.`, err?.message);
      return res.sendStatus(400);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;

        const session = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });
        const { orderId } = session.data[0].metadata as any;
        //mark payment as paid
        const paidOrder = await prisma.order.update({
          where: { id: orderId },
          data: { isPaid: true },
        });
        const ordersItems = Array.isArray(paidOrder.items)
          ? paidOrder.items
          : ([] as any[]);
        for (const item of ordersItems) {
          await prisma.product.update({
            where: { id: item.product },
            data: { stock: { decrement: item.quantity } },
          });
        }
        //send stock update events for each product in  the order
        for (const item of ordersItems) {
          await inngest.send({
            name: "inventory/stock.updated",
            data: { productId: item.product },
          });
        }

        if (paidOrder) {
          await inngest.send({
            name: "order/placed",
            data: { orderId },
          });
        }

        break;
      case "payment_intent.canceled":
      case "payment_intent.payment_failed": {
        const paymentFailure = event.data.object as Stripe.PaymentIntent;
        const paymentFailureId = paymentFailure.id;

        //getting session metadata

        const sessionFailure = await stripe.checkout.sessions.list({
          payment_intent: paymentFailureId,
        });
        const failureOrderId = (sessionFailure.data[0].metadata as any).orderId;
        await prisma.order.delete({
          where: { id: failureOrderId },
        });
        break;
      }

      // const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);

      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    console.log("in the weebhook");
    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }
};
