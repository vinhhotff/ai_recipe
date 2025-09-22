import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEnhancedSubscriptionPlans, useEnhancedUserSubscription, useEnhancedSubscribeToPlan } from '../hooks/useEnhancedSubscription';
import { PricingCard } from '../components/PricingCard';
import { BackendStatusIndicator } from '../components/ui/BackendStatusIndicator';

export default function SubscriptionPlansPage() {
  const { user } = useAuth();
  const { data: plans, isLoading: plansLoading, error: plansError } = useEnhancedSubscriptionPlans();
  const { data: userSubscription, isLoading: subscriptionLoading } = useEnhancedUserSubscription();
  const subscribeMutation = useEnhancedSubscribeToPlan();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{planId: string, billingCycle: 'MONTHLY' | 'YEARLY'} | null>(null);

  const handleSubscribe = async (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') => {
    if (!user) {
      alert('Vui lòng đăng nhập để đăng ký gói dịch vụ');
      return;
    }

    // For Free plan, directly call the API
    if (plans?.find(p => p.id === planId)?.name === 'Free') {
      try {
        await subscribeMutation.mutateAsync({ planId, billingCycle });
        alert('Đã chuyển sang gói miễn phí thành công!');
      } catch (error) {
        console.error('Error switching to free plan:', error);
        alert('Có lỗi xảy ra khi chuyển gói. Vui lòng thử lại.');
      }
      return;
    }

    // For paid plans, show payment modal
    setSelectedPlan({ planId, billingCycle });
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPlan) return;

    try {
      await subscribeMutation.mutateAsync(selectedPlan);
      setShowPaymentModal(false);
      setSelectedPlan(null);
      alert('Đăng ký gói dịch vụ thành công! Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ.');
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      alert('Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.');
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-2">
                      {[...Array(6)].map((_, j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Có lỗi xảy ra</h2>
              <p className="text-red-600">Không thể tải thông tin gói dịch vụ. Vui lòng thử lại sau.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Backend Status Banner */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackendStatusIndicator showLabel={true} />
              <span className="text-sm text-gray-600">Trạng thái kết nối backend</span>
            </div>
            <div className="text-xs text-gray-500">
              {plansError ? 'Có lỗi khi tải dữ liệu' : `${plans?.length || 0} gói dịch vụ có sẵn`}
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chọn Gói Dịch Vụ Phù Hợp
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Nâng cao trải nghiệm tạo recipe với các tính năng cao cấp và không giới hạn. 
            Bắt đầu miễn phí và nâng cấp bất cứ lúc nào.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans?.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentSubscription={userSubscription}
              onSubscribe={handleSubscribe}
              isLoading={subscribeMutation.isPending}
              isPopular={plan.name === 'Pro'}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              So Sánh Chi Tiết Các Gói
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Tính năng</th>
                    {plans?.map(plan => (
                      <th key={plan.id} className="text-center py-4 px-6 font-semibold text-gray-900">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Tạo Recipe/tháng</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.maxRecipeGenerations === -1 
                          ? '∞' 
                          : plan.features.maxRecipeGenerations
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Tạo Video/tháng</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.maxVideoGenerations === -1 
                          ? '∞' 
                          : plan.features.maxVideoGenerations
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Bài đăng cộng đồng/tháng</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.maxCommunityPosts === -1 
                          ? '∞' 
                          : plan.features.maxCommunityPosts
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Template Premium</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.premiumTemplates ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Gợi ý AI thông minh</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.aiSuggestions ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Hỗ trợ ưu tiên</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.prioritySupport ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-gray-900">Xuất PDF</td>
                    {plans?.map(plan => (
                      <td key={plan.id} className="text-center py-4 px-6">
                        {plan.features.exportToPdf ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Câu Hỏi Thường Gặp
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Tôi có thể hủy đăng ký bất cứ lúc nào không?
              </h3>
              <p className="text-gray-600">
                Có, bạn có thể hủy đăng ký bất cứ lúc nào. Bạn sẽ vẫn có thể sử dụng các tính năng premium cho đến hết chu kỳ thanh toán hiện tại.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Tôi có thể nâng cấp hoặc hạ cấp gói không?
              </h3>
              <p className="text-gray-600">
                Có, bạn có thể thay đổi gói bất cứ lúc nào. Khi nâng cấp, bạn sẽ được tính phí theo tỷ lệ. Khi hạ cấp, thay đổi sẽ có hiệu lực từ chu kỳ thanh toán tiếp theo.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Có hỗ trợ thanh toán nào khác không?
              </h3>
              <p className="text-gray-600">
                Hiện tại chúng tôi hỗ trợ thanh toán qua thẻ tín dụng/ghi nợ, MoMo, và ZaloPay. Chúng tôi sẽ bổ sung thêm các phương thức thanh toán khác trong tương lai.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Dữ liệu của tôi có được bảo mật không?
              </h3>
              <p className="text-gray-600">
                Chúng tôi cam kết bảo mật tuyệt đối thông tin của bạn. Tất cả dữ liệu được mã hóa và chúng tôi tuân thủ các tiêu chuẩn bảo mật quốc tế.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Xác Nhận Đăng Ký
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn đăng ký gói{' '}
              <strong>{plans?.find(p => p.id === selectedPlan.planId)?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              * Đây là chức năng demo. Trong thực tế sẽ tích hợp với cổng thanh toán thực.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handlePaymentConfirm}
                disabled={subscribeMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {subscribeMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
