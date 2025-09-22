import React, { useState } from 'react';
import { SubscriptionPlan, formatPrice, getFeatureText, UserSubscription } from '../hooks/useSubscriptionPlans';

interface PricingCardProps {
  plan: SubscriptionPlan;
  currentSubscription?: UserSubscription | null;
  onSubscribe: (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') => void;
  isLoading: boolean;
  isPopular?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  currentSubscription,
  onSubscribe,
  isLoading,
  isPopular = false,
}) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const isCurrentPlan = currentSubscription?.planId === plan.id;
  const features = getFeatureText(plan);

  const getCurrentPrice = () => {
    if (billingCycle === 'YEARLY' && plan.yearlyPrice) {
      return formatPrice(plan.yearlyPrice);
    }
    return formatPrice(plan.price);
  };

  const getMonthlyPrice = () => {
    if (billingCycle === 'YEARLY' && plan.yearlyPrice) {
      const yearlyPrice = parseInt(plan.yearlyPrice);
      return formatPrice(Math.floor(yearlyPrice / 12));
    }
    return formatPrice(plan.price);
  };

  const getSavingsText = () => {
    if (plan.yearlyPrice && billingCycle === 'YEARLY') {
      const monthlyTotal = parseInt(plan.price) * 12;
      const yearlyPrice = parseInt(plan.yearlyPrice);
      const savings = monthlyTotal - yearlyPrice;
      if (savings > 0) {
        return `Tiết kiệm ${formatPrice(savings)}/năm`;
      }
    }
    return null;
  };

  const getButtonText = () => {
    if (isCurrentPlan) {
      return 'Gói hiện tại';
    }
    if (plan.name === 'Free') {
      return 'Sử dụng miễn phí';
    }
    return 'Chọn gói này';
  };

  const getButtonClass = () => {
    if (isCurrentPlan) {
      return 'w-full px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed';
    }
    if (isPopular) {
      return 'w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5';
    }
    return 'w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200';
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-lg p-6 ${isPopular ? 'ring-2 ring-blue-500 transform scale-105' : ''} hover:shadow-xl transition-all duration-300`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Phổ biến nhất
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Đang sử dụng
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-blue-600' : 'text-gray-900'}`}>
          {plan.name}
        </h3>
        
        {/* Price Toggle */}
        {plan.yearlyPrice && plan.yearlyPrice !== '0' && (
          <div className="mb-4">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`billing-${plan.id}`}
                  value="MONTHLY"
                  checked={billingCycle === 'MONTHLY'}
                  onChange={() => setBillingCycle('MONTHLY')}
                  className="sr-only"
                />
                <span className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'MONTHLY' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                  Hàng tháng
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`billing-${plan.id}`}
                  value="YEARLY"
                  checked={billingCycle === 'YEARLY'}
                  onChange={() => setBillingCycle('YEARLY')}
                  className="sr-only"
                />
                <span className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'YEARLY' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                  Hàng năm
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Price Display */}
        <div className="mb-2">
          <span className={`text-4xl font-bold ${isPopular ? 'text-blue-600' : 'text-gray-900'}`}>
            {getMonthlyPrice()}
          </span>
          {billingCycle === 'MONTHLY' && plan.price !== '0' && (
            <span className="text-gray-600">/tháng</span>
          )}
          {billingCycle === 'YEARLY' && plan.yearlyPrice && plan.yearlyPrice !== '0' && (
            <span className="text-gray-600">/tháng</span>
          )}
        </div>

        {billingCycle === 'YEARLY' && (
          <div className="text-sm text-gray-600 mb-2">
            Thanh toán: {getCurrentPrice()}/năm
          </div>
        )}

        {getSavingsText() && (
          <div className="text-sm text-green-600 font-semibold">
            {getSavingsText()}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="mb-8">
        <h4 className="font-semibold text-gray-900 mb-4 text-center">Tính năng bao gồm:</h4>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className={`w-5 h-5 ${isPopular ? 'text-blue-600' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrentPlan && onSubscribe(plan.id, billingCycle)}
        disabled={isCurrentPlan || isLoading}
        className={getButtonClass()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý...
          </div>
        ) : (
          getButtonText()
        )}
      </button>

      {/* Additional info for current subscription */}
      {isCurrentPlan && currentSubscription && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div>Trạng thái: <span className="font-semibold text-green-600">
              {currentSubscription.status === 'ACTIVE' ? 'Đang hoạt động' : currentSubscription.status}
            </span></div>
            {currentSubscription.nextBillingDate && (
              <div>Gia hạn tiếp: <span className="font-semibold">
                {new Date(currentSubscription.nextBillingDate).toLocaleDateString('vi-VN')}
              </span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
