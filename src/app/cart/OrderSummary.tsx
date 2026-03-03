"use client";

import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface OrderSummaryProps {
  subtotal: number;
  originalTotal: number;
  savings: number;
  itemCount: number;
}

export default function OrderSummary({ subtotal, originalTotal, savings, itemCount }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sticky top-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
      
      {/* Summary Details */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">{formatCurrency(originalTotal)}</span>
        </div>
        
        {savings > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Promotions</span>
            <span className="text-red-600 font-medium">-{formatCurrency(savings)}</span>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between items-baseline">
            <span className="text-gray-900 font-semibold">Cart Total</span>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900">{formatCurrency(subtotal)}</span>
              <p className="text-xs text-gray-500">({itemCount} item{itemCount !== 1 ? 's' : ''})</p>
            </div>
          </div>
        </div>
        
        {/* Rewards */}
        <div className="text-xs text-gray-500 text-right">
          Rewards: Earn ${(subtotal * 0.01).toFixed(2)}
        </div>
      </div>
      
      {/* Checkout Buttons */}
      <div className="mt-5 space-y-3">
        <Link
          href="/checkout"
          className="block w-full bg-red-600 text-white text-center py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          CHECKOUT
        </Link>
        
        <button
          type="button"
          className="w-full bg-yellow-400 text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
        >
          Checkout with <span className="font-bold text-blue-800">PayPal</span>
        </button>
      </div>
      
      {/* Coupon Note */}
      <p className="text-xs text-gray-500 text-center mt-4">
        Coupons/Rewards can be used in the next step
      </p>
      
      {/* Payment Methods */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">We accept</h3>
        <div className="grid grid-cols-5 gap-2">
          {/* PayPal */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-xs font-bold text-blue-800">PayPal</span>
          </div>
          {/* Visa */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-xs font-bold text-blue-900">VISA</span>
          </div>
          {/* Mastercard */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <div className="flex -space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            </div>
          </div>
          {/* Discover */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-[8px] font-bold text-orange-600">DISCOVER</span>
          </div>
          {/* CB */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-xs font-bold text-green-700">CB</span>
          </div>
          {/* Amex */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-[8px] font-bold text-blue-600">AMEX</span>
          </div>
          {/* Diners */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-[8px] font-bold text-blue-900">Diners</span>
          </div>
          {/* JCB */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-xs font-bold text-red-600">JCB</span>
          </div>
          {/* Apple Pay */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-[8px] font-bold text-gray-900">Apple Pay</span>
          </div>
          {/* Google Pay */}
          <div className="flex items-center justify-center h-8 bg-gray-50 rounded border border-gray-200">
            <span className="text-[8px] font-bold text-gray-700">G Pay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
