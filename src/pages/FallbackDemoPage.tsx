import React, { useState, useEffect } from 'react';
import { apiClientWithFallback } from '../lib/api-client-with-fallback';
import { useEnhancedSubscriptionPlans, useEnhancedUserSubscription } from '../hooks/useEnhancedSubscription';
import { BackendStatusIndicator } from '../components/ui/BackendStatusIndicator';
import { WebSocketTest } from '../components/WebSocketTest';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function FallbackDemoPage() {
  const [backendStatus, setBackendStatus] = useState<{
    isOnline: boolean;
    lastCheck: Date;
  }>({ isOnline: true, lastCheck: new Date() });
  
  const [apiTestResults, setApiTestResults] = useState<{
    [key: string]: {
      success: boolean;
      data?: any;
      error?: string;
      usingMock: boolean;
    };
  }>({});

  const { data: plans, isLoading: plansLoading } = useEnhancedSubscriptionPlans();
  const { data: userSubscription, isLoading: userLoading } = useEnhancedUserSubscription();

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const isOnline = await apiClientWithFallback.isBackendOnline();
      const status = apiClientWithFallback.getBackendStatus();
      setBackendStatus(status);
    } catch (error) {
      setBackendStatus({
        isOnline: false,
        lastCheck: new Date(),
      });
    }
  };

  const testApiEndpoint = async (endpoint: string, method: () => Promise<any>) => {
    try {
      console.log(`🔄 Testing ${endpoint}...`);
      const result = await method();
      
      const usingMock = result?.message?.includes('(mock)') || false;
      
      setApiTestResults(prev => ({
        ...prev,
        [endpoint]: {
          success: true,
          data: result,
          usingMock,
        },
      }));
      
      console.log(`✅ ${endpoint} success:`, result);
    } catch (error: any) {
      console.error(`❌ ${endpoint} error:`, error);
      
      setApiTestResults(prev => ({
        ...prev,
        [endpoint]: {
          success: false,
          error: error?.message || 'Unknown error',
          usingMock: false,
        },
      }));
    }
  };

  const testAllEndpoints = async () => {
    setApiTestResults({});
    
    const tests = [
      {
        name: 'Subscription Plans',
        method: () => apiClientWithFallback.getSubscriptionPlans(),
      },
      {
        name: 'User Subscription',
        method: () => apiClientWithFallback.getUserSubscription(),
      },
      {
        name: 'User Profile',
        method: () => apiClientWithFallback.getProfile(),
      },
      {
        name: 'Dashboard Overview',
        method: () => apiClientWithFallback.getAdminDashboardOverview(),
      },
      {
        name: 'System Health',
        method: () => apiClientWithFallback.getSystemHealth(),
      },
    ];

    for (const test of tests) {
      await testApiEndpoint(test.name, test.method);
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (result: any) => {
    if (result?.success) {
      return result.usingMock 
        ? <AlertTriangle className="w-5 h-5 text-orange-500" />
        : <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (result: any) => {
    if (result?.success) {
      return result.usingMock 
        ? <Badge variant="secondary" className="bg-orange-100 text-orange-800">Mock Data</Badge>
        : <Badge variant="secondary" className="bg-green-100 text-green-800">Live API</Badge>;
    }
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔄 Fallback API System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
            Hệ thống API với khả năng tự động chuyển đổi sang dữ liệu mock khi backend không khả dụng. 
            Đảm bảo frontend luôn hoạt động mượt mà trong quá trình phát triển.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Cách hoạt động:</span>
            </div>
            <ul className="text-sm text-blue-800 text-left list-disc list-inside space-y-1">
              <li>Luôn thử gọi API thật trước</li>
              <li>Nếu backend khả dụng → trả dữ liệu thật</li>
              <li>Nếu backend không khả dụng → tự động chuyển sang dữ liệu mock</li>
              <li>React Query cache được tối ưu cho cả hai trường hợp</li>
              <li>Người dùng không bao giờ thấy trang trắng hoặc lỗi</li>
            </ul>
          </div>
        </div>

        {/* Backend Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BackendStatusIndicator />
                Backend Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trạng thái:</span>
                  <Badge variant={backendStatus.isOnline ? "default" : "secondary"}>
                    {backendStatus.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Kiểm tra lần cuối:</span>
                  <span className="text-sm font-mono">
                    {backendStatus.lastCheck.toLocaleTimeString()}
                  </span>
                </div>
                <Button 
                  onClick={checkBackendStatus} 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-3"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>React Query Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Subscription Plans:</div>
                  <div className="text-lg font-semibold">
                    {plansLoading ? '⏳ Loading...' : `${plans?.length || 0} plans`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">User Subscription:</div>
                  <div className="text-lg font-semibold">
                    {userLoading ? '⏳ Loading...' : userSubscription ? '✅ Active' : '❌ None'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testAllEndpoints} 
                size="sm" 
                className="w-full"
                disabled={Object.keys(apiTestResults).length > 0 && Object.values(apiTestResults).some(r => !r.success && !r.error)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test All Endpoints
              </Button>
              <div className="mt-3 text-sm text-gray-600 text-center">
                Kiểm tra tất cả API endpoints để xem fallback hoạt động
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Test Results */}
        {Object.keys(apiTestResults).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>🧪 API Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiTestResults).map(([endpoint, result]) => (
                  <div key={endpoint} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result)}
                        <span className="font-semibold">{endpoint}</span>
                      </div>
                      {getStatusBadge(result)}
                    </div>
                    
                    {result.success ? (
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600 mb-1">Response:</div>
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-red-50 rounded p-3">
                        <div className="text-sm text-red-600 mb-1">Error:</div>
                        <div className="text-sm text-red-800">{result.error}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Data Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📋 Current Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <div>Loading plans...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans?.map(plan => (
                    <div key={plan.id} className="border rounded p-3">
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-sm text-gray-600">{plan.price}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {plan.features.maxRecipeGenerations} recipes/month
                      </div>
                    </div>
                  )) || <div className="text-gray-500 text-center py-4">No plans available</div>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👤 Current User Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {userLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <div>Loading subscription...</div>
                </div>
              ) : userSubscription ? (
                <div className="space-y-2">
                  <div><strong>Plan:</strong> {userSubscription.plan.name}</div>
                  <div><strong>Status:</strong> {userSubscription.status}</div>
                  <div><strong>Billing:</strong> {userSubscription.billingCycle}</div>
                  <div><strong>Recipes Left:</strong> {userSubscription.usageQuota.recipeGenerationsLeft}</div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  No active subscription
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* WebSocket Test Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🔌 WebSocket Real-time Features</CardTitle>
          </CardHeader>
          <CardContent>
            <WebSocketTest />
          </CardContent>
        </Card>

        {/* Implementation Notes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>💡 Implementation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">✅ Fallback API Benefits:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Frontend luôn hoạt động, kể cả khi backend chết</li>
                  <li>• Không cần thay đổi code component</li>
                  <li>• React Query cache tối ưu cho cả hai trường hợp</li>
                  <li>• Tự động detect và switch giữa real/mock data</li>
                  <li>• Development experience mượt mà</li>
                  <li>• Easy testing với dữ liệu mock nhất quán</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚙️ Technical Features:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Automatic health checking mỗi 30s</li>
                  <li>• Intelligent retry logic</li>
                  <li>• Network error detection</li>
                  <li>• Mock data với realistic structure</li>
                  <li>• Toast notifications cho user feedback</li>
                  <li>• Backend status indicator</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔌 Port Architecture:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Port 3000:</strong> Frontend (Vite dev server)</li>
                  <li>• <strong>Port 3001:</strong> Backend API (REST endpoints)</li>
                  <li>• <strong>Port 3003:</strong> WebSocket Server (real-time)</li>
                  <li>• Tách biệt các service để tránh conflict</li>
                  <li>• WebSocket optional - app vẫn chạy khi tắt</li>
                  <li>• Independent scaling và deployment</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
