export {};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      name: string;
      description: string;
      amount?: number;
      currency?: string;
      order_id?: string;
      subscription_id?: string;
      image?: string;
      prefill?: { email?: string; name?: string; contact?: string };
      theme: { color: string };
      handler: (response: {
        razorpay_order_id?: string;
        razorpay_subscription_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      }) => void;
      modal: {
        ondismiss: () => void;
        confirm_close?: boolean;
        backdropclose?: boolean;
        handleback?: boolean;
        escape?: boolean;
      };
    }) => {
      open: () => void;
      on: (
        event: "payment.failed",
        handler: (response: {
          error?: { description?: string; reason?: string };
        }) => void,
      ) => void;
    };
  }
}
