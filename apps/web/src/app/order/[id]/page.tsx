"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ordersApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId).then((r) => r.data),
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      SHIPPED: "bg-purple-100 text-purple-700",
      DELIVERED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <>
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        <div className="container-main py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          </div>

          {isLoading && (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          )}
          {error && (
            <div className="text-center py-12 text-red-500">
              Failed to load order
            </div>
          )}

          {order && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Order Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Items</h3>
                    <div className="space-y-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {item.productName}
                            </p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            ৳{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-900">
                      {order.shippingAddress?.name}
                    </p>
                    <p>{order.shippingAddress?.address}</p>
                    <p>
                      {order.shippingAddress?.city},{" "}
                      {order.shippingAddress?.postalCode}
                    </p>
                    <p>{order.shippingAddress?.phone}</p>
                    {order.shippingAddress?.email && (
                      <p>{order.shippingAddress.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg p-6 sticky top-4">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Order Summary
                  </h3>
                  <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 text-sm">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>
                        ৳
                        {(
                          order.totalPrice -
                          (order.deliveryCharge || 0) +
                          (order.discount || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Delivery</span>
                      <span>৳{(order.deliveryCharge || 0).toFixed(2)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <span>Discount</span>
                        <span>-৳{order.discount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-primary text-xl">
                        ৳{Number(order?.totalPrice ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Delivery Zone: {order.deliveryZone}
                    </p>
                    {order.notes && (
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                        <p className="font-semibold text-gray-700 mb-1">
                          Notes
                        </p>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/"
                    className="block w-full mt-6 py-2 text-center text-primary font-semibold hover:underline"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
